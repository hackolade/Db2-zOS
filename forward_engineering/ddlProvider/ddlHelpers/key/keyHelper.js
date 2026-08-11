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

const isEmpty = require('lodash/isEmpty');
const trim = require('lodash/trim');
const { wrapInQuotes, commentIfDeactivated, checkIsKeyActivated } = require('../../../utils/general');
const { CONSTRAINT_POSTFIX } = require('../../../../shared/constants/constants');
const { getDefaultConstraintName } = require('./getDefaultConstraintName');

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
	return isUniqueKey({ column }) && !trim(column.uniqueKeyOptions?.constraintName);
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
	return isPrimaryKey({ column }) && !trim(column.primaryKeyOptions?.constraintName);
};

/**
 * Hydrate key constraint options. An unnamed key gets the same fallback name the alter script uses, so that a
 * constraint created here can be dropped again later.
 *
 * @param {HydrateKeyOptionsParams} params Key options.
 * @returns {KeyConstraint} Hydrated key options.
 */
const hydrateKeyOptions = ({ columnName, isActivated, options, keyType, entityName }) => {
	const postfix = keyType === KEY_TYPE.primaryKey ? CONSTRAINT_POSTFIX.primaryKey : CONSTRAINT_POSTFIX.uniqueKey;

	return {
		keyType,
		columns: [
			{
				name: columnName,
				isActivated: isActivated,
			},
		],
		constraintName: trim(options?.constraintName) || getDefaultConstraintName({ entityName, postfix }),
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
 * @param {{ jsonSchema: JsonSchema; entityName?: string }} params Schema and table name.
 * @returns {KeyConstraint[]} Primary key constraints.
 */
const getCompositePrimaryKeys = ({ jsonSchema, entityName }) => {
	if (!Array.isArray(jsonSchema.primaryKey)) {
		return [];
	}

	return jsonSchema.primaryKey
		.filter(primaryKey => !isEmpty(primaryKey.compositePrimaryKey))
		.map(primaryKey =>
			Object.assign(hydrateKeyOptions({ options: primaryKey, keyType: KEY_TYPE.primaryKey, entityName }), {
				columns: getKeys({ keys: primaryKey.compositePrimaryKey, jsonSchema }),
			}),
		);
};

/**
 * Get composite unique key constraints.
 *
 * @param {{ jsonSchema: JsonSchema; entityName?: string }} params Schema and table name.
 * @returns {KeyConstraint[]} Unique key constraints.
 */
const getCompositeUniqueKeys = ({ jsonSchema, entityName }) => {
	if (!Array.isArray(jsonSchema.uniqueKey)) {
		return [];
	}

	return jsonSchema.uniqueKey
		.filter(uniqueKey => !isEmpty(uniqueKey.compositeUniqueKey))
		.map(uniqueKey =>
			Object.assign(hydrateKeyOptions({ options: uniqueKey, keyType: KEY_TYPE.unique, entityName }), {
				columns: getKeys({ keys: uniqueKey.compositeUniqueKey, jsonSchema }),
			}),
		);
};

/**
 * Collect table-level key constraints.
 *
 * @param {{ jsonSchema: JsonSchema; entityName?: string }} params Schema and table name.
 * @returns {KeyConstraint[]} Key constraints.
 */
const getTableKeyConstraints = ({ jsonSchema, entityName }) => {
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
			entityName,
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
			entityName,
		});
	}).filter(constraint => constraint !== null);

	return [
		...primaryKeyConstraints,
		...getCompositePrimaryKeys({ jsonSchema, entityName }),
		...uniqueConstraints,
		...getCompositeUniqueKeys({ jsonSchema, entityName }),
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
		const activatedKeys = keys.filter(key => checkIsKeyActivated({ key })).map(key => wrapInQuotes(trim(key.name)));
		const deactivatedKeys = keys
			.filter(key => !checkIsKeyActivated({ key }))
			.map(key => wrapInQuotes(trim(key.name)));
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
	return keys.map(key => trim(key.name)).join(', ');
};

/**
 * Build ON DELETE / ENFORCED clauses for foreign keys.
 *
 * @param {ForeignKeyCustomPropertiesParams} params Custom properties.
 * @returns {string} Foreign key action clauses.
 */
const customPropertiesForForeignKey = ({ customProperties }) => {
	const properties = customProperties ?? {};
	const { relationshipOnDelete, relationshipEnforced } = properties;
	const relationshipOnDeleteClause = relationshipOnDelete ? ' ON DELETE ' + relationshipOnDelete : '';
	const relationshipEnforcedClause = relationshipEnforced ? ' ' + relationshipEnforced : '';

	return relationshipOnDeleteClause + relationshipEnforcedClause;
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
