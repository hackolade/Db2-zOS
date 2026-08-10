/**
 * @import {
 *   BasicValueParams,
 *   OptionsByConfigsParams
 * } from '../../../types/ddlProvider'
 */

const lodash = require('lodash');

/**
 * Build a basic prefixed/postfixed value formatter.
 *
 * @template T
 * @param {BasicValueParams<T>} params Formatter options.
 * @returns {(value: T) => string} Value formatter.
 */
const getBasicValue = ({ prefix = '', postfix = '', modifier }) => {
	/**
	 * Identity passthrough.
	 *
	 * @param {T} value Input value.
	 * @returns {T} Same value.
	 */
	const resolveModifier =
		modifier ??
		/**
		 * @param {T} value Input value.
		 * @returns {T} Same value.
		 */
		(value => value);
	/**
	 * Format a value.
	 *
	 * @param {T} value Input value.
	 * @returns {string} Formatted value.
	 */
	return value =>
		value
			? [prefix, String(resolveModifier(value)), postfix]
					.filter(Boolean)
					.map(part => lodash.trim(part))
					.join(' ')
			: '';
};

/**
 * @param {OptionsByConfigsParams} params Configs and data.
 * @returns {string} Options string.
 */
const getOptionsByConfigs = ({ configs, data }) => {
	const statements = configs
		.filter(({ key }) => lodash.get(data, key))
		.map(({ key, getValue }) => getValue(lodash.get(data, key), data))
		.filter(Boolean)
		.join('\n\t');

	return getBasicValue({ prefix: ' ' })(statements);
};

module.exports = {
	getBasicValue,
	getOptionsByConfigs,
};
