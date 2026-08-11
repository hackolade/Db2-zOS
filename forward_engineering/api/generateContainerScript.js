/**
 * @import {
 *   AlterScriptData,
 *   PluginCallback,
 *   PluginLogger
 * } from '../types/alterScript'
 * @import {App} from '../types/ddlProvider'
 */

const { buildContainerLevelAlterScript } = require('../alterScript/alterScriptBuilder');
const { toPluginError } = require('../utils/toPluginError');

/**
 * Generate container-level alter script from a delta model.
 *
 * Must never return without either throwing or invoking the callback: the studio resolves the script request only from
 * the callback and has no timeout, so a silent return hangs the UI.
 *
 * @param {AlterScriptData} data FE data.
 * @param {PluginLogger} logger Logger.
 * @param {PluginCallback} callback Callback.
 * @param {App} app App instance.
 * @returns {void}
 */
function generateContainerScript(data, logger, callback, app) {
	try {
		callback(null, buildContainerLevelAlterScript(data, app));
	} catch (error) {
		const pluginError = toPluginError(error);

		logger.log('error', pluginError, 'Db2 for z/OS Forward-Engineering Error');
		callback(pluginError);
	}
}

module.exports = {
	generateContainerScript,
};
