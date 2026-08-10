/**
 * @import {
 *   AlterCollection,
 *   AlterIndex,
 *   AlterIndexKey
 * } from '../../../types/alterScript'
 */

const lodash = require('lodash');
const { getSchemaNameFromCollection } = require('../../../utils/general');

/**
 * Resolve a column name by the identifier an index key refers to. Deleted collections only keep their columns in
 * `oldProperties`, so both places have to be considered.
 *
 * @param {{ columnId?: string; collection: AlterCollection }} params Column identifier and its collection.
 * @returns {string | undefined} Column name.
 */
const getColumnNameById = ({ columnId, collection }) => {
	const columns = collection.role?.properties ?? collection.properties ?? {};
	const namedColumn = lodash.toPairs(columns).find(([, jsonSchema]) => jsonSchema.GUID === columnId);

	if (namedColumn) {
		return namedColumn[0];
	}

	return collection.role?.compMod?.oldProperties?.find(property => property.id === columnId)?.name;
};

/**
 * Resolve the column names of an index key list.
 *
 * @param {{ keys?: AlterIndexKey[]; collection: AlterCollection }} params Index keys and their collection.
 * @returns {AlterIndexKey[]} Index keys with resolved names.
 */
const mapKeysWithNames = ({ keys, collection }) => {
	if (!keys?.length) {
		return keys ?? [];
	}

	return keys
		.map(key => {
			const name = key.name ?? getColumnNameById({ columnId: key.keyId, collection });

			return { keyId: key.keyId, type: key.type, isActivated: key.isActivated, name };
		})
		.filter(key => Boolean(key.name));
};

/**
 * Resolve the column names of an index, which the delta model only references by identifier.
 *
 * @param {{ index: AlterIndex; collection: AlterCollection }} params Index and its collection.
 * @returns {AlterIndex} Index with resolved key names.
 */
const addNameToIndexKey = ({ index, collection }) => {
	if (!index.indxKey?.length) {
		return index;
	}

	return {
		...index,
		schemaName: getSchemaNameFromCollection({ collection }),
		indxKey: mapKeysWithNames({ keys: index.indxKey, collection }),
		indxIncludeKey: mapKeysWithNames({ keys: index.indxIncludeKey, collection }),
	};
};

module.exports = {
	addNameToIndexKey,
};
