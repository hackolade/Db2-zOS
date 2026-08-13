/**
 * @import {
 *   ColumnDefaultParams,
 *   IdentityOptions
 * } from '../../../types/ddlProvider'
 */

const toUpper = require('lodash/toUpper');
const { DATA_TYPES_WITH_IDENTITY, DATA_TYPE } = require('../../../../shared/constants/types');

/**
 * Check whether a type can have identity.
 *
 * @param {{ type: string }} params Column type.
 * @returns {boolean} Whether identity is allowed.
 */
const canHaveIdentity = ({ type }) => {
	return DATA_TYPES_WITH_IDENTITY.includes(toUpper(type));
};

/**
 * Check whether a column is generated as identity.
 *
 * @param {{ identity?: IdentityOptions; type: string }} params Identity and type.
 * @returns {boolean} Whether generated as identity.
 */
const isGeneratedAsIdentity = ({ identity, type }) => {
	return canHaveIdentity({ type }) && !!identity?.generated;
};

/**
 * Check whether a type is ROWID.
 *
 * @param {{ type: string }} params Column type.
 * @returns {boolean} Whether type is ROWID.
 */
const isRowid = ({ type }) => toUpper(type) === DATA_TYPE.rowid;

/**
 * Build identity options clause.
 *
 * @param {IdentityOptions} params Identity options.
 * @returns {string} Identity options clause.
 */
const getIdentityOptions = ({ start, increment, minValue, maxValue, cycle, cache, cacheValue, order }) => {
	const startWith = start ? `START WITH ${start}` : '';
	const incrementBy = increment ? `INCREMENT BY ${increment}` : '';
	const minimumValue = minValue ? `MINVALUE ${minValue}` : '';
	const maximumValue = maxValue ? `MAXVALUE ${maxValue}` : '';
	const cacheOption = cacheValue ? `CACHE ${cacheValue}` : cache;

	return [startWith, incrementBy, cycle, minimumValue, maximumValue, cacheOption, order].filter(Boolean).join(', ');
};

/**
 * Build column default / identity / generated clause.
 *
 * @param {ColumnDefaultParams} params Column default params.
 * @returns {string} Default clause.
 */
const getColumnDefault = ({
	default: defaultValue,
	identity,
	type,
	generated,
	generatedColumn,
	generatedColumnType,
	columnGenerationExpression,
}) => {
	if (isRowid({ type }) && generated) {
		return ` GENERATED ${generated}`;
	}

	if (
		generatedColumn &&
		generatedColumnType &&
		['ROW BEGIN', 'ROW END', 'TRANSACTION START ID'].includes(generatedColumnType)
	) {
		return ` GENERATED ALWAYS AS ${generatedColumnType}`;
	}

	if (generatedColumn && columnGenerationExpression) {
		return ` GENERATED ALWAYS AS (${columnGenerationExpression})`;
	}

	const isGeneratedIdentity = isGeneratedAsIdentity({ identity, type });

	if (isGeneratedIdentity && identity) {
		const identityOptions = getIdentityOptions(identity);

		return ` GENERATED ${identity.generated} AS IDENTITY (${identityOptions})`;
	}

	if (defaultValue || defaultValue === 0) {
		return ` WITH DEFAULT ${defaultValue}`;
	}

	return '';
};

module.exports = {
	getColumnDefault,
};
