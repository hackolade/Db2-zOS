/**
 * @import {
 *   CreateTableParams,
 *   HydratedPartitioning,
 *   InClauseParams,
 *   OptionConfig,
 *   TableOptionsBlock
 * } from '../../../types/ddlProvider'
 */

const isNumber = require('lodash/isNumber');
const toUpper = require('lodash/toUpper');
const { wrapInQuotes, columnMapToStringWithOrder } = require('../../../utils/general');
const { getOptionsByConfigs, getBasicValue } = require('../options/getOptionsByConfigs');

/**
 * Build IN clause for table options.
 *
 * @param {InClauseParams} params IN clause params.
 * @returns {string} IN clause.
 */
const getInClause = ({ inClauseType, databaseName, table_tablespace_name, acceleratorName }) => {
	if (inClauseType === 'tablespace') {
		if (databaseName && table_tablespace_name) {
			return `IN ${databaseName}.${table_tablespace_name}`;
		}
		if (table_tablespace_name) {
			return `IN ${table_tablespace_name}`;
		}
		return '';
	}

	if (inClauseType === 'database') {
		return databaseName ? `IN DATABASE ${databaseName}` : '';
	}

	if (inClauseType === 'accelerator') {
		return acceleratorName ? `IN ACCELERATOR ${acceleratorName}` : '';
	}

	return '';
};

/**
 * Build structured table options.
 *
 * @param {{ tableOptions?: TableOptionsBlock; inClauseType?: string }} params Table options.
 * @returns {string} Options string.
 */
const getStructuredTableOptions = ({ tableOptions, inClauseType }) => {
	const options = tableOptions ?? {};
	if (inClauseType === 'accelerator') {
		return '';
	}

	const isExistingTablespace = inClauseType === 'tablespace';

	/** @type {OptionConfig[]} */
	const configs = [
		{
			key: 'editProc',
			/**
			 * Format EDITPROC option.
			 *
			 * @param {string} value Edit proc name.
			 * @returns {string} Option clause.
			 */
			getValue: value => {
				const rowAttributes = options.editProcRowAttributes ? ` ${options.editProcRowAttributes}` : '';
				return `EDITPROC ${value}${rowAttributes}`;
			},
		},
		{
			key: 'validProc',
			getValue: getBasicValue({ prefix: 'VALIDPROC' }),
		},
		{
			key: 'audit',
			getValue: getBasicValue({ prefix: 'AUDIT' }),
		},
		{
			key: 'obid',
			/**
			 * Format OBID option.
			 *
			 * @param {number} value OBID value.
			 * @returns {string} Option clause.
			 */
			getValue: value => (isNumber(value) ? `OBID ${value}` : ''),
		},
		{
			key: 'dataCapture',
			getValue: getBasicValue({ prefix: 'DATA CAPTURE' }),
		},
		{
			key: 'withRestrictOnDrop',
			/**
			 * Format WITH RESTRICT ON DROP option.
			 *
			 * @param {boolean} value Flag.
			 * @returns {string} Option clause.
			 */
			getValue: value => (value ? 'WITH RESTRICT ON DROP' : ''),
		},
		{
			key: 'ccsid',
			getValue: getBasicValue({ prefix: 'CCSID' }),
		},
		{
			key: 'volatile',
			/**
			 * Format VOLATILE option.
			 *
			 * @param {string} value Volatile mode.
			 * @returns {string} Option clause.
			 */
			getValue: value => {
				if (value === 'VOLATILE') {
					return 'VOLATILE';
				}
				if (value === 'NOT VOLATILE') {
					return 'NOT VOLATILE';
				}
				return '';
			},
		},
		{
			key: 'logged',
			/**
			 * Format LOGGED option.
			 *
			 * @param {string} value Logged value.
			 * @returns {string} Option clause.
			 */
			getValue: value => (isExistingTablespace ? '' : (value ?? '')),
		},
		{
			key: 'compress',
			/**
			 * Format COMPRESS option.
			 *
			 * @param {string} value Compress mode.
			 * @returns {string} Option clause.
			 */
			getValue: value => (isExistingTablespace ? '' : value ? `COMPRESS ${value}` : ''),
		},
		{
			key: 'append',
			getValue: getBasicValue({ prefix: 'APPEND' }),
		},
		{
			key: 'dssize',
			/**
			 * Format DSSIZE option.
			 *
			 * @param {number} value Size in G.
			 * @returns {string} Option clause.
			 */
			getValue: value => (isExistingTablespace || !isNumber(value) ? '' : `DSSIZE ${value} G`),
		},
		{
			key: 'bufferPool',
			/**
			 * Format BUFFERPOOL option.
			 *
			 * @param {string} value Buffer pool name.
			 * @returns {string} Option clause.
			 */
			getValue: value => (isExistingTablespace ? '' : value ? `BUFFERPOOL ${value}` : ''),
		},
		{
			key: 'memberCluster',
			/**
			 * Format MEMBER CLUSTER option.
			 *
			 * @param {boolean} value Flag.
			 * @returns {string} Option clause.
			 */
			getValue: value => (isExistingTablespace || !value ? '' : 'MEMBER CLUSTER'),
		},
		{
			key: 'trackMod',
			/**
			 * Format TRACKMOD option.
			 *
			 * @param {string} value Trackmod mode.
			 * @returns {string} Option clause.
			 */
			getValue: value => (isExistingTablespace ? '' : value ? `TRACKMOD ${value}` : ''),
		},
		{
			key: 'pageNum',
			/**
			 * Format PAGENUM option.
			 *
			 * @param {string} value Page number mode.
			 * @returns {string} Option clause.
			 */
			getValue: value => (value ? `PAGENUM ${value}` : ''),
		},
		{
			key: 'keyLabelMode',
			/**
			 * Format KEY LABEL option.
			 *
			 * @param {string} value Key label mode.
			 * @returns {string} Option clause.
			 */
			getValue: value => {
				if (value === 'NO KEY LABEL') {
					return 'NO KEY LABEL';
				}
				if (value === 'KEY LABEL' && options.keyLabelName) {
					return `KEY LABEL ${options.keyLabelName}`;
				}
				return '';
			},
		},
	];

	const data = {
		...options,
		withRestrictOnDrop: options.withRestrictOnDrop ? true : undefined,
		memberCluster: options.memberCluster ? true : undefined,
	};

	return getOptionsByConfigs({ configs, data });
};

