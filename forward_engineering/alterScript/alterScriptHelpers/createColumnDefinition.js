/**
 * @import {
 *   AlterCollection,
 *   AlterColumn
 * } from '../../types/alterScript'
 * @import {
 *   ColumnDefinitionInput,
 *   DdlProvider,
 *   HydratedColumn,
 *   SchemaData
 * } from '../../types/ddlProvider'
 */

const lodash = require('lodash');
const { getEntityName } = require('../../utils/general');

/**
 * Resolve whether a column is nullable from the required list of its parent.
 *
 * @param {AlterCollection} parentJsonSchema Parent collection schema.
 * @param {string} propertyName Column name.
 * @returns {boolean} Whether the column is nullable.
 */
const isNullable = (parentJsonSchema, propertyName) => {
	if (!Array.isArray(parentJsonSchema.required)) {
		return true;
	}

	return !parentJsonSchema.required.includes(propertyName);
};

/**
 * Resolve the default value of a column.
 *
 * @param {AlterColumn} jsonSchema Column schema.
 * @returns {string | number | boolean | undefined} Default value.
 */
const getDefault = jsonSchema => {
	if (jsonSchema.default === null) {
		return 'NULL';
	}

	return jsonSchema.default ?? undefined;
};

/**
 * Resolve the length of a column.
 *
 * @param {AlterColumn} jsonSchema Column schema.
 * @returns {number | undefined} Length.
 */
const getLength = jsonSchema => {
	if (lodash.isNumber(jsonSchema.length)) {
		return jsonSchema.length;
	}

	if (lodash.isNumber(jsonSchema.maxLength)) {
		return jsonSchema.maxLength;
	}

	return void 0;
};

/**
 * Resolve the precision of a column.
 *
 * @param {AlterColumn} jsonSchema Column schema.
 * @returns {number | undefined} Precision.
 */
const getPrecision = jsonSchema => {
	if (lodash.isNumber(jsonSchema.precision)) {
		return jsonSchema.precision;
	}

	if (lodash.isNumber(jsonSchema.fractSecPrecision)) {
		return jsonSchema.fractSecPrecision;
	}

	return void 0;
};

/**
 * Resolve the type of a column, following user defined type references.
 *
 * @param {AlterColumn} jsonSchema Column schema.
 * @returns {string} Column type.
 */
const getType = jsonSchema => {
	if (jsonSchema.$ref) {
		return jsonSchema.$ref.split('/').pop() ?? '';
	}

	return jsonSchema.mode ?? jsonSchema.childType ?? jsonSchema.type ?? '';
};

/**
 * Build a hydrated column definition out of a delta model column.
 *
 * @param {{
 * 	name: string;
 * 	jsonSchema: AlterColumn;
 * 	parentJsonSchema: AlterCollection;
 * 	ddlProvider: DdlProvider;
 * 	schemaData: SchemaData;
 * }} params
 *   Column data.
 * @returns {HydratedColumn} Hydrated column.
 */
const createColumnDefinitionBySchema = ({ name, jsonSchema, parentJsonSchema, ddlProvider, schemaData }) => {
	/** @type {ColumnDefinitionInput} */
	const columnDefinition = {
		name,
		entityName: getEntityName(parentJsonSchema),
		type: getType(jsonSchema),
		nullable: isNullable(parentJsonSchema, name),
		default: getDefault(jsonSchema),
		length: getLength(jsonSchema),
		scale: lodash.isNumber(jsonSchema.scale) ? jsonSchema.scale : undefined,
		precision: getPrecision(jsonSchema),
		isActivated: jsonSchema.isActivated,
	};

	return ddlProvider.hydrateColumn({ columnDefinition, jsonSchema, schemaData });
};

module.exports = {
	createColumnDefinitionBySchema,
};
