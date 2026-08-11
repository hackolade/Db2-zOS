/**
 * @import {
 *   HydratedColumn,
 *   LengthWithMultiplierParams,
 *   ScalePrecisionParams
 * } from '../../../types/ddlProvider'
 */

const isNumber = require('lodash/isNumber');
const toUpper = require('lodash/toUpper');
const {
	DATA_TYPES_WITH_LENGTH_MULTIPLIER,
	DATA_TYPES_WITH_LENGTH,
	DATA_TYPES_WITH_PRECISION,
	DATA_TYPES_WITH_CHARACTER_SUBTYPE,
	DATA_TYPES_WITH_CCSID,
	DATA_TYPES_WITH_INLINE_LENGTH,
	DATA_TYPE,
} = require('../../../../shared/constants/types');

/**
 * Add length with multiplier clause.
 *
 * @param {LengthWithMultiplierParams} params Type params.
 * @returns {string} Type clause.
 */
const addLengthWithMultiplier = ({ type, length, lengthSemantics }) => {
	return ` ${type}(${length}${toUpper(lengthSemantics)})`;
};

/**
 * Add length clause.
 *
 * @param {{ type: string; length: number }} params Type params.
 * @returns {string} Type clause.
 */
const addLength = ({ type, length }) => {
	return ` ${type}(${length})`;
};

/**
 * Add scale and precision clause.
 *
 * @param {ScalePrecisionParams} params Type params.
 * @returns {string} Type clause.
 */
const addScalePrecision = ({ type, precision, scale }) => {
	if (isNumber(scale)) {
		return ` ${type}(${precision ?? '*'},${scale})`;
	}

	if (isNumber(precision)) {
		return ` ${type}(${precision})`;
	}

	return ` ${type}`;
};

/**
 * Add precision clause.
 *
 * @param {{ type: string; precision: number }} params Type params.
 * @returns {string} Type clause.
 */
const addPrecision = ({ type, precision }) => {
	if (isNumber(precision)) {
		return ` ${type}(${precision})`;
	}
	return ` ${type}`;
};

/**
 * Build TIMESTAMP type clause.
 *
 * @param {{ fractSecPrecision?: number; withTimeZone?: boolean }} params Timestamp params.
 * @returns {string} Type clause.
 */
const getTimestampType = ({ fractSecPrecision, withTimeZone }) => {
	const fractSecPrecisionString = isNumber(fractSecPrecision) ? `(${fractSecPrecision})` : '';
	const timeZoneString = withTimeZone ? ' WITH TIME ZONE' : '';

	return ` TIMESTAMP${fractSecPrecisionString}${timeZoneString}`;
};

/**
 * Build character subtype clause.
 *
 * @param {{ characterSubtype?: string }} params Character subtype.
 * @returns {string} Subtype clause.
 */
const getCharacterSubtypeClause = ({ characterSubtype }) => {
	if (!characterSubtype) {
		return '';
	}

	return ` FOR ${toUpper(characterSubtype)} DATA`;
};

/**
 * Build CCSID clause.
 *
 * @param {{ ccsid?: number }} params CCSID value.
 * @returns {string} CCSID clause.
 */
const getCcsidClause = ({ ccsid }) => {
	if (!isNumber(ccsid)) {
		return '';
	}

	return ` CCSID ${ccsid}`;
};

/**
 * Build INLINE LENGTH clause.
 *
 * @param {{ inlineLength?: number }} params Inline length.
 * @returns {string} Inline length clause.
 */
const getInlineLengthClause = ({ inlineLength }) => {
	if (!isNumber(inlineLength)) {
		return '';
	}

	return ` INLINE LENGTH ${inlineLength}`;
};

/**
 * Check length multiplier support.
 *
 * @param {{ type: string }} params Column type.
 * @returns {boolean} Whether type supports length multiplier.
 */
const canHaveLengthMultiplier = ({ type }) => DATA_TYPES_WITH_LENGTH_MULTIPLIER.includes(type);

