/** @import {SchemaSequence} from '../../../types/ddlProvider' */

const trim = require('lodash/trim');
const templates = require('../../templates');
const { assignTemplates } = require('../../../utils/assignTemplates');
const { getNamePrefixedWithSchemaName, setTab } = require('../../../utils/general');

const DEFAULT_CACHE_SIZE = 20;

/**
 * Check whether a numeric field is present, including 0.
 *
 * @param {{ value?: number }} params Value to test.
 * @returns {boolean} Whether the value is a number.
 */
const isPresentNumber = ({ value }) => typeof value === 'number' && !Number.isNaN(value);

/**
 * Check whether a sequence row has a usable name.
 *
 * @param {{ sequenceName?: string }} params Sequence name.
 * @returns {boolean} Whether the name is non-blank.
 */
const hasSequenceName = ({ sequenceName }) => Boolean(trim(sequenceName ?? ''));

/**
 * Build the AS clause.
 *
 * @param {{ dataType?: string; precision?: number }} params Type fields.
 * @returns {string} AS clause, or empty.
 */
const getAsClause = ({ dataType, precision }) => {
	if (!dataType) {
		return '';
	}

	if (dataType === 'DECIMAL' && isPresentNumber({ value: precision })) {
		return `AS DECIMAL(${precision},0)`;
	}

	return `AS ${dataType}`;
};

/**
 * Build a keyword-plus-number clause, treating 0 as present.
 *
 * @param {{ keyword: string; value?: number }} params Clause parts.
 * @returns {string} Clause, or empty.
 */
const getNumericClause = ({ keyword, value }) => {
	return isPresentNumber({ value }) ? `${keyword} ${value}` : '';
};

/**
 * Build MINVALUE / MAXVALUE or the matching NO-* clause.
 *
 * @param {{ noBound?: boolean; value?: number; noKeyword: string; valueKeyword: string }} params Bound fields.
 * @returns {string} Bound clause, or empty.
 */
const getBoundClause = ({ noBound, value, noKeyword, valueKeyword }) => {
	if (noBound) {
		return noKeyword;
	}

	return getNumericClause({ keyword: valueKeyword, value });
};

/**
 * Build the CACHE / NO CACHE clause.
 *
 * @param {{ cache?: string; cacheValue?: number }} params Cache fields.
 * @returns {string} Cache clause, or empty.
 */
const getCacheClause = ({ cache, cacheValue }) => {
	if (cache === 'CACHE') {
		const size = isPresentNumber({ value: cacheValue }) ? cacheValue : DEFAULT_CACHE_SIZE;
		return `CACHE ${size}`;
	}

	if (!cache) {
		return '';
	}

	return cache;
};

/**
 * Build CREATE SEQUENCE clauses in IBM order.
 *
 * @param {{ sequence: SchemaSequence }} params Sequence row.
 * @returns {string[]} Non-empty clauses.
 */
const getSequenceClauses = ({ sequence }) => {
	return [
		getAsClause({ dataType: sequence.dataType, precision: sequence.precision }),
		getNumericClause({ keyword: 'START WITH', value: sequence.start }),
		getNumericClause({ keyword: 'INCREMENT BY', value: sequence.increment }),
		getBoundClause({
			noBound: sequence.noMinValue,
			value: sequence.minValue,
			noKeyword: 'NO MINVALUE',
			valueKeyword: 'MINVALUE',
		}),
		getBoundClause({
			noBound: sequence.noMaxValue,
			value: sequence.maxValue,
			noKeyword: 'NO MAXVALUE',
			valueKeyword: 'MAXVALUE',
		}),
		sequence.cycle ?? '',
		getCacheClause({ cache: sequence.cache, cacheValue: sequence.cacheValue }),
		sequence.order ?? '',
	].filter(Boolean);
};

/**
 * Emit one CREATE SEQUENCE statement.
 *
 * @param {{ schemaName: string; sequence: SchemaSequence }} params Schema and row.
 * @returns {string} CREATE SEQUENCE DDL.
 */
const createSequenceScript = ({ schemaName, sequence }) => {
	const name = getNamePrefixedWithSchemaName({ name: sequence.sequenceName ?? '', schemaName });
	const clauses = getSequenceClauses({ sequence });
	const clausesBlock = clauses.length === 0 ? '' : `\n${setTab({ text: clauses.join('\n') })}`;

	return assignTemplates({
		template: templates.createSequence,
		templateData: {
			name,
			clauses: clausesBlock,
		},
	});
};

/**
 * Emit CREATE SEQUENCE statements for a schema’s sequence group.
 *
 * @param {{ schemaName?: string; sequences?: SchemaSequence[] }} params Hydrated schema fields.
 * @returns {string} Joined CREATE SEQUENCE DDL, or empty.
 */
const getSequencesScript = ({ schemaName = '', sequences = [] }) => {
	const sequenceRows = Array.isArray(sequences) ? sequences : [];

	return sequenceRows
		.filter(sequence => hasSequenceName({ sequenceName: sequence.sequenceName }))
		.map(sequence => createSequenceScript({ schemaName, sequence }))
		.join('\n\n');
};

module.exports = {
	getSequencesScript,
};
