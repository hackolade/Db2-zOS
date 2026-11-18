/**
 * @import {
 *   IndexData,
 *   IndexKeyRef
 * } from '../../../types/ddlProvider'
 */

const isNumber = require('lodash/isNumber');
const toUpper = require('lodash/toUpper');
const trim = require('lodash/trim');
const { getBasicValue, getOptionsByConfigs } = require('../options/getOptionsByConfigs');
const { wrapInQuotes, columnMapToStringWithOrder, checkAllKeysDeactivated, commentIfDeactivated } = require('../../../utils/general');

/**
 * Convert a value to upper case.
 *
 * @param {string} value Value to convert.
 * @returns {string} Upper-case value.
 */
const toUpperCase = value => toUpper(value);

/**
 * Format a value in upper case, with an optional prefix.
 *
 * @param {string} prefix Clause prefix.
 * @returns {(value: string) => string} Value formatter.
 */
const getUpperCaseValue = prefix => getBasicValue({ prefix, modifier: toUpperCase });

/**
 * @param {IndexData} index Index data.
 * @param {IndexKeyRef[]} keys Index keys.
 * @returns {boolean} Whether the whole index statement will be commented.
 */
const isWholeIndexCommented = (index, keys) =>
	index.isActivated === false ||
	index.isParentActivated === false ||
	checkAllKeysDeactivated({ keys: index.indxKey || keys });

/**
 * Build index key list clause.
 *
 * @param {IndexKeyRef[]} [keys] Index keys.
 * @param {IndexData} [index] Index data.
 * @returns {string} Keys clause.
 */
const getIndexKeys = (keys = [], index = {}) => {
	if (keys.length === 0) {
		return '';
	}

	const commentWholeIndex = isWholeIndexCommented(index, keys);
	const keysClause = keys
		.map(key => {
			const statement = columnMapToStringWithOrder({ name: key.name ?? '', type: key.type });

			if (commentWholeIndex) {
				return statement;
			}

			return commentIfDeactivated(statement, { isActivated: key.isActivated !== false, isPartOfLine: true });
		})
		.join(', ');

	return `(${keysClause})`;
};

/**
 * Build INCLUDE column list for unique indexes. An INCLUDE column list carries names only - the columns are not part of
 * the index key, so they take no ordering.
 *
 * @param {IndexKeyRef[] | undefined} keys Include keys.
 * @param {IndexData} index Index data.
 * @returns {string} INCLUDE clause.
 */
const getIncludeIndexKeys = (keys, index) => {
	const isUnique = index.indxType === 'unique' || index.indxType === 'uniqueWhereNotNull';
	if (!isUnique || index.indxNullKeys === 'exclude' || !keys?.length) {
		return '';
	}

	const commentWholeIndex = isWholeIndexCommented(index, keys);
	const includeIndexKeys = `(${keys
		.map(key => {
			const statement = wrapInQuotes(key.name ?? '');

			if (commentWholeIndex) {
				return statement;
			}

			return commentIfDeactivated(statement, { isActivated: key.isActivated !== false, isPartOfLine: true });
		})
		.join(', ')})`;

	return getBasicValue({ prefix: 'INCLUDE' })(includeIndexKeys);
};

/**
 * Build USING STOGROUP / VCAT clause.
 *
 * @param {unknown} _value Unused key value.
 * @param {IndexData} index Index data.
 * @returns {string} USING clause.
 */
const getUsingClause = (_value, index) => {
	if (index.indxUsingType === 'STOGROUP' && index.indxStogroup) {
		const parts = [`USING STOGROUP ${index.indxStogroup}`];
		if (isNumber(index.indxPriQty)) {
			parts.push(`PRIQTY ${index.indxPriQty}`);
		}
		if (isNumber(index.indxSecQty)) {
			parts.push(`SECQTY ${index.indxSecQty}`);
		}
		if (index.indxErase) {
			parts.push(`ERASE ${index.indxErase}`);
		}

		return parts.join(' ');
	}

	if (index.indxUsingType === 'VCAT' && index.indxVcat) {
		return `USING VCAT ${index.indxVcat}`;
	}

	return '';
};

/**
 * Build NULL KEYS clause.
 *
 * @param {string} value Include/exclude value.
 * @returns {string} NULL KEYS clause.
 */
const getNullKeysClause = value => {
	if (value === 'include') {
		return 'INCLUDE NULL KEYS';
	}
	if (value === 'exclude') {
		return 'EXCLUDE NULL KEYS';
	}

	return '';
};

/**
 * Build PIECESIZE clause.
 *
 * @param {unknown} value Piecesize value.
 * @param {IndexData} index Index data.
 * @returns {string} PIECESIZE clause.
 */
const getPiecesizeClause = (value, index) => {
	if (!isNumber(value)) {
		return '';
	}

	const unit = index.indxPiecesizeUnit ? ` ${index.indxPiecesizeUnit}` : '';

	return `PIECESIZE ${value}${unit}`;
};

/**
 * Build PARTITIONED clause.
 *
 * @param {boolean | undefined} value Partitioned flag.
 * @returns {string} PARTITIONED clause.
 */
const getPartitionedClause = value => (value ? 'PARTITIONED' : '');

/**
 * Append the raw index properties the user typed as an escape hatch for clauses the UI does not model.
 *
 * @param {string | undefined} value Raw DDL fragment.
 * @returns {string} Trimmed properties.
 */
const getIndexProperties = value => trim(value);

/**
 * Build index options clause for CREATE INDEX.
 *
 * @param {{ index: IndexData }} params Index data.
 * @returns {string} Index options.
 */
const getIndexOptions = ({ index }) => {
	const configs = [
		{ key: 'indxKey', getValue: getIndexKeys },
		{ key: 'indxIncludeKey', getValue: getIncludeIndexKeys },
		{ key: 'indxCluster', getValue: getUpperCaseValue('') },
		{ key: 'indxPartitioned', getValue: getPartitionedClause },
		{ key: 'indxPadded', getValue: getUpperCaseValue('') },
		{ key: 'indxUsingType', getValue: getUsingClause },
		{ key: 'indxFreepage', getValue: getBasicValue({ prefix: 'FREEPAGE' }) },
		{ key: 'indxPctfree', getValue: getBasicValue({ prefix: 'PCTFREE' }) },
		{ key: 'indxDefine', getValue: getUpperCaseValue('DEFINE') },
		{ key: 'indxCompress', getValue: getUpperCaseValue('COMPRESS') },
		{ key: 'indxNullKeys', getValue: getNullKeysClause },
		{ key: 'indxBufferPool', getValue: getBasicValue({ prefix: 'BUFFERPOOL' }) },
		{ key: 'indxClose', getValue: getUpperCaseValue('CLOSE') },
		{ key: 'indxDefer', getValue: getUpperCaseValue('DEFER') },
		{ key: 'indxPiecesize', getValue: getPiecesizeClause },
		{ key: 'indxCopy', getValue: getUpperCaseValue('COPY') },
		{ key: 'indxProperties', getValue: getIndexProperties },
	];

	return getOptionsByConfigs({ configs, data: index });
};

module.exports = {
	getIndexOptions,
};
