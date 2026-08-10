/**
 * @import {
 *   DividedConstraints,
 *   ForeignKeyStatement,
 *   KeyConstraint,
 *   TablePropsParams
 * } from '../../../types/ddlProvider'
 */

const templates = require('../../templates');
const { assignTemplates } = require('../../../utils/assignTemplates');
const {
	getColumnsList,
	checkAllKeysDeactivated,
	commentIfDeactivated,
	wrapInQuotes,
	divideIntoActivatedAndDeactivated,
} = require('../../../utils/general');
const { getOptionsString } = require('../constraint/getOptionsString');
const { joinActivatedAndDeactivatedStatements } = require('../../../utils/joinActivatedAndDeactivatedStatements');

/**
 * Extract constraint statement text.
 *
 * @param {ForeignKeyStatement} key Constraint object.
 * @returns {string} Statement.
 */
const getKeyStatement = key => key.statement;

/**
 * Generate activated/deactivated constraints string.
 *
 * @param {{ dividedConstraints: DividedConstraints; isParentActivated: boolean }} params Constraint groups.
 * @returns {string} Constraints DDL fragment.
 */
const generateConstraintsString = ({ dividedConstraints, isParentActivated }) => {
	const { activatedItems, deactivatedItems } = dividedConstraints;
	const deactivatedItemsAsString = commentIfDeactivated(deactivatedItems.join(',\n\t'), {
		isActivated: !isParentActivated,
		isPartOfLine: true,
	});
	const activatedConstraints =
		activatedItems.length > 0 ? ',\n\t' + dividedConstraints.activatedItems.join(',\n\t') : '';

	const deactivatedConstraints = deactivatedItems.length > 0 ? '\n\t' + deactivatedItemsAsString : '';

	return activatedConstraints + deactivatedConstraints;
};

/**
 * Create a key constraint statement.
 *
 * @param {{ keyData: KeyConstraint; isParentActivated: boolean }} params Key data.
 * @returns {ForeignKeyStatement} Constraint statement.
 */
const createKeyConstraint = ({ keyData, isParentActivated }) => {
	const isAllColumnsDeactivated = checkAllKeysDeactivated({ keys: keyData.columns });
	const columns = getColumnsList(keyData.columns, isAllColumnsDeactivated, isParentActivated);
	const options = getOptionsString(keyData).statement;
	const constraintName = keyData.constraintName ? `CONSTRAINT ${wrapInQuotes(keyData.constraintName)} ` : '';

	return {
		statement: assignTemplates({
			template: templates.createKeyConstraint,
			templateData: {
				constraintName,
				keyType: keyData.keyType,
				columns,
				options,
			},
		}),
		isActivated: !isAllColumnsDeactivated,
	};
};

/**
 * Divide key constraints by activation.
 *
 * @param {{ keyConstraints: KeyConstraint[]; isActivated: boolean }} params Key constraints.
 * @returns {DividedConstraints} Divided constraints.
 */
const getDividedKeysConstraints = ({ keyConstraints, isActivated }) => {
	const keys = keyConstraints.map(keyData => createKeyConstraint({ keyData, isParentActivated: isActivated }));

	return divideIntoActivatedAndDeactivated({ items: keys, mapFunction: getKeyStatement });
};

/**
 * Divide foreign key constraints by activation.
 *
 * @param {{ foreignKeyConstraints: ForeignKeyStatement[] }} params Foreign keys.
 * @returns {DividedConstraints} Divided constraints.
 */
const getDividedForeignKeyConstraints = ({ foreignKeyConstraints }) => {
	return divideIntoActivatedAndDeactivated({ items: foreignKeyConstraints, mapFunction: getKeyStatement });
};

/**
 * Build table properties DDL fragment.
 *
 * @param {TablePropsParams} params Table props input.
 * @returns {string} Table props DDL.
 */
const getTableProps = ({ columns, foreignKeyConstraints, keyConstraints, checkConstraints, isActivated }) => {
	const dividedKeysConstraints = getDividedKeysConstraints({ keyConstraints, isActivated });
	const dividedForeignKeyConstraints = getDividedForeignKeyConstraints({ foreignKeyConstraints });
	const keyConstraintsString = generateConstraintsString({
		dividedConstraints: dividedKeysConstraints,
		isParentActivated: isActivated,
	});
	const foreignKeyConstraintsString = generateConstraintsString({
		dividedConstraints: dividedForeignKeyConstraints,
		isParentActivated: isActivated,
	});
	const checkConstraintsString = generateConstraintsString({
		dividedConstraints: { activatedItems: checkConstraints ?? [], deactivatedItems: [] },
		isParentActivated: isActivated,
	});
	const columnsString = joinActivatedAndDeactivatedStatements({ statements: columns, indent: '\n\t' });

	const tableProps = assignTemplates({
		template: templates.createTableProps,
		templateData: {
			columns: columnsString,
			foreignKeyConstraints: foreignKeyConstraintsString,
			keyConstraints: keyConstraintsString,
			checkConstraints: checkConstraintsString,
		},
	});

	return tableProps ? `\n(\n\t${tableProps}\n)` : '';
};

module.exports = {
	getTableProps,
};
