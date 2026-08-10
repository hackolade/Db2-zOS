/**
 * @import {
 *   ForeignKeyCustomPropertiesParams,
 *   HydrateKeyOptionsParams,
 *   JsonSchema,
 *   JsonSchemaColumn,
 *   KeyConstraint,
 *   KeyConstraintColumn,
 *   KeyPropertyLookupParams,
 *   KeyRef
 * } from '../../../types/ddlProvider'
 */

const lodash = require('lodash');
const { wrapInQuotes, commentIfDeactivated, checkIsKeyActivated } = require('../../../utils/general');

/** @enum {string} */
const KEY_TYPE = {
	primaryKey: 'PRIMARY KEY',
	unique: 'UNIQUE',
};

/**
 * Map schema properties with an iteratee.
 *
 * @param {JsonSchema} jsonSchema JSON schema.
 * @param {(entry: [string, JsonSchemaColumn]) => KeyConstraint | null} iteratee Mapper.
 * @returns {(KeyConstraint | null)[]} Mapped properties.
 */
const mapProperties = (jsonSchema, iteratee) => {
	return Object.entries(jsonSchema.properties ?? {}).map(entry => iteratee(entry));
};

/**
 * Check whether a column is a unique key.
 *
 * @param {{ column: JsonSchemaColumn }} params Column.
 * @returns {boolean} Whether unique key.
 */
const isUniqueKey = ({ column }) => {
	return Boolean(!column.compositeUniqueKey && column.unique);
};

/**
 * Check whether a unique key is inline.
 *
 * @param {{ column: JsonSchemaColumn }} params Column.
 * @returns {boolean} Whether inline unique.
 */
const isInlineUnique = ({ column }) => {
	return isUniqueKey({ column }) && !lodash.trim(column.uniqueKeyOptions?.constraintName);
};

/**
 * Check whether a column is a primary key.
 *
 * @param {{ column: JsonSchemaColumn }} params Column.
 * @returns {boolean} Whether primary key.
 */
const isPrimaryKey = ({ column }) => {
	return Boolean(!column.compositeUniqueKey && !column.compositePrimaryKey && column.primaryKey);
};

/**
 * Check whether a primary key is inline.
 *
 * @param {{ column: JsonSchemaColumn }} params Column.
 * @returns {boolean} Whether inline primary key.
 */
const isInlinePrimaryKey = ({ column }) => {
	return isPrimaryKey({ column }) && !lodash.trim(column.primaryKeyOptions?.constraintName);
};

/**
 * Hydrate key constraint options.
 *
 * @param {HydrateKeyOptionsParams} params Key options.
 * @returns {KeyConstraint} Hydrated key options.
 */
const hydrateKeyOptions = ({ columnName, isActivated, options, keyType }) => {
	return {
		keyType,
		columns: [
			{
				name: columnName,
				isActivated: isActivated,
			},
		],
		constraintName: options?.constraintName,
	};
};

/**
 * Find property name by key id.
 *
 * @param {KeyPropertyLookupParams} params Lookup params.
 * @returns {string | undefined} Property name.
 */
const findName = ({ keyId, properties }) => {
	return Object.keys(properties).find(name => properties[name].GUID === keyId);
};

/**
 * Check whether a key is activated.
 *
 * @param {KeyPropertyLookupParams} params Lookup params.
 * @returns {boolean} Activation flag.
 */
const checkIfActivated = ({ keyId, properties }) => {
	const key = Object.values(properties).find(prop => prop.GUID === keyId);

	return key?.isActivated ?? true;
};

/**
 * Resolve key columns from refs.
 *
 * @param {{ jsonSchema: JsonSchema; keys?: KeyRef[] }} params Keys input.
 * @returns {KeyConstraintColumn[]} Resolved keys.
 */
const getKeys = ({ jsonSchema, keys }) => {
	const keyList = keys ?? [];
	const properties = jsonSchema.properties ?? {};
	return keyList.map(key => {
		const name = findName({ keyId: key.keyId, properties });
		const isActivated = checkIfActivated({ keyId: key.keyId, properties });

		return {
			name,
			isActivated,
			type: key.type,
		};
	});
};

/**
 * Get composite primary key constraints.
 *
 * @param {{ jsonSchema: JsonSchema }} params Schema.
 * @returns {KeyConstraint[]} Primary key constraints.
 */
