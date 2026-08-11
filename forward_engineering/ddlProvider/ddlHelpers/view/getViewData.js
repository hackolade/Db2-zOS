/**
 * @import {
 *   HydratedViewColumn,
 *   ViewData
 * } from '../../../types/ddlProvider'
 */

const { wrapInQuotes, getNamePrefixedWithSchemaName } = require('../../../utils/general');

/**
 * Build a key expression with optional alias.
 *
 * @param {{ key?: HydratedViewColumn }} params Key object.
 * @returns {string} Key expression.
 */
const getKeyWithAlias = ({ key }) => {
	if (!key) {
		return '';
	}

	if (key.alias) {
		return `${wrapInQuotes(key.name)} as ${wrapInQuotes(key.alias)}`;
	}

	return wrapInQuotes(key.name);
};

/**
 * @param {{ keys?: HydratedViewColumn[] }} params View keys.
 * @returns {ViewData} View data.
 */
const getViewData = ({ keys }) => {
	if (!Array.isArray(keys)) {
		return { tables: [], columns: [] };
	}

	return keys.reduce(
		(result, key) => {
			if (!key.tableName) {
				result.columns.push({
					statement: getKeyWithAlias({ key }),
					isActivated: key.isActivated,
				});

				return result;
			}

			const tableName = getNamePrefixedWithSchemaName({
				name: key.tableName,
				schemaName: key.dbName,
			});

			if (!result.tables.includes(tableName)) {
				result.tables.push(tableName);
			}

			result.columns.push({
				statement: `${tableName}.${getKeyWithAlias({ key })}`,
				isActivated: key.isActivated,
			});

			return result;
		},
		/** @type {ViewData} */ ({
			tables: [],
			columns: [],
		}),
	);
};

module.exports = {
	getViewData,
};
