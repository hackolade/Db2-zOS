/**
 * @import {
 *   AlterCollection,
 *   AlterRelationship,
 *   AlterScriptDto
 * } from '../../types/alterScript'
 * @import {
 *   App,
 *   DdlProvider,
 *   ForeignKeyStatement
 * } from '../../types/ddlProvider'
 */

const toPairs = require('lodash/toPairs');
const { createAlterScriptDto } = require('../dto/alterScriptDto');
const { getModifiedCommentOnColumnScriptDtos } = require('./columnHelpers/commentsHelper');
const { getModifyNonNullColumnsScriptDtos } = require('./columnHelpers/nonNullConstraintHelper');
const { getUpdateTypesScriptDtos } = require('./columnHelpers/alterTypeHelper');
const { getModifyCheckConstraintScriptDtos } = require('./entityHelpers/checkConstraintHelper');
const { getRenameColumnScriptDtos } = require('./columnHelpers/alterColumnNameHelper');
const { getModifyEntityCommentsScriptDtos } = require('./entityHelpers/commentsHelper');
const { getModifyPkConstraintsScriptDtos } = require('./entityHelpers/primaryKeyHelper');
const { getModifyUkConstraintsScriptDtos } = require('./entityHelpers/uniqueKeyHelper');
const { getModifyIndexesScriptDtos } = require('./entityHelpers/indexesHelper');
const { getModifiedDefaultColumnValueScriptDtos } = require('./columnHelpers/defaultValueHelper');
const {
	getEntityName,
	getSchemaNameFromCollection,
	getSchemaOfAlterCollection,
	getFullCollectionName,
	wrapInQuotes,
} = require('../../utils/general');
const { getRelationshipName } = require('./alterForeignKeyHelper');
const { createColumnDefinitionBySchema } = require('./createColumnDefinition');
const { getRenameTableScriptDtos } = require('./entityHelpers/alterTableNameHelper');

/**
 * Build the inline foreign key constraints of a newly added table.
 *
 * @param {{
 * 	collection: AlterCollection;
 * 	inlineDeltaRelationships: AlterRelationship[];
 * 	ddlProvider: DdlProvider;
 * 	schemaName: string;
 * }} params
 *   Collection delta, its inline relationships, the DDL provider and the schema name.
 * @returns {ForeignKeyStatement[]} Foreign key constraints.
 */
const getInlineForeignKeyConstraints = ({ collection, inlineDeltaRelationships, ddlProvider, schemaName }) => {
	return inlineDeltaRelationships
		.filter(relationship => relationship.role.childCollection === collection.role?.id)
		.map(relationship => {
			const compMod = relationship.role.compMod ?? {};

			return ddlProvider.createForeignKeyConstraint(
				{
					name: getRelationshipName(relationship),
					foreignKey: compMod.child?.collection?.fkFields ?? [],
					primaryTable: compMod.parent?.collection?.name ?? '',
					primaryKey: compMod.parent?.collection?.fkFields ?? [],
					primaryTableActivated: compMod.parent?.collection?.isActivated,
					foreignTableActivated: compMod.child?.collection?.isActivated,
					primarySchemaName: compMod.parent?.bucket?.name,
					customProperties: compMod.customProperties?.new,
				},
				{},
				{ schemaName },
			);
		});
};

/**
 * Build the CREATE TABLE statement for an added collection.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @param {AlterRelationship[]} inlineDeltaRelationships Relationships rendered inline in the table definition.
 * @param {Record<string, AlterCollection>} [relatedSchemas] Sibling entities of the model/container batch, keyed by
 *   entity GUID, used to resolve cross-entity references (e.g. auxiliary base table, LIKE table, history table).
 * @returns {(collection: AlterCollection) => AlterScriptDto | undefined} Add collection script builder.
 */
const getAddCollectionScriptDto = (ddlProvider, inlineDeltaRelationships, relatedSchemas) => collection => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const schemaName = getSchemaNameFromCollection({ collection }) ?? '';
	const schemaData = { schemaName };

	const columnDefinitions = toPairs(collectionSchema.properties ?? {}).map(([name, column]) =>
		createColumnDefinitionBySchema({
			name,
			jsonSchema: column,
			parentJsonSchema: collectionSchema,
			ddlProvider,
			schemaData,
		}),
	);

	const checkConstraints = (collectionSchema.chkConstr ?? []).map(checkConstraint =>
		ddlProvider.createCheckConstraint(ddlProvider.hydrateCheckConstraint(checkConstraint)),
	);

	const hydratedTable = ddlProvider.hydrateTable({
		tableData: {
			name: getEntityName(collectionSchema),
			columns: columnDefinitions.map(columnDefinition => ddlProvider.convertColumnDefinition(columnDefinition)),
			checkConstraints,
			foreignKeyConstraints: getInlineForeignKeyConstraints({
				collection,
				inlineDeltaRelationships,
				ddlProvider,
				schemaName,
			}),
			schemaData,
			columnDefinitions,
			relatedSchemas,
		},
		entityData: [collectionSchema],
		jsonSchema: collectionSchema,
	});
	const script = ddlProvider.createTable(hydratedTable, collectionSchema.isActivated);

	return createAlterScriptDto([script], true, false);
};

/**
 * Build the DROP TABLE statement for a deleted collection.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @returns {(collection: AlterCollection) => AlterScriptDto | undefined} Delete collection script builder.
 */
