/**
 * @import {
 *   ColumnCommentParams,
 *   CommentStatementParams,
 *   HydratedColumn
 * } from '../../../types/ddlProvider'
 */

const trim = require('lodash/trim');
const templates = require('../../templates');
const { assignTemplates } = require('../../../utils/assignTemplates');
const { wrapInQuotes, commentIfDeactivated, wrapInSingleQuotes } = require('../../../utils/general');

/** @enum {string} */
const OBJECT_TYPE = {
	schema: 'SCHEMA',
	column: 'COLUMN',
	table: 'TABLE',
	index: 'INDEX',
	type: 'TYPE',
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
			objectName: trim(objectName),
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
 * Build an index comment statement.
 *
 * @param {{ indexName: string; description?: string }} params Index comment params.
 * @returns {string} Comment statement.
 */
const getIndexCommentStatement = ({ indexName, description }) => {
	return getCommentStatement({
		objectName: indexName,
		objectType: OBJECT_TYPE.index,
		description,
		mode: COMMENT_MODE.set,
	});
};

/**
 * Build a drop-style index comment (empty comment).
 *
 * @param {{ indexName: string }} params Index name.
 * @returns {string} Comment statement.
 */
const dropIndexCommentStatement = ({ indexName }) => {
	return getCommentStatement({
		objectName: indexName,
		objectType: OBJECT_TYPE.index,
		description: '',
		mode: COMMENT_MODE.remove,
	});
};

/**
 * Build a distinct type comment statement.
 *
 * @param {{ typeName: string; description?: string }} params Type comment params.
 * @returns {string} Comment statement.
 */
const getTypeCommentStatement = ({ typeName, description }) => {
	return getCommentStatement({
		objectName: typeName,
		objectType: OBJECT_TYPE.type,
		description,
		mode: COMMENT_MODE.set,
	});
};

/**
 * Build a statement that removes a distinct type comment.
 *
 * @param {{ typeName: string }} params Type name.
 * @returns {string} Comment statement.
 */
const dropTypeCommentStatement = ({ typeName }) => {
	return getCommentStatement({
		objectName: typeName,
		objectType: OBJECT_TYPE.type,
		description: '',
		mode: COMMENT_MODE.remove,
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

/**
 * Build the statement removing a schema comment.
 *
 * @param {{ schemaName: string }} params Schema name.
 * @returns {string} Comment statement.
 */
const dropSchemaCommentStatement = ({ schemaName }) =>
	getCommentStatement({
		objectName: schemaName,
		objectType: OBJECT_TYPE.schema,
		description: '',
		mode: COMMENT_MODE.remove,
	});

/**
 * Build the statement removing a table comment.
 *
 * @param {{ tableName: string }} params Table name.
 * @returns {string} Comment statement.
 */
const dropTableCommentStatement = ({ tableName }) =>
	getCommentStatement({
		objectName: tableName,
		objectType: OBJECT_TYPE.table,
		description: '',
		mode: COMMENT_MODE.remove,
	});

/**
 * Build the statement removing a column comment.
 *
 * @param {{ tableName: string; columnName: string }} params Table and column names.
 * @returns {string} Comment statement.
 */
const dropTableColumnCommentStatement = ({ tableName, columnName }) =>
	getCommentStatement({
		objectName: tableName + '.' + wrapInQuotes(columnName),
		objectType: OBJECT_TYPE.column,
		description: '',
		mode: COMMENT_MODE.remove,
	});

module.exports = {
	getColumnCommentStatement,
	getSchemaCommentStatement,
	getTableCommentStatement,
	getIndexCommentStatement,
	dropIndexCommentStatement,
	getTypeCommentStatement,
	dropTypeCommentStatement,
	getColumnComments,
	dropSchemaCommentStatement,
	dropTableCommentStatement,
	dropTableColumnCommentStatement,
};
