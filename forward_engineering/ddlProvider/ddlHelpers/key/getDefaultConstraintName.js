/**
 * Build the constraint name to fall back on when the user did not name a key.
 *
 * Both the CREATE and the ALTER path have to agree on it: if a table is created without an explicit constraint name,
 * Db2 for z/OS assigns a system-generated one, and a later `DROP UNIQUE` built from a name the plugin invented would
 * not match anything in the catalog.
 *
 * @param {{ entityName?: string; postfix: string }} params Table name and constraint postfix.
 * @returns {string} Constraint name, or an empty string when the table name is unknown.
 */
const getDefaultConstraintName = ({ entityName, postfix }) => (entityName ? [entityName, postfix].join('_') : '');

module.exports = {
	getDefaultConstraintName,
};
