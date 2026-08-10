/**
 * Resolve table type clause.
 *
 * @param {{ auxiliary?: boolean }} params Table flags.
 * @returns {string} Table type clause.
 */
const getTableType = ({ auxiliary }) => {
	if (auxiliary) {
		return ' AUXILIARY';
	}

	return '';
};

module.exports = {
	getTableType,
};
