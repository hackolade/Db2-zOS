/**
 * @import {
 *   ColumnConstraintParams,
 *   KeyOptions
 * } from '../../../types/ddlProvider'
 */

const { getOptionsString } = require('../constraint/getOptionsString');

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
 * Build column constraint clauses.
 *
 * @param {ColumnConstraintParams} params Column constraint flags.
 * @returns {string} Constraints DDL fragment.
 */
const getColumnConstraints = ({ nullable, unique, primaryKey, primaryKeyOptions, uniqueKeyOptions }) => {
	const { constraintString, statement } = getOptionsString(
		getOptions({ primaryKey, unique, primaryKeyOptions, uniqueKeyOptions }),
	);
	const primaryKeyString = primaryKey ? ` PRIMARY KEY` : '';
	const uniqueKeyString = unique ? ` UNIQUE` : '';
	const nullableString = nullable ? '' : ' NOT NULL';
	return `${nullableString}${constraintString}${primaryKeyString}${uniqueKeyString}${statement}`;
};

module.exports = {
	getColumnConstraints,
};
