/**
 * @import {
 *   ColumnCommentParams,
 *   CommentStatementParams,
 *   HydratedColumn
 * } from '../../../types/ddlProvider'
 */

const lodash = require('lodash');
const templates = require('../../templates');
const { assignTemplates } = require('../../../utils/assignTemplates');
const { wrapInQuotes, commentIfDeactivated, wrapInSingleQuotes } = require('../../../utils/general');

/** @enum {string} */
const OBJECT_TYPE = {
	schema: 'SCHEMA',
	column: 'COLUMN',
	table: 'TABLE',
};

/** @enum {string} */
const COMMENT_MODE = {
	set: 'set',
	remove: 'remove',
};

/**
 * Escape single quotes in a description.
 *
 * @param {string} description Description text.
 * @returns {string} Escaped description.
 */
const escapeSpecialCharacters = description => description.replaceAll("'", "''");

/**
 * Build a COMMENT ON statement.
 *
 * @param {CommentStatementParams} params Comment params.
 * @returns {string} Comment statement.
 */
const getCommentStatement = ({ objectName, objectType, description, mode = COMMENT_MODE.set }) => {
	if (mode === COMMENT_MODE.set && !description) {
		return '';
	}

	return assignTemplates({
		template: templates.comment,
		templateData: {
			objectType,
			objectName: lodash.trim(objectName),
			comment: wrapInSingleQuotes({ name: escapeSpecialCharacters(description ?? '') }),
		},
	});
};

/**
 * Build a column comment statement.
 *
 * @param {ColumnCommentParams} params Column comment params.
 * @returns {string} Comment statement.
 */
const getColumnCommentStatement = ({ tableName, columnName, description }) => {
	const objectName = tableName + '.' + wrapInQuotes(columnName);
	return getCommentStatement({
		objectName,
		objectType: OBJECT_TYPE.column,
		description,
		mode: COMMENT_MODE.set,
	});
};

/**
 * Build a table comment statement.
 *
 * @param {{ tableName: string; description?: string }} params Table comment params.
 * @returns {string} Comment statement.
 */
const getTableCommentStatement = ({ tableName, description }) => {
	return getCommentStatement({
		objectName: tableName,
		objectType: OBJECT_TYPE.table,
		description,
		mode: COMMENT_MODE.set,
	});
};

/**
 * Build a schema comment statement.
 *
 * @param {{ schemaName: string; description?: string }} params Schema comment params.
 * @returns {string} Comment statement.
 */
const getSchemaCommentStatement = ({ schemaName, description }) => {
	return getCommentStatement({
		objectName: schemaName,
		objectType: OBJECT_TYPE.schema,
		description,
		mode: COMMENT_MODE.set,
	});
};

/**
 * Build column comments for a table.
 *
 * @param {{ tableName: string; columnDefinitions?: HydratedColumn[] }} params Column definitions.
 * @returns {string} Joined comment statements.
 */
const getColumnComments = ({ tableName, columnDefinitions }) => {
	const columns = columnDefinitions ?? [];
	return columns
		.filter(columnDefinition => columnDefinition.comment)
		.map(columnDefinition => {
			const comment = getColumnCommentStatement({
				tableName,
				columnName: columnDefinition.name,
				description: columnDefinition.comment,
			});

			return commentIfDeactivated(comment, { isActivated: columnDefinition.isActivated ?? true });
		})
		.join('\n');
};

module.exports = {
	getColumnCommentStatement,
	getSchemaCommentStatement,
	getTableCommentStatement,
	getColumnComments,
};
