/**
 * @import {
 *   AlterCollection,
 *   AlterScriptDto,
 *   CheckConstraintHistoryEntry
 * } from '../../../types/alterScript'
 */

const uniq = require('lodash/uniq');
const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const {
	getFullCollectionName,
	wrapInQuotes,
	isParentContainerActivated,
	isObjectInDeltaModelActivated,
	getSchemaOfAlterCollection,
} = require('../../../utils/general');
const { assignTemplates } = require('../../../utils/assignTemplates');
const templates = require('../../../ddlProvider/templates');

/**
 * Build the ADD CHECK constraint statement.
 *
 * @param {{ tableName: string; constraintName: string; expression: string; enforced?: string }} params Statement parts.
 * @returns {string} Alter statement.
 */
const addCheckConstraint = ({ tableName, constraintName, expression, enforced }) => {
	return assignTemplates({
		template: templates.alterCheckConstraint,
		templateData: {
			tableName,
			constraintName,
			expression,
			enforced: enforced ? ` ${enforced}` : '',
		},
	});
};

/**
 * Build the DROP CHECK constraint statement.
 *
 * @param {{ tableName: string; constraintName: string }} params Statement parts.
 * @returns {string} Alter statement.
 */
const dropCheckConstraint = ({ tableName, constraintName }) => {
	return assignTemplates({
		template: templates.dropCheckConstraint,
		templateData: { tableName, constraintName },
	});
};

/**
 * Pair the previous and current version of every check constraint, keyed by its name.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {CheckConstraintHistoryEntry[]} Constraint history.
 */
const mapCheckConstraintNamesToChangeHistory = collection => {
	const checkConstraintHistory = collection.compMod?.chkConstr;

	if (!checkConstraintHistory) {
		return [];
	}

	const newConstraints = checkConstraintHistory.new ?? [];
	const oldConstraints = checkConstraintHistory.old ?? [];
	const constraintNames = uniq([...newConstraints, ...oldConstraints].map(constraint => constraint.chkConstrName));

	return constraintNames.map(chkConstrName => ({
		old: oldConstraints.find(constraint => constraint.chkConstrName === chkConstrName),
		new: newConstraints.find(constraint => constraint.chkConstrName === chkConstrName),
	}));
};

/**
 * Build the statements dropping constraints that no longer exist.
 *
 * @param {CheckConstraintHistoryEntry[]} constraintHistory Constraint history.
 * @param {string} fullTableName Fully qualified table name.
 * @returns {(AlterScriptDto | undefined)[]} Alter script DTOs.
 */
const getDropCheckConstraintScriptDtos = (constraintHistory, fullTableName) => {
	return constraintHistory
		.filter(historyEntry => historyEntry.old?.constrExpression && !historyEntry.new?.constrExpression)
		.map(historyEntry => {
			const script = dropCheckConstraint({
				tableName: fullTableName,
				constraintName: wrapInQuotes(historyEntry.old?.chkConstrName ?? ''),
			});

			return createAlterScriptDto([script], true, true);
		});
};

/**
 * Build the statements adding newly created constraints.
 *
 * @param {CheckConstraintHistoryEntry[]} constraintHistory Constraint history.
 * @param {string} fullTableName Fully qualified table name.
 * @returns {(AlterScriptDto | undefined)[]} Alter script DTOs.
 */
const getAddCheckConstraintScriptDtos = (constraintHistory, fullTableName) => {
	return constraintHistory
		.filter(historyEntry => historyEntry.new?.constrExpression && !historyEntry.old?.constrExpression)
		.map(historyEntry => {
			const script = addCheckConstraint({
				tableName: fullTableName,
				constraintName: wrapInQuotes(historyEntry.new?.chkConstrName ?? ''),
				expression: historyEntry.new?.constrExpression ?? '',
				enforced: historyEntry.new?.constrEnforced,
			});

			return createAlterScriptDto([script], true, false);
		});
};

/**
 * Build the statements recreating constraints whose expression or enforcement changed. Db2 for z/OS cannot alter a
 * check constraint in place, so it has to be dropped and added again.
 *
 * @param {CheckConstraintHistoryEntry[]} constraintHistory Constraint history.
 * @param {string} fullTableName Fully qualified table name.
 * @returns {(AlterScriptDto | undefined)[]} Alter script DTOs.
 */
const getUpdateCheckConstraintScriptDtos = (constraintHistory, fullTableName) => {
	return constraintHistory
		.filter(historyEntry => {
			if (!historyEntry.old?.constrExpression || !historyEntry.new?.constrExpression) {
				return false;
			}

			return (
				historyEntry.old.constrExpression !== historyEntry.new.constrExpression ||
				historyEntry.old.constrEnforced !== historyEntry.new.constrEnforced
			);
		})
		.flatMap(historyEntry => {
			const dropConstraintScript = dropCheckConstraint({
				tableName: fullTableName,
				constraintName: wrapInQuotes(historyEntry.old?.chkConstrName ?? ''),
			});
			const addConstraintScript = addCheckConstraint({
				tableName: fullTableName,
				constraintName: wrapInQuotes(historyEntry.new?.chkConstrName ?? ''),
				expression: historyEntry.new?.constrExpression ?? '',
				enforced: historyEntry.new?.constrEnforced,
			});

			return [
				createAlterScriptDto([dropConstraintScript], true, true),
				createAlterScriptDto([addConstraintScript], true, false),
			];
		});
};

/**
 * Build all check constraint statements for a collection.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifyCheckConstraintScriptDtos = collection => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const fullTableName = getFullCollectionName({ collectionSchema });
	const constraintHistory = mapCheckConstraintNamesToChangeHistory(collection);

	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isContainerActivated && isObjectInDeltaModelActivated(collection);

	return [
		...getAddCheckConstraintScriptDtos(constraintHistory, fullTableName),
		...getDropCheckConstraintScriptDtos(constraintHistory, fullTableName),
		...getUpdateCheckConstraintScriptDtos(constraintHistory, fullTableName),
	]
		.filter(scriptDto => scriptDto !== undefined)
		.map(scriptDto => ({ isActivated: isCollectionActivated, scripts: scriptDto.scripts }));
};

module.exports = {
	getModifyCheckConstraintScriptDtos,
};
