/**
 * @import {
 *   AlterKeyConfig,
 *   AlterKeyStatement
 * } from '../../../types/ddlProvider'
 */

const { checkAllKeysDeactivated, getColumnsList, wrapInQuotes } = require('../../../utils/general');
const { assignTemplates } = require('../../../utils/assignTemplates');
const templates = require('../../templates');

/**
 * Build key options for alter PK/UK statements. Db2 for z/OS accepts no constraint attributes beyond the name and the
 * column list, so the options fragment is always empty.
 *
 * @param {AlterKeyConfig} keyData Key data.
 * @param {boolean} isParentActivated Parent activation.
 * @returns {{ constraintName: string; columns: string; options: string; isActivated: boolean }} Template data and
 *   activation flag.
 */
const getKeyOptions = (keyData, isParentActivated) => {
	const constraintName = wrapInQuotes(keyData.name.trim());
	const columnsList = keyData.columns ?? [];
	const isAllColumnsDeactivated = checkAllKeysDeactivated({ keys: columnsList });
	const columns =
		columnsList.length === 0 ? '' : getColumnsList(columnsList, isAllColumnsDeactivated, isParentActivated);

	return {
		constraintName,
		columns,
		options: '',
		isActivated: !isAllColumnsDeactivated && isParentActivated,
	};
};

/**
 * Build ALTER TABLE ADD PRIMARY KEY statement.
 *
 * @param {string} tableName Table name.
 * @param {boolean} isParentActivated Parent activation.
 * @param {AlterKeyConfig} keyData Key data.
 * @returns {AlterKeyStatement} Statement and activation flag.
 */
const alterPkConstraint = (tableName, isParentActivated, keyData) => {
	const { isActivated, ...templateData } = getKeyOptions(keyData, isParentActivated);

	return {
		statement: assignTemplates({
			template: templates.alterPkConstraint,
			templateData: {
				tableName,
				...templateData,
			},
		}),
		isActivated,
	};
};

/**
 * Build DROP PRIMARY KEY statement.
 *
 * @param {string} tableName Table name.
 * @returns {string} DDL.
 */
const dropPK = tableName => {
	return assignTemplates({
		template: templates.dropPK,
		templateData: { tableName },
	});
};

/**
 * Build ALTER TABLE ADD UNIQUE statement.
 *
 * @param {string} tableName Table name.
 * @param {boolean} isParentActivated Parent activation.
 * @param {AlterKeyConfig} keyData Key data.
 * @returns {AlterKeyStatement} Statement and activation flag.
 */
const alterUkConstraint = (tableName, isParentActivated, keyData) => {
	const { isActivated, ...templateData } = getKeyOptions(keyData, isParentActivated);

	return {
		statement: assignTemplates({
			template: templates.alterUkConstraint,
			templateData: {
				tableName,
				...templateData,
			},
		}),
		isActivated,
	};
};

/**
 * Build DROP UNIQUE statement.
 *
 * @param {string} tableName Table name.
 * @param {string} constraintName Constraint name.
 * @returns {string} DDL.
 */
const dropUkConstraint = (tableName, constraintName) => {
	return assignTemplates({
		template: templates.dropUkConstraint,
		templateData: {
			tableName,
			constraintName,
		},
	});
};

module.exports = {
	alterPkConstraint,
	dropPK,
	alterUkConstraint,
	dropUkConstraint,
};
