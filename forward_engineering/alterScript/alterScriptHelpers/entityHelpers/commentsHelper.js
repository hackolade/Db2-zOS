/**
 * @import {
 *   AlterCollection,
 *   AlterScriptDto
 * } from '../../../types/alterScript'
 */

const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const {
	isObjectInDeltaModelActivated,
	isParentContainerActivated,
	getSchemaOfAlterCollection,
	getFullCollectionName,
} = require('../../../utils/general');
const {
	getTableCommentStatement,
	dropTableCommentStatement,
} = require('../../../ddlProvider/ddlHelpers/comment/commentHelper');

/**
 * Build the COMMENT ON TABLE statement when the description was set or changed.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {AlterScriptDto | undefined} Alter script DTO.
 */
const getUpdatedCommentOnCollectionScriptDto = collection => {
	const { old: oldComment, new: newComment } = collection.role?.compMod?.description ?? {};

	if (!newComment || newComment === oldComment) {
		return void 0;
	}

	const collectionSchema = getSchemaOfAlterCollection(collection);
	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isContainerActivated && isObjectInDeltaModelActivated(collection);

	const script = getTableCommentStatement({
		tableName: getFullCollectionName({ collectionSchema }),
		description: newComment,
	});

	return createAlterScriptDto([script], isCollectionActivated, false);
};

/**
 * Build the statement removing the table comment when the description was cleared.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {AlterScriptDto | undefined} Alter script DTO.
 */
const getDeletedCommentOnCollectionScriptDto = collection => {
	const { old: oldComment, new: newComment } = collection.role?.compMod?.description ?? {};

	if (!oldComment || newComment) {
		return void 0;
	}

	const collectionSchema = getSchemaOfAlterCollection(collection);
	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isContainerActivated && isObjectInDeltaModelActivated(collection);

	const script = dropTableCommentStatement({ tableName: getFullCollectionName({ collectionSchema }) });

	return createAlterScriptDto([script], isCollectionActivated, true);
};

/**
 * Build all table comment statements for a collection.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifyEntityCommentsScriptDtos = collection => {
	const updatedCommentScriptDto = getUpdatedCommentOnCollectionScriptDto(collection);
	const deletedCommentScriptDto = getDeletedCommentOnCollectionScriptDto(collection);

	return [updatedCommentScriptDto, deletedCommentScriptDto].filter(scriptDto => scriptDto !== undefined);
};

module.exports = {
	getModifyEntityCommentsScriptDtos,
};
