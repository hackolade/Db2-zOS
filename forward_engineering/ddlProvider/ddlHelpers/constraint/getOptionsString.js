/**
 * @import {
 *   ConstraintOptionsResult,
 *   KeyOptions
 * } from '../../../types/ddlProvider'
 */

const { wrapInQuotes } = require('../../../utils/general');

/**
 * Build constraint option fragments for Db2 for z/OS. Only constraint names are modeled; LUW-only clauses are ignored.
 *
 * @param {KeyOptions} params Constraint options.
 * @returns {ConstraintOptionsResult} Constraint fragments.
 */
const getOptionsString = ({ constraintName }) => {
	const constraintString = constraintName ? ` CONSTRAINT ${wrapInQuotes(constraintName.trim())}` : '';

	return {
		constraintString,
		statement: '',
	};
};

module.exports = {
	getOptionsString,
};
