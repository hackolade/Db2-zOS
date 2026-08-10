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

const { alterUkConstraint, dropUkConstraint } = require('../../../ddlProvider/ddlHelpers/key/constraintsHelper');
const { KEY_TYPE } = require('../../../ddlProvider/ddlHelpers/key/keyHelper');
const { CONSTRAINT_POSTFIX } = require('../../../../shared/constants/constants');
const { getModifyKeyConstraintsScriptDtos } = require('./keyConstraintsHelper');

/**
 * Build an ADD UNIQUE statement.
 *
 * @param {{ tableName: string; isParentActivated: boolean; keyConfig: AlterKeyConfig }} params Statement data.
 * @returns {AlterKeyStatement} Key statement.
 */
const buildAlterStatement = ({ tableName, isParentActivated, keyConfig }) =>
	alterUkConstraint(tableName, isParentActivated, keyConfig);

/**
 * Build a DROP UNIQUE statement.
 *
 * @param {{ tableName: string; constraintName: string }} params Statement data.
 * @returns {string} Drop statement.
 */
const buildDropStatement = ({ tableName, constraintName }) => dropUkConstraint(tableName, constraintName);

/** @type {AlterKeyKind} */
const UNIQUE_KEY_KIND = {
	keyType: KEY_TYPE.unique,
	constraintPostfix: CONSTRAINT_POSTFIX.uniqueKey,
	compModProperty: 'uniqueKey',
	compositeKeyProperty: 'compositeUniqueKey',
	inlineKeyProperty: 'unique',
	keyOptionsProperty: 'uniqueKeyOptions',
	buildAlterStatement,
	buildDropStatement,
};

/**
 * Build all unique key statements for a collection.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifyUkConstraintsScriptDtos = collection =>
	getModifyKeyConstraintsScriptDtos({ collection, keyKind: UNIQUE_KEY_KIND });

module.exports = {
	getModifyUkConstraintsScriptDtos,
};
