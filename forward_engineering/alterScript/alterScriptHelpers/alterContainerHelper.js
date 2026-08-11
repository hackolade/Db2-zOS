/**
 * @import {
 *   AlterContainer,
 *   AlterScriptDto
 * } from '../../types/alterScript'
 * @import {
 *   App,
 *   DdlProvider
 * } from '../../types/ddlProvider'
 */

const { createAlterScriptDto } = require('../dto/alterScriptDto');

/**
 * Build the SET SCHEMA statement for an added container.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @returns {(containerData: AlterContainer) => AlterScriptDto | undefined} Add container script builder.
 */
const getAddContainerScriptDto = ddlProvider => containerData => {
	const script = ddlProvider.createSchema({
		schemaName: containerData.role.name,
		isActivated: containerData.role.isActivated,
	});

	return createAlterScriptDto([script], true, false);
};

/**
 * Build the container-level script builders bound to a DDL provider.
 *
 * @param {App} app App instance.
 * @returns {{
 * 	getAddContainerScriptDto: (containerData: AlterContainer) => AlterScriptDto | undefined;
 * }}
 *   Container script builders.
 */
const getContainersScripts = app => {
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);

	return {
		getAddContainerScriptDto: getAddContainerScriptDto(ddlProvider),
	};
};

module.exports = {
	getContainersScripts,
};
