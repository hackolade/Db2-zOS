/**
 * @import {
 *   AlterCollection,
 *   AlterIndex,
 *   AlterScriptDto
 * } from '../../../types/alterScript'
 */

const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const {
	getSchemaNameFromCollection,
	getNamePrefixedWithSchemaName,
	isObjectInDeltaModelActivated,
} = require('../../../utils/general');
const {
	getIndexCommentStatement,
	dropIndexCommentStatement,
} = require('../../../ddlProvider/ddlHelpers/comment/commentHelper');

/**
 * Build the COMMENT ON INDEX statement when the index description changed.
 *
 * @param {{ newIndex: AlterIndex; oldIndex: AlterIndex; collection: AlterCollection }} params Index versions and their
 *   collection.
 * @returns {AlterScriptDto | undefined} Alter script DTO.
 */
const getModifyIndexCommentsScriptDtos = ({ newIndex, oldIndex, collection }) => {
	const newDescription = newIndex.indxDescription;
	const oldDescription = oldIndex.indxDescription;
	const indexName = getNamePrefixedWithSchemaName({
		name: newIndex.indxName ?? '',
		schemaName: getSchemaNameFromCollection({ collection }),
	});
	const isActivated = isObjectInDeltaModelActivated(collection) && Boolean(newIndex.isActivated);

	if (newDescription && newDescription !== oldDescription) {
		const script = getIndexCommentStatement({ indexName, description: newDescription });
		return createAlterScriptDto([script], isActivated, false);
	}

	if (oldDescription && !newDescription) {
		const script = dropIndexCommentStatement({ indexName });
		return createAlterScriptDto([script], isActivated, true);
	}

	return void 0;
};

module.exports = {
	getModifyIndexCommentsScriptDtos,
};
