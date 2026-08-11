/**
 * @import {
 *   AlterScriptData,
 *   PluginCallback,
 *   PluginLogger
 * } from '../types/alterScript'
 * @import {App} from '../types/ddlProvider'
 */

const {
	doesContainerLevelAlterScriptContainDropStatements,
	doesEntityLevelAlterScriptContainDropStatements,
} = require('../alterScript/alterScriptBuilder');
const { toPluginError } = require('../utils/toPluginError');

/**
 * Detect whether the generated alter script contains statements that drop objects, so that the studio can warn the user
 * before applying it.
 *
 * Must never return without either throwing or invoking the callback: the studio resolves the request only from the
 * callback and has no timeout, so a silent return hangs the UI.
 *
 * @param {AlterScriptData} data FE data.
 * @param {PluginLogger} _logger Logger.
 * @param {PluginCallback} callback Callback.
 * @param {App} app App instance.
 * @returns {void}
 */
function isDropInStatements(data, _logger, callback, app) {
	try {
		const containsDropStatements =
			data.level === 'container'
				? doesContainerLevelAlterScriptContainDropStatements(data, app)
				: doesEntityLevelAlterScriptContainDropStatements(data, app);

		callback(null, containsDropStatements);
	} catch (error) {
		callback(toPluginError(error));
	}
}

module.exports = {
	isDropInStatements,
};
