/**
 * Generate container script stub.
 *
 * Must never return without either throwing or invoking the callback: the studio resolves the script request only from
 * the callback and has no timeout, so a silent return hangs the UI.
 *
 * @param {unknown} _data Script data.
 * @param {unknown} _logger Logger.
 * @param {(...args: unknown[]) => void} _callback Callback.
 * @param {unknown} _app App instance.
 * @returns {never} Always throws.
 */
function generateContainerScript(_data, _logger, _callback, _app) {
	// Comp-mode / alter script generation is out of scope for ddlProvider kickoff.
	throw new Error('Not implemented');
}

module.exports = {
	generateContainerScript,
};
