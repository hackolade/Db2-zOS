/**
 * Apply DDL to instance stub.
 *
 * Must never return without either throwing or invoking the callback: the studio resolves the request only from the
 * callback and has no timeout, so a silent return hangs the UI.
 *
 * @param {unknown} _connectionInfo Connection info.
 * @param {unknown} _logger Logger.
 * @param {(...args: unknown[]) => void} _callback Callback.
 * @param {unknown} _app App instance.
 * @returns {never} Always throws.
 */
function applyToInstance(_connectionInfo, _logger, _callback, _app) {
	// Apply to instance is out of scope for ddlProvider kickoff.
	throw new Error('Not implemented');
}

module.exports = { applyToInstance };
