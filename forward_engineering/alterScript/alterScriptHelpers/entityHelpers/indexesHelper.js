/**
 * @import {
 *   AlterCollection,
 *   AlterIndex,
 *   AlterScriptDto
 * } from '../../../types/alterScript'
 * @import {DdlProvider} from '../../../types/ddlProvider'
 */

const isEqual = require('lodash/isEqual');
const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const {
	getSchemaNameFromCollection,
	getNamePrefixedWithSchemaName,
	wrapInQuotes,
	getSchemaOfAlterCollection,
	getEntityName,
	isObjectInDeltaModelActivated,
} = require('../../../utils/general');
const { assignTemplates } = require('../../../utils/assignTemplates');
const templates = require('../../../ddlProvider/templates');
const { getModifyIndexCommentsScriptDtos } = require('../indexHelpers/commentsHelper');
const { addNameToIndexKey } = require('../indexHelpers/addNameToIndexKey');

/**
 * Db2 for z/OS can only rename an index and change its comment in place. Every other property is part of CREATE INDEX
 * and therefore forces a drop and recreate.
 *
 * @type {(keyof AlterIndex)[]}
 */
const DROP_AND_RECREATE_INDEX_PROPERTIES = [
	'indxType',
	'indxKey',
	'indxIncludeKey',
	'indxCompress',
	'indxNullKeys',
	'indxCluster',
	'indxPartitioned',
	'indxPadded',
	'indxUsingType',
	'indxStogroup',
	'indxVcat',
	'indxPriQty',
	'indxSecQty',
	'indxErase',
	'indxFreepage',
	'indxPctfree',
	'indxDefine',
	'indxBufferPool',
	'indxClose',
	'indxDefer',
	'indxCopy',
	'indxPiecesize',
	'indxPiecesizeUnit',
	'indxProperties',
];

/**
 * Check whether an index has to be dropped and recreated.
 *
 * @param {{ oldIndex: AlterIndex; newIndex: AlterIndex }} params Index versions.
 * @returns {boolean} Whether the index has to be recreated.
 */
const shouldDropAndRecreateIndex = ({ oldIndex, newIndex }) =>
	DROP_AND_RECREATE_INDEX_PROPERTIES.some(property => !isEqual(oldIndex[property], newIndex[property]));

/**
 * Check whether two index versions describe the same database index.
 *
 * @param {{ oldIndex: AlterIndex; newIndex: AlterIndex }} params Index versions.
 * @returns {boolean} Whether both describe the same index.
 */
const isSameIndex = ({ oldIndex, newIndex }) =>
	(Boolean(oldIndex.id) && oldIndex.id === newIndex.id) || oldIndex.indxName === newIndex.indxName;

/**
 * Build the RENAME INDEX statement.
 *
 * @param {{ schemaName?: string; oldIndexName: string; newIndexName: string; isActivated: boolean }} params Rename
 *   parts.
 * @returns {AlterScriptDto | undefined} Alter script DTO.
 */
const getRenameIndexScriptDto = ({ schemaName, oldIndexName, newIndexName, isActivated }) => {
	const script = assignTemplates({
		template: templates.renameIndex,
		templateData: {
			oldIndexName: getNamePrefixedWithSchemaName({ name: oldIndexName, schemaName }),
			newIndexName: wrapInQuotes(newIndexName),
		},
	});

	return createAlterScriptDto([script], isActivated, false);
};

/**
 * Build the CREATE INDEX statement for an index of a collection.
 *
 * @param {{ index: AlterIndex; collection: AlterCollection; ddlProvider: DdlProvider }} params Index, its collection
 *   and the DDL provider.
 * @returns {AlterScriptDto | undefined} Alter script DTO.
 */
const getCreateIndexScriptDto = ({ index, collection, ddlProvider }) => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	// `createIndex` comments the statement out unless both flags are set, and only `hydrateIndex` - which the alter
	// flow does not go through - would otherwise fill `isParentActivated` in.
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);
	const script = ddlProvider.createIndex(getEntityName(collectionSchema), {
		...addNameToIndexKey({ index, collection }),
		isParentActivated: isCollectionActivated,
	});

	return createAlterScriptDto([script], isCollectionActivated && Boolean(index.isActivated), false);
};

/**
 * Build the DROP INDEX statement for an index of a collection.
 *
 * @param {{ index: AlterIndex; collection: AlterCollection; ddlProvider: DdlProvider }} params Index, its collection
 *   and the DDL provider.
 * @returns {AlterScriptDto | undefined} Alter script DTO.
 */
