/**
 * @import {
 *   AlterRelationship,
 *   AlterScriptData,
 *   AlterScriptDto,
 *   AlterTable,
 *   DeltaBucket,
 *   DeltaModel,
 *   DeltaSection
 * } from '../types/alterScript'
 * @import {App} from '../types/ddlProvider'
 */

const { getContainersScripts } = require('./alterScriptHelpers/alterContainerHelper');
const { getModelDefinitionsScripts } = require('./alterScriptHelpers/alterModelDefinitionHelper');
const { getEntitiesScripts } = require('./alterScriptHelpers/alterEntityHelper');
const {
	getDeleteForeignKeyScriptDtos,
	getAddForeignKeyScriptDtos,
	getModifyForeignKeyScriptDtos,
} = require('./alterScriptHelpers/alterForeignKeyHelper');
const { getViewsScripts } = require('./alterScriptHelpers/alterViewHelper');
const { getAddVersioningScriptDto, getEnableArchiveScriptDto } = require('./alterScriptHelpers/alterVersioningHelper');
const { getSchemaOfAlterCollection, getSchemaNameFromCollection } = require('../utils/general');

/**
 * Read the objects of one side of a delta section. The studio serializes a single object as-is and several objects as
 * an array, so both shapes have to be handled.
 *
 * @template T
 * @param {DeltaBucket<T> | undefined} bucket Delta bucket.
 * @returns {T[]} Objects of the bucket.
 */
const getItems = bucket => {
	return [bucket?.items]
		.flat()
		.filter(item => item !== undefined)
		.flatMap(item => Object.values(item.properties));
};

/**
 * Read the added, deleted and modified objects of a delta section.
 *
 * @template T
 * @param {DeltaSection<T> | undefined} section Delta section.
 * @returns {{ added: T[]; deleted: T[]; modified: T[] }} Objects of the section.
 */
const getSectionItems = section => ({
	added: getItems(section?.properties?.added),
	deleted: getItems(section?.properties?.deleted),
	modified: getItems(section?.properties?.modified),
});

/**
 * Build SET SCHEMA statements for added containers. Deleted and modified schemas do not produce schema-level DDL in Db2
 * for z/OS.
 *
 * @param {{ collection: DeltaModel; app: App }} params Delta model and app instance.
 * @returns {AlterScriptDto[]} Container alter script DTOs.
 */
const getAlterContainersScriptDtos = ({ collection, app }) => {
	const { added } = getSectionItems(collection.properties?.containers);
	const { getAddContainerScriptDto } = getContainersScripts(app);

	return added.map(container => getAddContainerScriptDto(container)).filter(scriptDto => scriptDto !== undefined);
};

/**
 * Build the distinct type statements. Types are created before tables and reported separately when deleted so their
 * drop statements can run after every dependent table and view has been removed.
 *
 * @param {{ collection: DeltaModel; app: App }} params Delta model and app instance.
 * @returns {{ deletedTypesScriptDtos: AlterScriptDto[]; upsertedTypesScriptDtos: AlterScriptDto[] }} Type alter script
 *   DTOs.
 */
const getAlterTypesScriptDtos = ({ collection, app }) => {
	const { added, deleted, modified } = getSectionItems(collection.properties?.modelDefinitions);
	const { getAddTypeScriptDto, getDeleteTypeScriptDto, getModifyTypeScriptDtos } = getModelDefinitionsScripts(app);

	return {
		deletedTypesScriptDtos: deleted
			.map(definition => getDeleteTypeScriptDto(definition))
			.filter(scriptDto => scriptDto !== undefined),
		upsertedTypesScriptDtos: [
			...added.map(definition => getAddTypeScriptDto(definition)),
			...modified.flatMap(definition => getModifyTypeScriptDtos(definition)),
		].filter(scriptDto => scriptDto !== undefined),
	};
};

/**
 * Build a GUID-to-schema lookup table of every entity in the current model/container batch, so a single entity's script
 * builder can resolve cross-entity references (e.g. auxiliary base table, LIKE table, history table) that are plain
 * GUID-valued fields rather than Studio-resolved ERD relationships.
 *
 * @param {{ added: AlterTable[]; deleted: AlterTable[]; modified: AlterTable[] }} params Entities of the delta section.
 * @returns {Record<string, AlterTable>} Entities keyed by GUID.
 */