/**
 * Build partitioning clause.
 *
 * @param {{ partitioning?: HydratedPartitioning }} params Partitioning data.
 * @returns {string} Partitioning clause.
 */
const getPartitioningClause = ({ partitioning }) => {
	if (!partitioning?.partitionBy) {
		return '';
	}

	if (partitioning.partitionBy === 'SIZE') {
		if (!isNumber(partitioning.everySize)) {
			return '';
		}
		return `PARTITION BY SIZE EVERY ${partitioning.everySize} G`;
	}

	if (partitioning.partitionBy === 'RANGE') {
		// NULLS LAST belongs to each partition-expression, not to the key list as a whole.
		const nullsLast = partitioning.nullsLast ? ' NULLS LAST' : '';
		const keyColumns = (partitioning.partitionKey ?? [])
			.map(key => columnMapToStringWithOrder(key) + nullsLast)
			.join(', ');

		if (!keyColumns) {
			return '';
		}

		const partitions = (partitioning.partitions ?? [])
			.filter(partition => isNumber(partition.partitionNumber) && partition.endingAt)
			.map(partition => {
				const inclusive = partition.inclusive ? ' INCLUSIVE' : '';
				return `PARTITION ${partition.partitionNumber} ENDING AT (${partition.endingAt})${inclusive}`;
			});

		const partitionsClause = partitions.length > 0 ? ` (\n\t\t${partitions.join(',\n\t\t')}\n\t)` : '';

		return `PARTITION BY RANGE (${keyColumns})${partitionsClause}`;
	}

	return '';
};

/**
 * Build the AS (fullselect) clause and refresh/maintenance options of a materialized query table.
 *
 * @param {Partial<CreateTableParams>} tableData Table data.
 * @returns {string} MQT clause.
 */
const getMqtClause = ({ mqtQuery, mqtDataOption, mqtRefresh, mqtMaintainedBy, mqtQueryOptimization }) => {
	if (!mqtQuery) {
		return '';
	}

	const refresh = mqtRefresh ? `REFRESH ${mqtRefresh}` : '';
	const maintainedBy = mqtMaintainedBy ? `MAINTAINED BY ${mqtMaintainedBy}` : '';

	return [`AS (${mqtQuery})`, mqtDataOption, refresh, maintainedBy, mqtQueryOptimization]
		.filter(Boolean)
		.join('\n\t');
};

/**
 * Build full table options clause.
 *
 * @param {Partial<CreateTableParams>} tableData Table data.
 * @returns {string} Table options DDL.
 */
const getTableOptions = tableData => {
	if (tableData.auxiliary) {
		/** @type {OptionConfig[]} */
		const configs = [
			{
				key: 'auxiliaryBaseTable',
				getValue: getBasicValue({ prefix: 'STORES' }),
			},
			{
				key: 'auxiliaryBaseColumn',
				getValue: getBasicValue({ prefix: 'COLUMN', modifier: wrapInQuotes }),
			},
			{
				key: 'auxiliaryAppend',
				getValue: getBasicValue({
					prefix: 'APPEND',
					/**
					 * Uppercase auxiliary append value.
					 *
					 * @param {string} value Append value.
					 * @returns {string} Uppercased value.
					 */
					modifier: value => toUpper(value),
				}),
			},
			{
				key: 'auxiliaryPart',
				getValue: getBasicValue({ prefix: 'PART' }),
			},
		];

		return getOptionsByConfigs({ configs, data: tableData });
	}

	const mqtClause = tableData.tableKind === 'materializedQuery' ? getMqtClause(tableData) : '';
	const inClause = getInClause(tableData);
	const structuredOptions = getStructuredTableOptions(tableData);
	const partitioning = tableData.inClauseType === 'accelerator' ? '' : getPartitioningClause(tableData);
	const tableProperties = tableData.tableProperties ?? '';

	const statements = [mqtClause, inClause, structuredOptions.trim(), partitioning, tableProperties]
		.filter(Boolean)
		.join('\n\t');

	return statements ? ` ${statements}` : '';
};

module.exports = {
	getTableOptions,
	getInClause,
	getPartitioningClause,
	getMqtClause,
};
