/**
 * @import {
 *   AlterScriptDto,
 *   AlterView
 * } from '../../../types/alterScript'
 */

const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const {
	isObjectInDeltaModelActivated,
	isParentContainerActivated,
	getFullCollectionName,
	getSchemaOfAlterCollection,
} = require('../../../utils/general');
const {
	getTableCommentStatement,
	dropTableCommentStatement,
} = require('../../../ddlProvider/ddlHelpers/comment/commentHelper');

/**
 * Build the COMMENT ON statement when the view description was set or changed.
 *
 * @param {AlterView} view View delta.
 * @returns {AlterScriptDto | undefined} Alter script DTO.
 */
const getUpsertCommentsScriptDto = view => {
	const { old: oldComment, new: newComment } = view.role?.compMod?.description ?? {};

	if (!newComment || newComment === oldComment) {
		return void 0;
	}

	const viewSchema = getSchemaOfAlterCollection(view);
	const isViewActivated = isParentContainerActivated(view) && isObjectInDeltaModelActivated(view);
	const script = getTableCommentStatement({
		tableName: getFullCollectionName({ collectionSchema: viewSchema }),
		description: newComment,
	});

	return createAlterScriptDto([script], isViewActivated, false);
};

/**
 * Build the statement removing the view comment when the description was cleared.
 *
 * @param {AlterView} view View delta.
 * @returns {AlterScriptDto | undefined} Alter script DTO.
 */
const getDropCommentsScriptDto = view => {
	const { old: oldComment, new: newComment } = view.role?.compMod?.description ?? {};

	if (!oldComment || newComment) {
		return void 0;
	}

	const viewSchema = getSchemaOfAlterCollection(view);
	const isViewActivated = isParentContainerActivated(view) && isObjectInDeltaModelActivated(view);
	const script = dropTableCommentStatement({
		tableName: getFullCollectionName({ collectionSchema: viewSchema }),
	});

	return createAlterScriptDto([script], isViewActivated, true);
};

/**
 * Build all view comment statements.
 *
 * @param {AlterView} view View delta.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifyViewCommentsScriptDtos = view => {
	return [getUpsertCommentsScriptDto(view), getDropCommentsScriptDto(view)].filter(
		scriptDto => scriptDto !== undefined,
	);
};

module.exports = {
	getModifyViewCommentsScriptDtos,
};
