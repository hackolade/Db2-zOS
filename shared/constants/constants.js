/** @enum {string} */
const OBJECT_TYPE = {
	table: 'TABLE',
	view: 'VIEW',
};

const INLINE_COMMENT = '--';

const CONSTRAINT_POSTFIX = {
	primaryKey: 'pk',
	foreignKey: 'fk',
	uniqueKey: 'uk',
	notNull: 'nn',
	check: 'check',
	default: 'default',
};

module.exports = {
	OBJECT_TYPE,
	INLINE_COMMENT,
	CONSTRAINT_POSTFIX,
};
