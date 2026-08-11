/** @import {IndexData} from '../../../types/ddlProvider' */

/**
 * Map UI index type to CREATE INDEX type clause.
 *
 * @param {{ index: IndexData }} params Index data.
 * @returns {string} Index type clause.
 */
const getIndexType = ({ index }) => {
	if (index.indxType === 'uniqueWhereNotNull') {
		return ' UNIQUE WHERE NOT NULL';
	}

	if (index.indxType === 'unique') {
		return ' UNIQUE';
	}

	return '';
};

module.exports = {
	getIndexType,
};
