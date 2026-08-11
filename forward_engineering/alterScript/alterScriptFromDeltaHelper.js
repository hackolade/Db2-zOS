/**
 * @import {
 *   AlterRelationship,
 *   AlterScriptData,
 *   AlterScriptDto,
 *   DeltaBucket,
 *   DeltaModel,
 *   DeltaSection
 * } from '../types/alterScript'
 * @import {App} from '../types/ddlProvider'
 */

const { getContainersScripts } = require('./alterScriptHelpers/alterContainerHelper');
const { getEntitiesScripts } = require('./alterScriptHelpers/alterEntityHelper');
const {
	getDeleteForeignKeyScriptDtos,
	getAddForeignKeyScriptDtos,
	getModifyForeignKeyScriptDtos,
} = require('./alterScriptHelpers/alterForeignKeyHelper');
const { getViewsScripts } = require('./alterScriptHelpers/alterViewHelper');

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
 * Build the container statements. Schemas can only be dropped once every table they hold is gone, so the deleted
 * containers are reported separately and applied last.
 *
 * @param {{ collection: DeltaModel; app: App }} params Delta model and app instance.
 * @returns {{ deletedContainersScriptDtos: AlterScriptDto[]; upsertedContainersScriptDtos: AlterScriptDto[] }}
 *   Container alter script DTOs.
 */
const getAlterContainersScriptDtos = ({ collection, app }) => {
	const { added, deleted, modified } = getSectionItems(collection.properties?.containers);
	const { getAddContainerScriptDto, getDeleteContainerScriptDto, getModifyContainerScriptDto } =
		getContainersScripts(app);

	return {
		deletedContainersScriptDtos: deleted
			.map(container => getDeleteContainerScriptDto(container))
			.filter(scriptDto => scriptDto !== undefined),
		upsertedContainersScriptDtos: [
			...added.map(container => getAddContainerScriptDto(container)),
			...modified.flatMap(container => getModifyContainerScriptDto(container)),
		].filter(scriptDto => scriptDto !== undefined),
	};
};

/**
 * Build the table and column statements.
 *
 * @param {{ collection: DeltaModel; app: App; inlineDeltaRelationships: AlterRelationship[] }} params Delta model, app
 *   instance and relationships rendered inline in table definitions.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getAlterCollectionScriptDtos = ({ collection, app, inlineDeltaRelationships }) => {
	const { added, deleted, modified } = getSectionItems(collection.properties?.entities);
	const {
		getAddCollectionScriptDto,
		getDeleteCollectionScriptDto,
		getModifyCollectionScriptDtos,
		getModifyCollectionKeysScriptDtos,
		getModifyColumnScriptDtos,
		getAddColumnScriptDtos,
		getDeleteColumnScriptDtos,
	} = getEntitiesScripts(app, inlineDeltaRelationships);

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

	const { deletedContainersScriptDtos, upsertedContainersScriptDtos } = getAlterContainersScriptDtos({
		collection,
		app,
	});

	return [
		...upsertedContainersScriptDtos,
		...getAlterCollectionScriptDtos({ collection, app, inlineDeltaRelationships }),
		...getAlterRelationshipsScriptDtos({ collection, ignoreRelationshipIDs }),
		...getAlterViewScriptDtos({ collection, app }),
		...deletedContainersScriptDtos,
	]
		.map(dto => prettifyAlterScriptDto(dto))
		.filter(dto => dto !== undefined);
};

module.exports = {
	getAlterScriptDtos,
};
