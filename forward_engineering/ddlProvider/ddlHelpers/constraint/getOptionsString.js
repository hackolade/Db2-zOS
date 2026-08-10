/**
 * @import {
 *   ConstraintOptionsResult,
 *   KeyOptions
 * } from '../../../types/ddlProvider'
 */

const { wrapInQuotes } = require('../../../utils/general');

/**
 * Build constraint option fragments.
 *
 * @param {KeyOptions} params Constraint options.
 * @returns {ConstraintOptionsResult} Constraint fragments.
 */
const getOptionsString = ({ constraintName, deferClause, rely, validate, indexClause, exceptionClause }) => {
	const constraintString = constraintName ? ` CONSTRAINT ${wrapInQuotes(constraintName.trim())}` : '';
	const statement = [deferClause, rely, indexClause, validate, exceptionClause]
		.filter(Boolean)
		.map(option => ` ${option}`)
		.join('');

	return {
		constraintString,
		statement,
	};
};

module.exports = {
	getOptionsString,
};
