/** @typedef {{ id: string; name: string; keyType?: string; onDelete?: string }} MegaForeignKey */

/** @typedef {{ megaForeignKey?: MegaForeignKey }} DecorateRelationshipOptions */

/** @typedef {Readonly<Record<string, Record<string, string | undefined> | string | undefined>>} MegaTargetProperties */

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
 * @param {DecorateRelationshipOptions} options Foreign key of the MEGA export.
 * @returns {MegaTargetProperties} Relationship properties.
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
 * @param {{ onDelete: string | undefined }} options MEGA OnDelete value.
 * @returns {string | undefined} Db2 ON DELETE rule.
 */
const relationshipOnDeleteOf = ({ onDelete }) => {
	const value = onDelete?.trim().toUpperCase() ?? '';

	return RELATIONSHIP_ON_DELETE_BY_MEGA_ON_DELETE[value];
};

module.exports = {
	decorateRelationship,
};
