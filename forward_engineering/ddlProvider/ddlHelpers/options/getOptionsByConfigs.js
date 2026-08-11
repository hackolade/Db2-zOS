/**
 * @import {
 *   BasicValueParams,
 *   OptionsByConfigsParams
 * } from '../../../types/ddlProvider'
 */

const get = require('lodash/get');
const trim = require('lodash/trim');

/**
 * Check whether an option carries a value worth rendering. Zero is a meaningful setting for Db2 options such as
 * `PCTFREE 0` and `FREEPAGE 0`, so it cannot be filtered out along with the empty and disabled ones.
 *
 * @param {unknown} value Option value.
 * @returns {boolean} Whether the option has to be rendered.
 */
const hasOptionValue = value => value !== undefined && value !== null && value !== '' && value !== false;

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
		hasOptionValue(value)
			? [prefix, String(resolveModifier(value)), postfix]
					.filter(Boolean)
					.map(part => trim(part))
					.join(' ')
			: '';
};

/**
 * @param {OptionsByConfigsParams} params Configs and data.
 * @returns {string} Options string.
 */
const getOptionsByConfigs = ({ configs, data }) => {
	const statements = configs
		.filter(({ key }) => hasOptionValue(get(data, key)))
		.map(({ key, getValue }) => getValue(get(data, key), data))
		.filter(Boolean)
		.join('\n\t');

	return getBasicValue({ prefix: ' ' })(statements);
};

module.exports = {
	getBasicValue,
	getOptionsByConfigs,
};
