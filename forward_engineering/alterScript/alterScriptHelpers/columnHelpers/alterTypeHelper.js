/**
 * @import {
 *   AlterCollection,
 *   AlterColumn,
 *   AlterScriptDto
 * } from '../../../types/alterScript'
 * @import {DdlProvider} from '../../../types/ddlProvider'
 */

const lodash = require('lodash');
const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const {
	checkFieldPropertiesChanged,
	getFullCollectionName,
	wrapInQuotes,
	isObjectInDeltaModelActivated,
	isParentContainerActivated,
	getSchemaOfAlterCollection,
	getSchemaNameFromCollection,
} = require('../../../utils/general');
const { assignTemplates } = require('../../../utils/assignTemplates');
const templates = require('../../../ddlProvider/templates');
const { createColumnDefinitionBySchema } = require('../createColumnDefinition');
const { getColumnType } = require('../../../ddlProvider/ddlHelpers/columnDefinition/getColumnType');

/**
 * Build the SET DATA TYPE statement.
 *
 * @param {string} tableName Fully qualified table name.
 * @param {string} columnName Quoted column name.
 * @param {string} dataType Column data type.
 * @returns {string} Alter statement.
 */
const alterColumnType = (tableName, columnName, dataType) => {
	return assignTemplates({
		template: templates.updateColumnType,
		templateData: { tableName, columnName, dataType },
	});
};

/**
 * Check whether the length, precision or scale of a column changed.
 *
 * @param {AlterCollection} collection Collection delta.
 * @param {string} oldFieldName Previous column name.
 * @param {AlterColumn} jsonSchema Current column schema.
 * @returns {boolean} Whether the type size changed.
 */
const hasTypeSizeChanged = (collection, oldFieldName, jsonSchema) => {
	const oldProperty = collection.role?.properties?.[oldFieldName];

	return (
		oldProperty?.length !== jsonSchema.length ||
		oldProperty?.precision !== jsonSchema.precision ||
		oldProperty?.scale !== jsonSchema.scale
	);
};

/**
 * Build the data type statements for every column whose type changed.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @returns {(collection: AlterCollection) => AlterScriptDto[]} Update types script builder.
 */
const getUpdateTypesScriptDtos = ddlProvider => collection => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const fullTableName = getFullCollectionName({ collectionSchema });
	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);
	const schemaName = getSchemaNameFromCollection({ collection });

	return lodash
		.toPairs(collection.properties ?? {})
		.filter(([name, jsonSchema]) => {
			if (!jsonSchema.compMod) {
				return false;
			}

			if (checkFieldPropertiesChanged(jsonSchema.compMod, ['type', 'mode'])) {
				return true;
			}

			return hasTypeSizeChanged(collection, jsonSchema.compMod.oldField.name ?? name, jsonSchema);
		})
		.map(([columnName, jsonSchema]) => {
			const columnDefinition = createColumnDefinitionBySchema({
				name: columnName,
				jsonSchema,
				parentJsonSchema: collectionSchema,
				ddlProvider,
				schemaData: { schemaName: schemaName ?? '' },
			});

			const dataType = getColumnType(columnDefinition).trim();
			const script = alterColumnType(fullTableName, wrapInQuotes(columnName), dataType);
			const isActivated = isContainerActivated && isCollectionActivated && Boolean(jsonSchema.isActivated);

			return createAlterScriptDto([script], isActivated, false);
		})
		.filter(scriptDto => scriptDto !== undefined);
};

module.exports = {
	getUpdateTypesScriptDtos,
};
