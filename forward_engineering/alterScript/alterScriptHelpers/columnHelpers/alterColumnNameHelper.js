/**
 * @import {
 *   AlterCollection,
 *   AlterScriptDto
 * } from '../../../types/alterScript'
 */

const toPairs = require('lodash/toPairs');
const {
	getSchemaOfAlterCollection,
	getFullCollectionName,
	isParentContainerActivated,
	isObjectInDeltaModelActivated,
	wrapInQuotes,
} = require('../../../utils/general');
const templates = require('../../../ddlProvider/templates');
const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const { assignTemplates } = require('../../../utils/assignTemplates');

/**
 * Build the RENAME COLUMN statement.
 *
 * @param {string} tableName Fully qualified table name.
 * @param {string} oldColumnName Current column name.
 * @param {string} newColumnName New column name.
 * @returns {string} Rename statement.
 */
const alterColumnName = (tableName, oldColumnName, newColumnName) => {
	return assignTemplates({
		template: templates.renameColumn,
		templateData: {
			tableName,
			oldColumnName: wrapInQuotes(oldColumnName),
			newColumnName: wrapInQuotes(newColumnName),
		},
	});
};

/**
 * Build the rename statements for all renamed columns of a collection.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getRenameColumnScriptDtos = collection => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const fullTableName = getFullCollectionName({ collectionSchema });
	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);

	return toPairs(collection.properties ?? {})
		.map(([, jsonSchema]) => {
			const oldName = jsonSchema.compMod?.oldField?.name;
			const newName = jsonSchema.compMod?.newField?.name;

			if (!oldName || !newName || oldName === newName) {
				return void 0;
			}

			const isActivated = isContainerActivated && isCollectionActivated && Boolean(jsonSchema.isActivated);
			const script = alterColumnName(fullTableName, oldName, newName);

			return createAlterScriptDto([script], isActivated, false);
		})
		.filter(scriptDto => scriptDto !== undefined);
};

module.exports = {
	getRenameColumnScriptDtos,
};
