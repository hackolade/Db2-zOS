/**
 * @import {
 *   AlterCollection,
 *   AlterScriptDto
 * } from '../../../types/alterScript'
 */

const toPairs = require('lodash/toPairs');
const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const {
	getFullCollectionName,
	wrapInQuotes,
	isObjectInDeltaModelActivated,
	isParentContainerActivated,
	getSchemaOfAlterCollection,
} = require('../../../utils/general');
const { assignTemplates } = require('../../../utils/assignTemplates');
const templates = require('../../../ddlProvider/templates');

/**
 * Build the SET DEFAULT statement.
 *
 * @param {{ tableName: string; columnName: string; defaultValue: string | number | boolean }} params Statement parts.
 * @returns {string} Alter statement.
 */
const updateColumnDefaultValue = ({ tableName, columnName, defaultValue }) => {
	return assignTemplates({
		template: templates.updateColumnDefaultValue,
		templateData: { tableName, columnName, defaultValue },
	});
};

/**
 * Build the DROP DEFAULT statement.
 *
 * @param {{ tableName: string; columnName: string }} params Statement parts.
 * @returns {string} Alter statement.
 */
const dropColumnDefaultValue = ({ tableName, columnName }) => {
	return assignTemplates({
		template: templates.dropColumnDefaultValue,
		templateData: { tableName, columnName },
	});
};

/**
 * Build the statements for columns that got a new default value.
 *
 * @param {{ collection: AlterCollection }} params Collection delta.
 * @returns {(AlterScriptDto | undefined)[]} Alter script DTOs.
 */
const getUpdatedDefaultColumnValueScriptDtos = ({ collection }) => {
	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);
	const collectionSchema = getSchemaOfAlterCollection(collection);

	return toPairs(collection.properties ?? {})
		.filter(([name, jsonSchema]) => {
			const oldName = jsonSchema.compMod?.oldField?.name ?? name;
			const oldDefault = collection.role?.properties?.[oldName]?.default;

			return jsonSchema.default !== undefined && jsonSchema.default !== oldDefault;
		})
		.map(([columnName, jsonSchema]) => {
			const isActivated = isContainerActivated && isCollectionActivated && Boolean(jsonSchema.isActivated);
			const script = updateColumnDefaultValue({
				tableName: getFullCollectionName({ collectionSchema }),
				columnName: wrapInQuotes(columnName),
				defaultValue: jsonSchema.default ?? '',
			});

			return createAlterScriptDto([script], isActivated, false);
		});
};

/**
 * Build the statements for columns whose default value was removed.
 *
 * @param {{ collection: AlterCollection }} params Collection delta.
 * @returns {(AlterScriptDto | undefined)[]} Alter script DTOs.
 */
const getDeletedDefaultColumnValueScriptDtos = ({ collection }) => {
	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);
	const collectionSchema = getSchemaOfAlterCollection(collection);

	return toPairs(collection.properties ?? {})
		.filter(([name, jsonSchema]) => {
			const oldName = jsonSchema.compMod?.oldField?.name ?? name;
			const oldDefault = collection.role?.properties?.[oldName]?.default;

			return oldDefault !== undefined && jsonSchema.default === undefined;
		})
		.map(([columnName, jsonSchema]) => {
			const isActivated = isContainerActivated && isCollectionActivated && Boolean(jsonSchema.isActivated);
			const script = dropColumnDefaultValue({
				tableName: getFullCollectionName({ collectionSchema }),
				columnName: wrapInQuotes(columnName),
			});

			return createAlterScriptDto([script], isActivated, true);
		});
};

/**
 * Build all default value statements for a collection.
 *
 * @param {{ collection: AlterCollection }} params Collection delta.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifiedDefaultColumnValueScriptDtos = ({ collection }) => {
	const updatedDefaultValueScriptDtos = getUpdatedDefaultColumnValueScriptDtos({ collection });
	const droppedDefaultValueScriptDtos = getDeletedDefaultColumnValueScriptDtos({ collection });

	return [...updatedDefaultValueScriptDtos, ...droppedDefaultValueScriptDtos].filter(
		scriptDto => scriptDto !== undefined,
	);
};

module.exports = {
	getModifiedDefaultColumnValueScriptDtos,
};
