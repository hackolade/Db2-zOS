/**
 * Detect drop statements.
 *
 * Reports that no DROP statements are produced, which holds while alter script generation is not implemented. The
 * callback must always be invoked: the studio has no timeout on this request.
 *
 * @param {unknown} _data Script data.
 * @param {unknown} _logger Logger.
 * @param {(...args: unknown[]) => void} callback Callback.
 * @param {unknown} _app App instance.
 * @returns {void}
 */
function isDropInStatements(_data, _logger, callback, _app) {
	callback(null, false);
}

module.exports = {
	isDropInStatements,
};