const buildRelatedSchemas = ({ added, deleted, modified }) => {
	/** @type {Record<string, AlterTable>} */
	const relatedSchemas = {};

	[...added, ...deleted, ...modified].forEach(item => {
		const schema = getSchemaOfAlterCollection(item);
		if (schema.id) {
			// Merging role onto the delta item (above) overwrites its own compMod, losing keyspaceName, so the schema
			// name is resolved from the unmerged item and reattached as bucketName for cross-entity consumers.
			relatedSchemas[schema.id] = { ...schema, bucketName: getSchemaNameFromCollection({ collection: item }) };
		}
	});

	return relatedSchemas;
};

/**
 * Build the table and column statements.
 *
 * @param {{
 * 	collection: DeltaModel;
 * 	app: App;
 * 	inlineDeltaRelationships: AlterRelationship[];
 * 	relatedSchemas: Record<string, AlterTable>;
 * }} params
 *   Delta model, app instance, relationships rendered inline in table definitions and sibling entities keyed by GUID.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getAlterCollectionScriptDtos = ({ collection, app, inlineDeltaRelationships, relatedSchemas }) => {
	const { added, deleted, modified } = getSectionItems(collection.properties?.entities);
	const {
		getAddCollectionScriptDto,
		getDeleteCollectionScriptDto,
		getModifyCollectionScriptDtos,
		getModifyCollectionKeysScriptDtos,
		getModifyColumnScriptDtos,
		getAddColumnScriptDtos,
		getDeleteColumnScriptDtos,
	} = getEntitiesScripts(app, inlineDeltaRelationships, relatedSchemas);

	return [
		...deleted
			.filter(item => item.role?.compMod?.deleted)
			.map(item => getDeleteCollectionScriptDto(item))
			.filter(scriptDto => scriptDto !== undefined),
		...added
			.filter(item => item.role?.compMod?.created)
			.map(item => getAddCollectionScriptDto(item))
			.filter(scriptDto => scriptDto !== undefined),
		...deleted.filter(item => !item.role?.compMod?.deleted).flatMap(item => getDeleteColumnScriptDtos(item)),
		...modified.flatMap(item => getModifyCollectionScriptDtos(item)),
		// Columns of a created table are already part of its CREATE TABLE, so only existing tables get ADD COLUMN.
		...added.filter(item => !item.role?.compMod?.created).flatMap(item => getAddColumnScriptDtos(item)),
		...modified.flatMap(item => getModifyColumnScriptDtos(item)),
		...modified.flatMap(item => getModifyCollectionKeysScriptDtos(item)),
	];
};

/**
 * Build the ALTER TABLE ... ADD VERSIONING and ALTER TABLE ... ENABLE ARCHIVE statements linking a table to its history
 * table or archive table, for every added or modified entity. Runs after all entities in the batch are created, so the
 * referenced tables already exist by the time it runs.
 *
 * @param {{ collection: DeltaModel; relatedSchemas: Record<string, AlterTable> }} params Delta model and sibling
 *   entities keyed by GUID.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getAlterVersioningScriptDtos = ({ collection, relatedSchemas }) => {
	const { added, modified } = getSectionItems(collection.properties?.entities);
	const entities = [...added, ...modified];
	const addVersioningScriptDto = getAddVersioningScriptDto(relatedSchemas);
	const enableArchiveScriptDto = getEnableArchiveScriptDto(relatedSchemas);

	return [
		...entities.map(item => addVersioningScriptDto(item)),
		...entities.map(item => enableArchiveScriptDto(item)),
	].filter(dto => dto !== undefined);
};

/**
 * Build the view statements.
 *
 * @param {{ collection: DeltaModel; app: App }} params Delta model and app instance.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getAlterViewScriptDtos = ({ collection, app }) => {
	const { added, deleted, modified } = getSectionItems(collection.properties?.views);
	const { getAddViewScriptDto, getDeleteViewScriptDto, getModifyViewScriptDtos } = getViewsScripts(app);

	return [
		...deleted
			.filter(view => view.role?.compMod?.deleted)
			.map(view => getDeleteViewScriptDto(view))
			.filter(scriptDto => scriptDto !== undefined),
		...added
			.filter(view => view.role?.compMod?.created)
			.map(view => getAddViewScriptDto(view))
			.filter(scriptDto => scriptDto !== undefined),
		...modified.flatMap(view => getModifyViewScriptDtos(view)),
	];
};

/**
 * Build the foreign key statements, skipping the relationships already rendered inline in a CREATE TABLE.
 *
 * @param {{ collection: DeltaModel; ignoreRelationshipIDs: string[] }} params Delta model and relationships to skip.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getAlterRelationshipsScriptDtos = ({ collection, ignoreRelationshipIDs }) => {
	const { added, deleted, modified } = getSectionItems(collection.properties?.relationships);
	const ignoredIds = new Set(ignoreRelationshipIDs);

	return [
		...getDeleteForeignKeyScriptDtos(
			deleted.filter(
				relationship => relationship.role.compMod?.deleted && !ignoredIds.has(relationship.role.id ?? ''),
			),
		),
		...getAddForeignKeyScriptDtos(
			added.filter(
				relationship => relationship.role.compMod?.created && !ignoredIds.has(relationship.role.id ?? ''),
			),
		),
		...getModifyForeignKeyScriptDtos(
			modified.filter(
				relationship => relationship.role.compMod?.modified && !ignoredIds.has(relationship.role.id ?? ''),
			),
		),
	];
};

/**
 * Collect the relationships that belong to newly created tables and therefore end up inside their CREATE TABLE
 * statement instead of a separate ALTER TABLE.
 *
 * @param {{ collection: DeltaModel; options?: AlterScriptData['options'] }} params Delta model and script options.
 * @returns {AlterRelationship[]} Inline relationships.
 */
