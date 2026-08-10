/**
 * @import {
 *   DelimiterParams,
 *   JoinStatementsParams
 * } from '../types/ddlProvider'
 */

const { INLINE_COMMENT } = require('../../shared/constants/constants');

/**
 * Resolve statement delimiter.
 *
 * @param {DelimiterParams} params Delimiter options.
 * @returns {string} Delimiter string.
 */
const getDelimiter = ({ index, numberOfStatements, lastIndexOfActivatedStatement, delimiter }) => {
	const isLastStatement = index === numberOfStatements - 1;
	const isLastActivatedStatement = index === lastIndexOfActivatedStatement;

	if (isLastStatement) {
		return '';
	}

	if (isLastActivatedStatement) {
		return ' --' + delimiter;
	}

	return delimiter;
};

/**
 * Join activated and deactivated statements.
 *
 * @param {JoinStatementsParams} params Join options.
 * @returns {string} Joined statements.
 */
const joinActivatedAndDeactivatedStatements = ({ statements, delimiter = ',', indent = '\n' }) => {
	const lastIndexOfActivatedStatement = statements.findLastIndex(statement => !statement.startsWith(INLINE_COMMENT));
	const numberOfStatements = statements.length;

	return statements
		.map((statement, index) => {
			const currentDelimiter = getDelimiter({
				index,
				numberOfStatements,
				lastIndexOfActivatedStatement,
				delimiter,
			});

			return statement + currentDelimiter;
		})
		.join(indent);
};

module.exports = {
	joinActivatedAndDeactivatedStatements,
};