/**
 * Check length support.
 *
 * @param {{ type: string }} params Column type.
 * @returns {boolean} Whether type supports length.
 */
const canHaveLength = ({ type }) => DATA_TYPES_WITH_LENGTH.includes(type);

/**
 * Check precision support.
 *
 * @param {{ type: string }} params Column type.
 * @returns {boolean} Whether type supports precision.
 */
const canHavePrecision = ({ type }) => DATA_TYPES_WITH_PRECISION.includes(type);

/**
 * Check scale support.
 *
 * @param {{ type: string }} params Column type.
 * @returns {boolean} Whether type supports scale.
 */
const canHaveScale = ({ type }) => type === DATA_TYPE.decimal;

/**
 * Check TIMESTAMP type.
 *
 * @param {{ type: string }} params Column type.
 * @returns {boolean} Whether type is TIMESTAMP.
 */
const isTimestamp = ({ type }) => type === DATA_TYPE.timestamp;

/**
 * Check ROWID type.
 *
 * @param {{ type: string }} params Column type.
 * @returns {boolean} Whether type is ROWID.
 */
const isRowid = ({ type }) => type === DATA_TYPE.rowid;

/**
 * Check character subtype support.
 *
 * @param {{ type: string }} params Column type.
 * @returns {boolean} Whether type supports character subtype.
 */
const canHaveCharacterSubtype = ({ type }) => DATA_TYPES_WITH_CHARACTER_SUBTYPE.includes(type);

/**
 * Check CCSID support.
 *
 * @param {{ type: string }} params Column type.
 * @returns {boolean} Whether type supports CCSID.
 */
const canHaveCcsid = ({ type }) => DATA_TYPES_WITH_CCSID.includes(type);

/**
 * Check inline length support.
 *
 * @param {{ type: string }} params Column type.
 * @returns {boolean} Whether type supports inline length.
 */
const canHaveInlineLength = ({ type }) => DATA_TYPES_WITH_INLINE_LENGTH.includes(type);

/**
 * Build column type DDL fragment.
 *
 * @param {HydratedColumn} columnDefinition Column definition.
 * @returns {string} Column type DDL.
 */
const getColumnType = ({
	type,
	length,
	lengthSemantics,
	precision,
	scale,
	fractSecPrecision,
	withTimeZone,
	isUDTRef,
	schemaName,
	characterSubtype,
	ccsid,
	inlineLength,
}) => {
	const hasLength = isNumber(length);
	let typeStatement = '';

	if (isRowid({ type })) {
		typeStatement = ` ${type}`;
	} else if (hasLength && lengthSemantics && canHaveLengthMultiplier({ type }) && canHaveLength({ type })) {
		typeStatement = addLengthWithMultiplier({ type, length, lengthSemantics });
	} else if (hasLength && canHaveLength({ type })) {
		typeStatement = addLength({ type, length });
	} else if (canHavePrecision({ type }) && canHaveScale({ type })) {
		typeStatement = addScalePrecision({ type, precision, scale });
	} else if (canHavePrecision({ type }) && isNumber(precision)) {
		typeStatement = addPrecision({ type, precision });
	} else if (isTimestamp({ type })) {
		typeStatement = getTimestampType({ fractSecPrecision, withTimeZone });
	} else if (isUDTRef && schemaName) {
		typeStatement = ` "${schemaName}"."${type}"`;
	} else {
		typeStatement = ` ${type}`;
	}

	const characterSubtypeClause = canHaveCharacterSubtype({ type })
		? getCharacterSubtypeClause({ characterSubtype })
		: '';
	const ccsidClause = canHaveCcsid({ type }) ? getCcsidClause({ ccsid }) : '';
	const inlineLengthClause = canHaveInlineLength({ type }) ? getInlineLengthClause({ inlineLength }) : '';

	return `${typeStatement}${characterSubtypeClause}${ccsidClause}${inlineLengthClause}`;
};

module.exports = {
	getColumnType,
};
