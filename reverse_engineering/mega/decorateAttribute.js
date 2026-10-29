/** @typedef {import('./typeByMegaName').Db2MegaFieldType} Db2MegaFieldType */

/** @typedef {{ name: string; pivot?: string; length?: number; decimal?: number }} MegaType */

/** @typedef {{ name?: string; keyType: 'primary' | 'unique' }} MegaKey */

/** @typedef {{ megaKey: MegaKey }} MegaKeyMembership */

/** @typedef {{ type: MegaType }} MegaColumn */

/** @typedef {{ type: MegaType }} MegaAttribute */

/** @typedef {Readonly<Record<string, string | number | boolean | { readonly constraintName: string } | undefined>>} MegaTargetProperties */

/** @typedef {{ megaColumn?: MegaColumn; megaAttribute?: MegaAttribute; megaKeys?: MegaKeyMembership[] }} DecorateAttributeOptions */

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
 * @param {DecorateAttributeOptions} options Column or attribute, and the keys made of it alone.
 * @returns {MegaTargetProperties} Field properties.
 */
const decorateAttribute = ({ megaAttribute, megaColumn, megaKeys }) => {
	const megaType = megaAttribute?.type ?? megaColumn?.type;
	const typeProperties = megaType ? mapType({ megaType }) : {};
	const keyProperties = singleKeyProperties({ megaKeys: megaKeys ?? [] });

	return { ...typeProperties, ...keyProperties };
};

/**
 * @param {{ megaKeys: MegaKeyMembership[] }} options Keys made of this field alone.
 * @returns {MegaTargetProperties} Key properties.
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
 * @param {{ keyName: string | undefined; optionsKeyword: 'primaryKeyOptions' | 'uniqueKeyOptions' }} options Key name.
 * @returns {MegaTargetProperties} Constraint name, when the key has one.
 */
const namedKeyOptions = ({ keyName, optionsKeyword }) => {
	if (!keyName) {
		return {};
	}

	return { [optionsKeyword]: { constraintName: keyName } };
};

/**
 * @param {{ megaType: MegaType }} options MEGA type.
 * @returns {MegaTargetProperties} Type properties, or none when the type is not mapped.
 */
const mapType = ({ megaType }) => {
	const fieldType = fieldTypeOf({ megaType });

	if (!fieldType) {
		return {};
	}

	return withSize({ fieldType, megaType });
};

/**
 * @param {{ megaType: MegaType }} options MEGA type.
 * @returns {Db2MegaFieldType | undefined} Mapped field type.
 */
const fieldTypeOf = ({ megaType }) => {
	const fromPivot = megaType.pivot ? lookupType({ name: megaType.pivot }) : undefined;
	const fromName = lookupType({ name: megaType.name });

	return fromPivot ?? fromName;
};

/**
 * @param {{ name: string }} options MEGA type name.
 * @returns {Db2MegaFieldType | undefined} Mapped field type.
 */
const lookupType = ({ name }) => {
	const typeName = name.replace(/\s*\([^)]*\)\s*$/u, '');

	return TYPE_BY_MEGA_NAME[typeName] ?? TYPE_BY_MEGA_NAME[typeName.toUpperCase()];
};

/**
 * @param {{ fieldType: Db2MegaFieldType; megaType: MegaType }} options Mapped type and the size MEGA stated.
 * @returns {MegaTargetProperties} Type properties with length, precision, or scale when MEGA stated them.
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
 * @param {{ fieldType: Db2MegaFieldType; megaType: MegaType }} options Decimal type and its size.
 * @returns {MegaTargetProperties} Decimal properties. MEGA length is the precision and MEGA decimal is the scale.
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
