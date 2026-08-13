/** @typedef {(error?: unknown, result?: unknown, info?: unknown) => void} Callback */

/**
 * Reverse engineering from a live instance is not implemented yet. The studio resolves these requests only from the
 * callback and has no timeout, so every stub has to answer rather than return silently.
 */
const NOT_IMPLEMENTED_MESSAGE = 'Reverse engineering from a Db2 for z/OS instance is not supported yet.';

/**
 * Disconnect stub. Nothing is ever connected, so this succeeds without doing any work.
 *
 * @param {unknown} _connectionInfo Connection info.
 * @param {unknown} _appLogger App logger.
 * @param {Callback} callback Callback.
 * @returns {void} Nothing; the result is delivered through the callback.
 */
const disconnect = (_connectionInfo, _appLogger, callback) => {
	callback();
};

/**
 * Schema names stub.
 *
 * @param {unknown} _connectionInfo Connection info.
 * @param {unknown} _appLogger App logger.
 * @param {Callback} callback Callback.
 * @param {unknown} _app App instance.
 * @returns {void} Nothing; the result is delivered through the callback.
 */
const getSchemaNames = (_connectionInfo, _appLogger, callback, _app) => {
	callback(new Error(NOT_IMPLEMENTED_MESSAGE));
};

/**
 * Collection names stub.
 *
 * @param {unknown} _connectionInfo Connection info.
 * @param {unknown} _appLogger App logger.
 * @param {Callback} callback Callback.
 * @param {unknown} _app App instance.
 * @returns {void} Nothing; the result is delivered through the callback.
 */
const getDbCollectionsNames = (_connectionInfo, _appLogger, callback, _app) => {
	callback(new Error(NOT_IMPLEMENTED_MESSAGE));
};

/**
 * Collections data stub.
 *
 * @param {unknown} _connectionInfo Connection info.
 * @param {unknown} _appLogger App logger.
 * @param {Callback} callback Callback.
 * @param {unknown} _app App instance.
 * @returns {void} Nothing; the result is delivered through the callback.
 */
const getDbCollectionsData = (_connectionInfo, _appLogger, callback, _app) => {
	callback(new Error(NOT_IMPLEMENTED_MESSAGE));
};

module.exports = {
	disconnect,
	getSchemaNames,
	getDbCollectionsNames,
	getDbCollectionsData,
};
