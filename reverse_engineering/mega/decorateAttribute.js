/**
 * @import {
 *   AttributeProperties,
 *   AttributeTypeProperties,
 *   MegaAttribute,
 *   MegaColumn,
 *   MegaKeyMembership,
 *   MegaType
 * } from '../types/megaProvider'
 */

const { randomUUID } = require('node:crypto');
const { TYPE_BY_MEGA_NAME } = require('./typeByMegaName');

const MODES_WITH_LENGTH = new Set([
	'char',
	'varchar',
	'clob',
	'graphic',
	'vargraphic',
	'dbclob',
	'binary',
	'varbinary',
	'blob',
]);

const MODES_WITH_PRECISION_AND_SCALE = new Set(['decimal']);

/**
 * @param {object} params - Params.
 * @param {MegaAttribute} [params.megaAttribute] - MEGA attribute.
 * @param {MegaColumn} [params.megaColumn] - MEGA column.
 * @param {MegaKeyMembership[]} [params.megaKeys] - Keys made of this field alone.
 * @returns {AttributeProperties} - Field properties.
 */
const decorateAttribute = ({ megaAttribute, megaColumn, megaKeys }) => {
	const megaType = megaAttribute?.type ?? megaColumn?.type;
	const typeProperties = megaType ? mapType({ megaType }) : {};
	const keyProperties = singleKeyProperties({ megaKeys: megaKeys ?? [] });

	return { ...typeProperties, ...keyProperties };
};

/**
 * @param {object} params - Params.
 * @param {MegaKeyMembership[]} params.megaKeys - Keys made of this field alone.
 * @returns {AttributeProperties} - Key properties.
 */
const singleKeyProperties = ({ megaKeys }) => {
	const primaryKey = megaKeys.find(({ megaKey }) => megaKey.keyType === 'primary');

	if (primaryKey) {
		return {
			primaryKey: true,
			required: true,
			...namedKeyOptions({
				keyName: primaryKey.megaKey.name,
				optionsKeyword: 'primaryKeyOptions',
			}),
		};
	}

	const uniqueKey = megaKeys.find(({ megaKey }) => megaKey.keyType === 'unique');

	if (uniqueKey) {
		return {
			unique: true,
			alternateKey: true,
			...namedKeyOptions({
				keyName: uniqueKey.megaKey.name,
				optionsKeyword: 'uniqueKeyOptions',
			}),
		};
	}

	return {};
};

/**
 * @param {object} params - Params.
 * @param {string | undefined} params.keyName - Key name.
 * @param {'primaryKeyOptions' | 'uniqueKeyOptions'} params.optionsKeyword - Property that holds the constraint name.
 * @returns {AttributeProperties} - Constraint name, when the key has one.
 */
const namedKeyOptions = ({ keyName, optionsKeyword }) => {
	if (!keyName) {
		return {};
	}

	return { [optionsKeyword]: { id: randomUUID(), constraintName: keyName } };
};

/**
 * @param {object} params - Params.
 * @param {MegaType} params.megaType - MEGA type.
 * @returns {AttributeProperties} - Type properties, or none when the type is not mapped.
 */
const mapType = ({ megaType }) => {
	const fieldType = fieldTypeOf({ megaType });

	if (!fieldType) {
		return {};
	}

	return withSize({ fieldType, megaType });
};

/**
 * @param {object} params - Params.
 * @param {MegaType} params.megaType - MEGA type.
 * @returns {AttributeTypeProperties | undefined} - Mapped field type.
 */
const fieldTypeOf = ({ megaType }) => {
	const fromPivot = megaType.pivot ? lookupType({ name: megaType.pivot }) : undefined;
	const fromName = lookupType({ name: megaType.name });

	return fromPivot ?? fromName;
};

/**
 * @param {object} params - Params.
 * @param {string} params.name - MEGA type name.
 * @returns {AttributeTypeProperties | undefined} - Mapped field type.
 */
const lookupType = ({ name }) => {
	const typeName = name.replace(/\s*\([^)]*\)\s*$/u, '');

	return TYPE_BY_MEGA_NAME[typeName] ?? TYPE_BY_MEGA_NAME[typeName.toUpperCase()];
};

/**
 * @param {object} params - Params.
 * @param {AttributeTypeProperties} params.fieldType - Mapped type.
 * @param {MegaType} params.megaType - Size MEGA stated.
 * @returns {AttributeProperties} - Type properties with length, precision, or scale when MEGA stated them.
 */
const withSize = ({ fieldType, megaType }) => {
	const { mode } = fieldType;

	if (mode && MODES_WITH_LENGTH.has(mode) && megaType.length !== undefined) {
		return { ...fieldType, length: megaType.length };
	}

	if (mode && MODES_WITH_PRECISION_AND_SCALE.has(mode)) {
		return withPrecisionAndScale({ fieldType, megaType });
	}

	if (mode === 'float' && megaType.length !== undefined) {
		return { ...fieldType, precision: megaType.length };
	}

	if (mode === 'decfloat' && megaType.length !== undefined) {
		return { ...fieldType, precision: String(megaType.length) };
	}

	if (mode === 'timestamp') {
		return { ...fieldType, fractSecPrecision: megaType.length };
	}

	return { ...fieldType };
};

/**
 * @param {object} params - Params.
 * @param {AttributeTypeProperties} params.fieldType - Decimal type.
 * @param {MegaType} params.megaType - Size of the decimal type.
 * @returns {AttributeProperties} - Decimal properties. MEGA length is the precision and MEGA decimal is the scale.
 */
const withPrecisionAndScale = ({ fieldType, megaType }) => {
	const { length, decimal } = megaType;

	if (length === undefined && decimal === undefined) {
		return { ...fieldType };
	}

	return {
		...fieldType,
		...(length !== undefined && { precision: length }),
		...(decimal !== undefined && { scale: decimal }),
	};
};

module.exports = {
	decorateAttribute,
};