const getDeleteCollectionScriptDto = ddlProvider => collection => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const script = ddlProvider.dropTable({ tableName: getFullCollectionName({ collectionSchema }) });

	return createAlterScriptDto([script], true, true);
};

/**
 * Build the statements for a modified collection, excluding its keys and columns.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifyCollectionScriptDtos = collection => {
	return [
		...getRenameTableScriptDtos(collection),
		...getModifyCheckConstraintScriptDtos(collection),
		...getModifyEntityCommentsScriptDtos(collection),
	];
};

/**
 * Build the key and index statements for a modified collection.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @returns {(collection: AlterCollection) => AlterScriptDto[]} Modify keys script builder.
 */
const getModifyCollectionKeysScriptDtos = ddlProvider => collection => {
	return [
		...getModifyPkConstraintsScriptDtos(collection),
		...getModifyUkConstraintsScriptDtos(collection),
		...getModifyIndexesScriptDtos({ ddlProvider, collection }),
	];
};

/**
 * Build the ADD COLUMN statements of a collection.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @returns {(collection: AlterCollection) => AlterScriptDto[]} Add column script builder.
 */
const getAddColumnScriptDtos = ddlProvider => collection => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const fullTableName = getFullCollectionName({ collectionSchema });
	const schemaData = { schemaName: getSchemaNameFromCollection({ collection }) ?? '' };

	return toPairs(collection.properties ?? {})
		.filter(([, jsonSchema]) => !jsonSchema.compMod)
		.map(([name, jsonSchema]) => {
			const columnDefinition = createColumnDefinitionBySchema({
				name,
				jsonSchema,
				parentJsonSchema: collectionSchema,
				ddlProvider,
				schemaData,
			});
			const script = ddlProvider.addColumn({
				tableName: fullTableName,
				columnDefinition: ddlProvider.convertColumnDefinition(columnDefinition),
			});

			return createAlterScriptDto([script], true, false);
		})
		.filter(scriptDto => scriptDto !== undefined);
};

/**
 * Build the DROP COLUMN statements of a collection.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @returns {(collection: AlterCollection) => AlterScriptDto[]} Delete column script builder.
 */
const getDeleteColumnScriptDtos = ddlProvider => collection => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const fullTableName = getFullCollectionName({ collectionSchema, preferAlterName: false });

	return toPairs(collection.properties ?? {})
		.filter(([, jsonSchema]) => !jsonSchema.compMod)
		.map(([name]) => {
			const script = ddlProvider.dropColumn({ tableName: fullTableName, columnName: wrapInQuotes(name) });

			return createAlterScriptDto([script], true, true);
		})
		.filter(scriptDto => scriptDto !== undefined);
};

/**
 * Build the column statements for a modified collection.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @returns {(collection: AlterCollection) => AlterScriptDto[]} Modify column script builder.
 */
const getModifyColumnScriptDtos = ddlProvider => collection => {
	return [
		...getRenameColumnScriptDtos(collection),
		...getUpdateTypesScriptDtos(ddlProvider)(collection),
		...getModifyNonNullColumnsScriptDtos(collection),
		...getModifiedDefaultColumnValueScriptDtos({ collection }),
		...getModifiedCommentOnColumnScriptDtos(collection),
	];
};

/**
 * Build the entity-level script builders bound to a DDL provider.
 *
 * @param {App} app App instance.
 * @param {AlterRelationship[]} inlineDeltaRelationships Relationships rendered inline in table definitions.
 * @param {Record<string, AlterCollection>} [relatedSchemas] Sibling entities of the model/container batch, keyed by
 *   entity GUID, used to resolve cross-entity references.
 * @returns {{
 * 	getAddCollectionScriptDto: (collection: AlterCollection) => AlterScriptDto | undefined;
 * 	getDeleteCollectionScriptDto: (collection: AlterCollection) => AlterScriptDto | undefined;
 * 	getModifyCollectionScriptDtos: (collection: AlterCollection) => AlterScriptDto[];
 * 	getModifyCollectionKeysScriptDtos: (collection: AlterCollection) => AlterScriptDto[];
 * 	getModifyColumnScriptDtos: (collection: AlterCollection) => AlterScriptDto[];
 * 	getAddColumnScriptDtos: (collection: AlterCollection) => AlterScriptDto[];
 * 	getDeleteColumnScriptDtos: (collection: AlterCollection) => AlterScriptDto[];
 * }}
 *   Entity script builders.
 */
const getEntitiesScripts = (app, inlineDeltaRelationships, relatedSchemas) => {
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);

	return {
		getAddCollectionScriptDto: getAddCollectionScriptDto(ddlProvider, inlineDeltaRelationships, relatedSchemas),
		getDeleteCollectionScriptDto: getDeleteCollectionScriptDto(ddlProvider),
		getModifyCollectionScriptDtos,
		getModifyCollectionKeysScriptDtos: getModifyCollectionKeysScriptDtos(ddlProvider),
		getModifyColumnScriptDtos: getModifyColumnScriptDtos(ddlProvider),
		getAddColumnScriptDtos: getAddColumnScriptDtos(ddlProvider),
		getDeleteColumnScriptDtos: getDeleteColumnScriptDtos(ddlProvider),
	};
};

module.exports = {
	getEntitiesScripts,
};