const getDeleteIndexScriptDto = ({ index, collection, ddlProvider }) => {
	const fullIndexName = getNamePrefixedWithSchemaName({
		name: index.indxName ?? '',
		schemaName: getSchemaNameFromCollection({ collection }),
	});
	const script = ddlProvider.dropIndex(fullIndexName);
	const isActivated = Boolean(index.isActivated) && isObjectInDeltaModelActivated(collection);

	return createAlterScriptDto([script], isActivated, true);
};

/**
 * Read the previous and current indexes of a collection.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {{ oldIndexes: AlterIndex[]; newIndexes: AlterIndex[] }} Indexes.
 */
const getIndexDelta = collection => ({
	oldIndexes: collection.role?.compMod?.Indxs?.old ?? [],
	newIndexes: collection.role?.compMod?.Indxs?.new ?? [],
});

/**
 * Build the statements creating the indexes that appeared.
 *
 * @param {{ collection: AlterCollection; ddlProvider: DdlProvider }} params Collection delta and DDL provider.
 * @returns {(AlterScriptDto | undefined)[]} Alter script DTOs.
 */
const getAddedIndexesScriptDtos = ({ collection, ddlProvider }) => {
	const { oldIndexes } = getIndexDelta(collection);
	const currentIndexes = collection.role?.Indxs ?? [];

	return currentIndexes
		.filter(newIndex => !oldIndexes.some(oldIndex => isSameIndex({ oldIndex, newIndex })))
		.map(index => getCreateIndexScriptDto({ index, collection, ddlProvider }));
};

/**
 * Build the statements dropping the indexes that disappeared.
 *
 * @param {{ collection: AlterCollection; ddlProvider: DdlProvider }} params Collection delta and DDL provider.
 * @returns {(AlterScriptDto | undefined)[]} Alter script DTOs.
 */
const getDeletedIndexesScriptDtos = ({ collection, ddlProvider }) => {
	const { oldIndexes, newIndexes } = getIndexDelta(collection);

	return oldIndexes
		.filter(oldIndex => !newIndexes.some(newIndex => isSameIndex({ oldIndex, newIndex })))
		.map(index => getDeleteIndexScriptDto({ index, collection, ddlProvider }));
};

/**
 * Build the statements for a single modified index.
 *
 * @param {{
 * 	newIndex: AlterIndex;
 * 	oldIndex: AlterIndex;
 * 	collection: AlterCollection;
 * 	ddlProvider: DdlProvider;
 * }} params
 *   Index versions, their collection and the DDL provider.
 * @returns {(AlterScriptDto | undefined)[]} Alter script DTOs.
 */
const getModifyIndexScriptDtos = ({ newIndex, oldIndex, collection, ddlProvider }) => {
	if (shouldDropAndRecreateIndex({ newIndex, oldIndex })) {
		return [
			getDeleteIndexScriptDto({ index: oldIndex, collection, ddlProvider }),
			getCreateIndexScriptDto({ index: newIndex, collection, ddlProvider }),
		];
	}

	const scriptDtos = [];

	if (oldIndex.indxName !== newIndex.indxName) {
		scriptDtos.push(
			getRenameIndexScriptDto({
				schemaName: getSchemaNameFromCollection({ collection }),
				oldIndexName: oldIndex.indxName ?? '',
				newIndexName: newIndex.indxName ?? '',
				isActivated: isObjectInDeltaModelActivated(collection) && Boolean(newIndex.isActivated),
			}),
		);
	}

	scriptDtos.push(getModifyIndexCommentsScriptDtos({ newIndex, oldIndex, collection }));

	return scriptDtos;
};

/**
 * Build the statements for every index that exists on both sides of the diff.
 *
 * @param {{ collection: AlterCollection; ddlProvider: DdlProvider }} params Collection delta and DDL provider.
 * @returns {(AlterScriptDto | undefined)[]} Alter script DTOs.
 */
const getModifiedIndexesScriptDtos = ({ collection, ddlProvider }) => {
	const { oldIndexes, newIndexes } = getIndexDelta(collection);

	return newIndexes.flatMap(newIndex => {
		const oldIndex = oldIndexes.find(index => isSameIndex({ oldIndex: index, newIndex }));

		if (!oldIndex) {
			return [];
		}

		return getModifyIndexScriptDtos({ newIndex, oldIndex, collection, ddlProvider });
	});
};

/**
 * Build all index statements for a collection.
 *
 * @param {{ ddlProvider: DdlProvider; collection: AlterCollection }} params DDL provider and collection delta.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifyIndexesScriptDtos = ({ ddlProvider, collection }) => {
	return [
		...getDeletedIndexesScriptDtos({ collection, ddlProvider }),
		...getAddedIndexesScriptDtos({ collection, ddlProvider }),
		...getModifiedIndexesScriptDtos({ collection, ddlProvider }),
	].filter(scriptDto => scriptDto !== undefined);
};

module.exports = {
	getModifyIndexesScriptDtos,
};
