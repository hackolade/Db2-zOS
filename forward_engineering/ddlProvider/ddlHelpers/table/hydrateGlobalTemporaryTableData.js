/**
 * @import {
 *   HydratedTable,
 *   HydrateGlobalTemporaryTableParams
 * } from '../../../types/ddlProvider'
 */

const { getNamePrefixedWithSchemaName } = require('../../../utils/general');
const { getName } = require('../jsonSchema/jsonSchemaHelper');

/**
 * Hydrate global temporary table options.
 *
 * @param {HydrateGlobalTemporaryTableParams} params Table data.
 * @returns {Partial<HydratedTable>} Global temporary table data.
 */
const hydrateGlobalTemporaryTableData = ({ tableData, detailsTab }) => {
	if (detailsTab.tableKind !== 'globalTemporary') {
		return {};
	}

	const likeTableJsonSchema = detailsTab.likeTable ? tableData.relatedSchemas?.[detailsTab.likeTable] : undefined;
	const likeTableSchemaName = likeTableJsonSchema?.bucketName;
	const likeTableName = getName({ item: likeTableJsonSchema });
	const likeTable =
		likeTableName &&
		getNamePrefixedWithSchemaName({
			name: likeTableName,
			schemaName: likeTableSchemaName,
		});

	return {
		likeTable,
	};
};

module.exports = {
	hydrateGlobalTemporaryTableData,
};
