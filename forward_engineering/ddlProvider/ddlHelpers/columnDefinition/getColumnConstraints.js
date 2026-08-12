/**
 * @import {
 *   ColumnConstraintParams,
 *   KeyOptions
 * } from '../../../types/ddlProvider'
 */

const trim = require('lodash/trim');
const { getOptionsString } = require('../constraint/getOptionsString');
const { getDefaultConstraintName } = require('../key/getDefaultConstraintName');
const { CONSTRAINT_POSTFIX } = require('../../../../shared/constants/constants');

/**
 * Resolve primary/unique key options.
 *
 * @param {ColumnConstraintParams} params Key flags.
 * @returns {KeyOptions} Options object.
 */
const getOptions = ({ primaryKey, unique, primaryKeyOptions, uniqueKeyOptions }) => {
	if (primaryKey) {
		return primaryKeyOptions ?? {};
	}

	if (unique) {
		return uniqueKeyOptions ?? {};
	}

	return {};
};

/**
 * Resolve the name of the key declared inline on a column, falling back to the name the alter script would later use to
 * drop it.
 *
 * @param {ColumnConstraintParams} params Column constraint flags.
 * @returns {string | undefined} Constraint name.
 */
const getConstraintName = ({ unique, primaryKey, primaryKeyOptions, uniqueKeyOptions, entityName }) => {
	if (!primaryKey && !unique) {
		return void 0;
	}

	const options = getOptions({ primaryKey, unique, primaryKeyOptions, uniqueKeyOptions });
	const postfix = primaryKey ? CONSTRAINT_POSTFIX.primaryKey : CONSTRAINT_POSTFIX.uniqueKey;

	return trim(options.constraintName) || getDefaultConstraintName({ entityName, postfix });
};

/**
 * Build the column nullability clause.
 *
 * @param {{ nullable?: boolean }} params Column nullability.
 * @returns {string} Nullability DDL fragment.
 */
const getColumnNullability = ({ nullable }) => (nullable ? '' : ' NOT NULL');

/**
 * Build column constraint clauses.
 *
 * @param {ColumnConstraintParams} params Column constraint flags.
 * @returns {string} Constraints DDL fragment.
 */
const getColumnConstraints = ({ unique, primaryKey, primaryKeyOptions, uniqueKeyOptions, entityName }) => {
	const { constraintString, statement } = getOptionsString({
		...getOptions({ primaryKey, unique, primaryKeyOptions, uniqueKeyOptions }),
		constraintName: getConstraintName({ unique, primaryKey, primaryKeyOptions, uniqueKeyOptions, entityName }),
	});
	const primaryKeyString = primaryKey ? ` PRIMARY KEY` : '';
	const uniqueKeyString = unique ? ` UNIQUE` : '';
	return `${constraintString}${primaryKeyString}${uniqueKeyString}${statement}`;
};

module.exports = {
	getColumnNullability,
	getColumnConstraints,
};
