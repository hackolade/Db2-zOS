/**
 * Resolve table type clause.
 *
 * @param {{ auxiliary?: boolean; tableKind?: string }} params Table flags.
 * @returns {string} Table type clause.
 */
const getTableType = ({ auxiliary, tableKind }) => {
	if (auxiliary) {
		return ' AUXILIARY';
	}

	if (tableKind === 'globalTemporary') {
		return ' GLOBAL TEMPORARY';
	}

	return '';
};

module.exports = {
	getTableType,
};