const getInlineRelationships = ({ collection, options }) => {
	if (options?.scriptGenerationOptions?.feActiveOptions?.foreignKeys !== 'inline') {
		return [];
	}

	const addedCollectionIDs = new Set(
		getItems(collection.properties?.entities?.properties?.added)
			.filter(item => item.role?.compMod?.created)
			.map(item => item.role?.id),
	);

	return getItems(collection.properties?.relationships?.properties?.added).filter(
		relationship => relationship.role.compMod?.created && addedCollectionIDs.has(relationship.role.childCollection),
	);
};

/**
 * Drop the empty statements of a DTO, and the DTO itself when nothing is left.
 *
 * @param {AlterScriptDto} dto Alter script DTO.
 * @returns {AlterScriptDto | undefined} Alter script DTO.
 */
const prettifyAlterScriptDto = dto => {
	const nonEmptyScripts = dto.scripts
		.map(scriptDto => ({ isDropScript: scriptDto.isDropScript, script: scriptDto.script.trim() }))
		.filter(scriptDto => Boolean(scriptDto.script));

	if (nonEmptyScripts.length === 0) {
		return void 0;
	}

	return { isActivated: dto.isActivated, scripts: nonEmptyScripts };
};

/**
 * Parse the delta model the studio serializes into the FE data. This is the single point where the untyped payload
 * enters the plugin, so the assertion is kept here instead of letting `any` spread through the helpers.
 *
 * @param {string} json Serialized delta model.
 * @returns {DeltaModel} Delta model.
 */
const parseDeltaModel = json =>
	// The studio owns the payload shape and there is nothing to validate it against, so the assertion is unchecked.
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion
	/** @type {DeltaModel} */ (JSON.parse(json));

/**
 * Build every alter script DTO of a delta model.
 *
 * @param {AlterScriptData} data FE data.
 * @param {App} app App instance.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getAlterScriptDtos = (data, app) => {
	const collection = parseDeltaModel(data.jsonSchema);

	if (!collection) {
		throw new Error(
			'"comparisonModelCollection" is not found. Alter script can be generated only from Delta model',
		);
	}

	const inlineDeltaRelationships = getInlineRelationships({ collection, options: data.options });
	const ignoreRelationshipIDs = inlineDeltaRelationships
		.map(relationship => relationship.role?.id)
		.filter(id => id !== undefined);
	const relatedSchemas = buildRelatedSchemas(getSectionItems(collection.properties?.entities));

	const containerScriptDtos = getAlterContainersScriptDtos({
		collection,
		app,
	});
	const { deletedTypesScriptDtos, upsertedTypesScriptDtos } = getAlterTypesScriptDtos({ collection, app });

	return [
		...containerScriptDtos,
		...upsertedTypesScriptDtos,
		...getAlterCollectionScriptDtos({ collection, app, inlineDeltaRelationships, relatedSchemas }),
		...getAlterVersioningScriptDtos({ collection, relatedSchemas }),
		...getAlterRelationshipsScriptDtos({ collection, ignoreRelationshipIDs }),
		...getAlterViewScriptDtos({ collection, app }),
		...deletedTypesScriptDtos,
	]
		.map(dto => prettifyAlterScriptDto(dto))
		.filter(dto => dto !== undefined);
};

module.exports = {
	getAlterScriptDtos,
};
