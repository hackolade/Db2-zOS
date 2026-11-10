/**
 * @import {
 *   DecorateIndexesOptions,
 *   IndexesProperties,
 *   IndexKeyProperties,
 *   IndexProperties,
 *   MegaIndex,
 *   MegaIndexMember,
 *   MegaTargetIndex
 * } from '../types/megaProvider'
 */

/** @type {Readonly<Record<string, NonNullable<IndexKeyProperties['type']>>>} */
const DIRECTION_BY_SORT_ORDER = { A: 'ASC', D: 'DESC' };

/**
 * @param {MegaIndex} megaIndex - Index from the MEGA export.
 * @returns {Pick<IndexProperties, 'indxType' | 'indxCluster'>} - Db2 index options.
 */
const indexOptions = megaIndex => ({
	...(megaIndex.indexType === 'U' && { indxType: 'unique' }),
	...(megaIndex.clustered === 'Y' && { indxCluster: 'CLUSTER' }),
	...(megaIndex.clustered === 'N' && { indxCluster: 'NOT CLUSTER' }),
});

/**
 * @param {MegaIndexMember} megaIndexMember - Column link of an index from the MEGA export.
 * @returns {Pick<IndexKeyProperties, 'type'>} - Direction of the key, when MEGA states one that Db2 has.
 */
const keyDirection = megaIndexMember => {
	const type =
		megaIndexMember.sortOrder === undefined ? undefined : DIRECTION_BY_SORT_ORDER[megaIndexMember.sortOrder];

	return type ? { type } : {};
};

/**
 * @param {MegaTargetIndex} index - Index from the MEGA export, with the identifiers of the index and of its members.
 * @returns {IndexProperties} - Db2 index, keyed as the Indexes of a table.
 */
const toIndex = ({ id, megaIndex, members }) => ({
	id,
	indxName: megaIndex.name,
	...indexOptions(megaIndex),
	indxKey: members.map(({ id: keyItemId, attributeId, megaIndexMember }) => ({
		id: keyItemId,
		keyId: attributeId,
		...keyDirection(megaIndexMember),
	})),
});

/**
 * @param {DecorateIndexesOptions} options - Table and its indexes from the MEGA export.
 * @returns {IndexesProperties} - Indexes of the Db2 table.
 */
const decorateIndexes = ({ megaIndexes }) => ({ Indxs: megaIndexes.map(index => toIndex(index)) });

module.exports = { decorateIndexes };
