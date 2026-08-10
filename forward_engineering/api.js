const { generateContainerScript } = require('./api/generateContainerScript');
const { isDropInStatements } = require('./api/isDropInStatements');
const { applyToInstance } = require('./api/applyToInstance');
const { generateScript } = require('./api/generateScript');

module.exports = {
	generateScript,

	/**
	 * Generate view script stub.
	 *
	 * @param {unknown} _data Script data.
	 * @param {unknown} _logger Logger.
	 * @param {unknown} _callback Callback.
	 * @param {unknown} _app App instance.
	 * @returns {never} Always throws.
	 */
	generateViewScript(_data, _logger, _callback, _app) {
		throw new Error('Not implemented');
	},

	generateContainerScript,

	/**
	 * Get databases stub.
	 *
	 * @param {unknown} _connectionInfo Connection info.
	 * @param {unknown} _logger Logger.
	 * @param {unknown} _callback Callback.
	 * @param {unknown} _app App instance.
	 * @returns {never} Always throws.
	 */
	getDatabases(_connectionInfo, _logger, _callback, _app) {
		throw new Error('Not implemented');
	},

	applyToInstance,

	/**
	 * Test connection stub.
	 *
	 * @returns {never} Always throws.
	 */
	testConnection() {
		throw new Error('Not implemented');
	},

	isDropInStatements,
};
