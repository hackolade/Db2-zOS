/**
 * @import {
 *   AlterCollection,
 *   AlterScriptDto
 * } from '../../../types/alterScript'
 */

const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const {
	isParentContainerActivated,
	isObjectInDeltaModelActivated,
	getSchemaOfAlterCollection,
	getSchemaNameFromCollection,
	getNamePrefixedWithSchemaName,
	wrapInQuotes,
} = require('../../../utils/general');
const { assignTemplates } = require('../../../utils/assignTemplates');
const templates = require('../../../ddlProvider/templates');

/**
 * Build the RENAME TABLE statement for a renamed collection.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getRenameTableScriptDtos = collection => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const { old: oldName, new: newName } = collectionSchema.compMod?.collectionName ?? {};

	if (!oldName || !newName || oldName === newName) {
		return [];
	}

	const schemaName = getSchemaNameFromCollection({ collection: collectionSchema });
	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isContainerActivated && isObjectInDeltaModelActivated(collection);

	const script = assignTemplates({
		template: templates.renameTable,
		templateData: {
			oldTableName: getNamePrefixedWithSchemaName({ name: oldName, schemaName }),
			newTableName: wrapInQuotes(newName),
		},
	});

	return [createAlterScriptDto([script], isCollectionActivated, false)].filter(scriptDto => scriptDto !== undefined);
};

module.exports = {
	getRenameTableScriptDtos,
};
