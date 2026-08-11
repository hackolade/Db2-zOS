/**
 * @import {
 *   HydrateAuxiliaryTableParams,
 *   HydratedTable
 * } from '../../../types/ddlProvider'
 */

const { getNamePrefixedWithSchemaName } = require('../../../utils/general');
const { getName, getIdToNameHashTable } = require('../jsonSchema/jsonSchemaHelper');

/**
 * Hydrate auxiliary table options.
 *
 * @param {HydrateAuxiliaryTableParams} params Table data.
 * @returns {Partial<HydratedTable>} Auxiliary table data.
 */
const hydrateAuxiliaryTableData = ({ tableData, detailsTab }) => {
	const isAuxiliary = detailsTab.tableKind === 'auxiliary';

	if (!isAuxiliary) {
		return {};
	}

	const auxiliaryBaseTableJsonSchema = detailsTab.auxiliaryBaseTable
		? tableData.relatedSchemas?.[detailsTab.auxiliaryBaseTable]
		: undefined;
	const auxiliaryBaseTableSchemaName = auxiliaryBaseTableJsonSchema?.bucketName;
	const idToNameHashTable = getIdToNameHashTable({ jsonSchema: auxiliaryBaseTableJsonSchema });
	const auxiliaryBaseTableName = getName({ item: auxiliaryBaseTableJsonSchema });
	const auxiliaryBaseTable =
		auxiliaryBaseTableName &&
		getNamePrefixedWithSchemaName({
			name: auxiliaryBaseTableName,
			schemaName: auxiliaryBaseTableSchemaName,
		});
	const auxiliaryBaseColumnKey = detailsTab.auxiliaryBaseColumn?.[0]?.keyId;
	const auxiliaryBaseColumn = auxiliaryBaseColumnKey ? idToNameHashTable[auxiliaryBaseColumnKey] : undefined;

	return {
		auxiliary: isAuxiliary,
		auxiliaryAppend: detailsTab.auxiliaryAppend,
		auxiliaryPart: detailsTab.auxiliaryPart,
		auxiliaryBaseTable,
		auxiliaryBaseColumn,
	};
};

module.exports = {
	hydrateAuxiliaryTableData,
};