const getCompositePrimaryKeys = ({ jsonSchema }) => {
	if (!Array.isArray(jsonSchema.primaryKey)) {
		return [];
	}

	return jsonSchema.primaryKey
		.filter(primaryKey => !lodash.isEmpty(primaryKey.compositePrimaryKey))
		.map(primaryKey =>
			Object.assign(hydrateKeyOptions({ options: primaryKey, keyType: KEY_TYPE.primaryKey }), {
				columns: getKeys({ keys: primaryKey.compositePrimaryKey, jsonSchema }),
			}),
		);
};

/**
 * Get composite unique key constraints.
 *
 * @param {{ jsonSchema: JsonSchema }} params Schema.
 * @returns {KeyConstraint[]} Unique key constraints.
 */
const getCompositeUniqueKeys = ({ jsonSchema }) => {
	if (!Array.isArray(jsonSchema.uniqueKey)) {
		return [];
	}

	return jsonSchema.uniqueKey
		.filter(uniqueKey => !lodash.isEmpty(uniqueKey.compositeUniqueKey))
		.map(uniqueKey =>
			Object.assign(hydrateKeyOptions({ options: uniqueKey, keyType: KEY_TYPE.unique }), {
				columns: getKeys({ keys: uniqueKey.compositeUniqueKey, jsonSchema }),
			}),
		);
};

/**
 * Collect table-level key constraints.
 *
 * @param {{ jsonSchema: JsonSchema }} params Schema.
 * @returns {KeyConstraint[]} Key constraints.
 */
const getTableKeyConstraints = ({ jsonSchema }) => {
	if (!jsonSchema.properties) {
		return [];
	}

	const uniqueConstraints = mapProperties(jsonSchema, ([name, column]) => {
		if (!isUniqueKey({ column }) || isInlineUnique({ column })) {
			return null;
		}
		return hydrateKeyOptions({
			columnName: name,
			isActivated: column.isActivated,
			options: column.uniqueKeyOptions,
			keyType: KEY_TYPE.unique,
		});
	}).filter(constraint => constraint !== null);

	const primaryKeyConstraints = mapProperties(jsonSchema, ([name, column]) => {
		if (!isPrimaryKey({ column }) || isInlinePrimaryKey({ column })) {
			return null;
		}
		return hydrateKeyOptions({
			columnName: name,
			isActivated: column.isActivated,
			options: column.primaryKeyOptions,
			keyType: KEY_TYPE.primaryKey,
		});
	}).filter(constraint => constraint !== null);

	return [
		...primaryKeyConstraints,
		...getCompositePrimaryKeys({ jsonSchema }),
		...uniqueConstraints,
		...getCompositeUniqueKeys({ jsonSchema }),
	];
};

/**
 * Convert foreign keys to a quoted list string.
 *
 * @param {{ keys: KeyConstraintColumn[] | string }} params Keys.
 * @returns {string} Keys string.
 */
const foreignKeysToString = ({ keys }) => {
	if (Array.isArray(keys)) {
		const activatedKeys = keys
			.filter(key => checkIsKeyActivated({ key }))
			.map(key => wrapInQuotes(lodash.trim(key.name)));
		const deactivatedKeys = keys
			.filter(key => !checkIsKeyActivated({ key }))
			.map(key => wrapInQuotes(lodash.trim(key.name)));
		const deactivatedKeysAsString =
			deactivatedKeys.length > 0
				? commentIfDeactivated(deactivatedKeys.join(', '), { isActivated: false, isPartOfLine: true })
				: '';

		return activatedKeys.join(', ') + deactivatedKeysAsString;
	}
	return keys;
};

/**
 * Convert active foreign keys to a list string.
 *
 * @param {{ keys: KeyConstraintColumn[] }} params Keys.
 * @returns {string} Keys string.
 */
const foreignActiveKeysToString = ({ keys }) => {
	return keys.map(key => lodash.trim(key.name)).join(', ');
};

/**
 * Build ON DELETE / ON UPDATE clauses for foreign keys.
 *
 * @param {ForeignKeyCustomPropertiesParams} params Custom properties.
 * @returns {string} Foreign key action clauses.
 */
const customPropertiesForForeignKey = ({ customProperties }) => {
	const properties = customProperties ?? {};
	const { relationshipOnDelete, relationshipOnUpdate } = properties;
	const relationshipOnDeleteClause = relationshipOnDelete ? ' ON DELETE ' + relationshipOnDelete : '';
	const relationshipOnUpdateClause = relationshipOnUpdate ? ' ON UPDATE ' + relationshipOnUpdate : '';

	return relationshipOnDeleteClause + relationshipOnUpdateClause;
};

module.exports = {
	getTableKeyConstraints,
	isInlineUnique,
	isInlinePrimaryKey,
	foreignKeysToString,
	foreignActiveKeysToString,
	customPropertiesForForeignKey,
	KEY_TYPE,
};
