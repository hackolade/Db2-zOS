/** @import {IndexData} from '../../../types/ddlProvider' */

const { getNamePrefixedWithSchemaName } = require('../../../utils/general');

/**
 * Build a schema-qualified index name for CREATE INDEX.
 *
 * @param {{ index: IndexData }} params Index data.
 * @returns {string} Prefixed index name.
 */
const getIndexName = ({ index }) => {
	if (!index.indxName) {
		return '';
	}

	return ` ${getNamePrefixedWithSchemaName({ name: index.indxName, schemaName: index.schemaName })}`;
};

module.exports = {
	getIndexName,
};
