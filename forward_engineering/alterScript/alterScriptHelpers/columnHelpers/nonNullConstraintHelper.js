/**
 * @import {
 *   AlterCollection,
 *   AlterScriptDto
 * } from '../../../types/alterScript'
 */

const lodash = require('lodash');
const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const {
	getFullCollectionName,
	wrapInQuotes,
	isObjectInDeltaModelActivated,
	isParentContainerActivated,
	getSchemaOfAlterCollection,
} = require('../../../utils/general');
const { assignTemplates } = require('../../../utils/assignTemplates');
const templates = require('../../../ddlProvider/templates');

/**
 * Build the SET NOT NULL statement.
 *
 * @param {string} tableName Fully qualified table name.
 * @param {string} columnName Quoted column name.
 * @returns {string} Alter statement.
 */
const setNotNullConstraint = (tableName, columnName) => {
	return assignTemplates({
		template: templates.alterNotNull,
		templateData: { tableName, columnName },
	});
};

/**
 * Build the DROP NOT NULL statement.
 *
 * @param {string} tableName Fully qualified table name.
 * @param {string} columnName Quoted column name.
 * @returns {string} Alter statement.
 */
const dropNotNullConstraint = (tableName, columnName) => {
	return assignTemplates({
		template: templates.dropNotNull,
		templateData: { tableName, columnName },
	});
};

/**
 * Build the NOT NULL statements for every column whose requiredness changed.
 *
 * @param {AlterCollection} collection Collection delta.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifyNonNullColumnsScriptDtos = collection => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const fullTableName = getFullCollectionName({ collectionSchema });

	const isContainerActivated = isParentContainerActivated(collection);
	const isCollectionActivated = isObjectInDeltaModelActivated(collection);

	const currentRequiredColumnNames = collection.required ?? [];
	const previousRequiredColumnNames = collection.role?.required ?? [];

	const columnNamesToAddNotNullConstraint = lodash.difference(
		currentRequiredColumnNames,
		previousRequiredColumnNames,
	);
	const columnNamesToRemoveNotNullConstraint = lodash.difference(
		previousRequiredColumnNames,
		currentRequiredColumnNames,
	);

	const columns = lodash.toPairs(collection.properties ?? {});

	const addNotNullConstraintScriptDtos = columns
		.filter(([name, jsonSchema]) => {
			const oldName = jsonSchema.compMod?.oldField?.name ?? name;
			return (
				columnNamesToAddNotNullConstraint.includes(name) &&
				!columnNamesToRemoveNotNullConstraint.includes(oldName)
			);
		})
		.map(([name, jsonSchema]) => {
			const isActivated = isContainerActivated && isCollectionActivated && Boolean(jsonSchema.isActivated);
			const script = setNotNullConstraint(fullTableName, wrapInQuotes(name));

			return createAlterScriptDto([script], isActivated, false);
		});

	const dropNotNullConstraintScriptDtos = columns
		.filter(([name, jsonSchema]) => {
			const oldName = jsonSchema.compMod?.oldField?.name ?? name;
			return (
				columnNamesToRemoveNotNullConstraint.includes(oldName) &&
				!columnNamesToAddNotNullConstraint.includes(name)
			);
		})
		.map(([name, jsonSchema]) => {
			const isActivated = isContainerActivated && isCollectionActivated && Boolean(jsonSchema.isActivated);
			const script = dropNotNullConstraint(fullTableName, wrapInQuotes(name));

			return createAlterScriptDto([script], isActivated, true);
		});

	return [...addNotNullConstraintScriptDtos, ...dropNotNullConstraintScriptDtos].filter(
		scriptDto => scriptDto !== undefined,
	);
};

module.exports = {
	getModifyNonNullColumnsScriptDtos,
};
