/**
 * @import {
 *   AlterCollection,
 *   AlterKeyKind,
 *   AlterScriptDto
 * } from '../../../types/alterScript'
 * @import {
 *   AlterKeyConfig,
 *   AlterKeyStatement
 * } from '../../../types/ddlProvider'
 */

const { alterPkConstraint, dropPK } = require('../../../ddlProvider/ddlHelpers/key/constraintsHelper');
const { KEY_TYPE } = require('../../../ddlProvider/ddlHelpers/key/keyHelper');
const { CONSTRAINT_POSTFIX } = require('../../../../shared/constants/constants');
const { getModifyKeyConstraintsScriptDtos } = require('./keyConstraintsHelper');

/**
 * Build an ADD PRIMARY KEY statement.
 *
 * @param {{ tableName: string; isParentActivated: boolean; keyConfig: AlterKeyConfig }} params Statement data.
 * @returns {AlterKeyStatement} Key statement.
 */
const buildAlterStatement = ({ tableName, isParentActivated, keyConfig }) =>
	alterPkConstraint(tableName, isParentActivated, keyConfig);

/**
 * Build a DROP PRIMARY KEY statement.
 *
 * @param {{ tableName: string }} params Statement data.
 * @returns {string} Drop statement.
 */
const buildDropStatement = ({ tableName }) => dropPK(tableName);

/** @type {AlterKeyKind} */
const PRIMARY_KEY_KIND = {
	keyType: KEY_TYPE.primaryKey,
	constraintPostfix: CONSTRAINT_POSTFIX.primaryKey,
	compModProperty: 'primaryKey',
	compositeKeyProperty: 'compositePrimaryKey',
	inlineKeyProperty: 'primaryKey',
	keyOptionsProperty: 'primaryKeyOptions',
	buildAlterStatement,
	// A table has at most one primary key, so Db2 for z/OS drops it without naming the constraint.
	buildDropStatement,
};

/**
 * Build all primary key statements for a collection.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifyPkConstraintsScriptDtos = collection =>
	getModifyKeyConstraintsScriptDtos({ collection, keyKind: PRIMARY_KEY_KIND });

module.exports = {
	getModifyPkConstraintsScriptDtos,
};
