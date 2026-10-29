/**
 * @import {
 *   MegaForeignKey,
 *   RelationshipProperties
 * } from '../types/megaProvider'
 */

/**
 * MEGA states Cascade and Restrict. The internal codes are kept for an export whose value has no display text. The
 * other two rules are the remaining values of the Db2 relationship.
 */
/** @type {Readonly<Record<string, string>>} */
const RELATIONSHIP_ON_DELETE_BY_MEGA_ON_DELETE = {
	CASCADE: 'CASCADE',
	C: 'CASCADE',
	RESTRICT: 'RESTRICT',
	R: 'RESTRICT',
	'SET NULL': 'SET NULL',
	N: 'SET NULL',
	'NO ACTION': 'NO ACTION',
};

/**
 * @param {object} [params] - Params.
 * @param {MegaForeignKey} [params.megaForeignKey] - Foreign key of the MEGA export.
 * @returns {RelationshipProperties} - Relationship properties.
 */
const decorateRelationship = ({ megaForeignKey } = {}) => {
	if (!megaForeignKey) {
		return {};
	}

	const relationshipOnDelete = relationshipOnDeleteOf({
		onDelete: megaForeignKey.onDelete,
	});

	return {
		...(relationshipOnDelete && {
			relationshipInfo: { relationshipOnDelete },
		}),
	};
};

/**
 * @param {object} params - Params.
 * @param {string | undefined} params.onDelete - MEGA OnDelete value.
 * @returns {string | undefined} - Db2 ON DELETE rule.
 */
const relationshipOnDeleteOf = ({ onDelete }) => {
	const value = onDelete?.trim().toUpperCase() ?? '';

	return RELATIONSHIP_ON_DELETE_BY_MEGA_ON_DELETE[value];
};

module.exports = {
	decorateRelationship,
};
