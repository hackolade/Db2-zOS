/**
 * @import {
 *   AlterCollection,
 *   AlterScriptDto
 * } from '../../../types/alterScript'
 */

const toPairs = require('lodash/toPairs');
const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const {
	isObjectInDeltaModelActivated,
	isParentContainerActivated,
	getSchemaOfAlterCollection,
	getFullCollectionName,
} = require('../../../utils/general');
const {
	getColumnCommentStatement,
	dropTableColumnCommentStatement,
} = require('../../../ddlProvider/ddlHelpers/comment/commentHelper');

/**
 * Build the COMMENT ON COLUMN statements for columns whose description was set or changed.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {(AlterScriptDto | undefined)[]} Alter script DTOs.
 */
const getUpdatedCommentOnColumnScriptDtos = collection => {
	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const tableName = getFullCollectionName({ collectionSchema });

	return toPairs(collection.properties ?? {})
		.filter(([name, jsonSchema]) => {
			const newComment = jsonSchema.description;
			const oldName = jsonSchema.compMod?.oldField?.name ?? name;
			const oldComment = collection.role?.properties?.[oldName]?.description;

			return Boolean(newComment) && newComment !== oldComment;
		})
		.map(([columnName, jsonSchema]) => {
			const isActivated = isContainerActivated && isCollectionActivated && Boolean(jsonSchema.isActivated);
			const script = getColumnCommentStatement({
				tableName,
				columnName,
				description: jsonSchema.description,
			});

			return createAlterScriptDto([script], isActivated, false);
		});
};

/**
 * Build the statements removing comments from columns whose description was cleared.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {(AlterScriptDto | undefined)[]} Alter script DTOs.
 */
const getDeletedCommentOnColumnScriptDtos = collection => {
	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const tableName = getFullCollectionName({ collectionSchema });

	return toPairs(collection.properties ?? {})
		.filter(([name, jsonSchema]) => {
			const oldName = jsonSchema.compMod?.oldField?.name ?? name;
			const oldComment = collection.role?.properties?.[oldName]?.description;

			return Boolean(oldComment) && !jsonSchema.description;
		})
		.map(([columnName, jsonSchema]) => {
			const isActivated = isContainerActivated && isCollectionActivated && Boolean(jsonSchema.isActivated);
			const script = dropTableColumnCommentStatement({ tableName, columnName });

			return createAlterScriptDto([script], isActivated, true);
		});
};

/**
 * Build all column comment statements for a collection.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifiedCommentOnColumnScriptDtos = collection => {
	const updatedCommentScriptDtos = getUpdatedCommentOnColumnScriptDtos(collection);
	const deletedCommentScriptDtos = getDeletedCommentOnColumnScriptDtos(collection);

	return [...updatedCommentScriptDtos, ...deletedCommentScriptDtos].filter(scriptDto => scriptDto !== undefined);
};

module.exports = {
	getModifiedCommentOnColumnScriptDtos,
};
