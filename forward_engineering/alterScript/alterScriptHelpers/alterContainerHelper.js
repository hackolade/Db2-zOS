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
const { wrapInQuotes } = require('../../utils/general');
const { getModifiedCommentOnSchemaScriptDtos } = require('./containerHelpers/commentsHelper');

/**
 * Build the CREATE SCHEMA statement for an added container.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @returns {(containerData: AlterContainer) => AlterScriptDto | undefined} Add container script builder.
 */
const getAddContainerScriptDto = ddlProvider => containerData => {
	const script = ddlProvider.createSchema({
		schemaName: containerData.role.name,
		description: containerData.role.description,
		isActivated: containerData.role.isActivated,
	});

	return createAlterScriptDto([script], true, false);
};

/**
 * Build the DROP SCHEMA statement for a deleted container.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @returns {(containerData: AlterContainer) => AlterScriptDto | undefined} Delete container script builder.
 */
const getDeleteContainerScriptDto = ddlProvider => containerData => {
	const script = ddlProvider.dropSchema({ name: containerData.role.name });

	return createAlterScriptDto([script], true, true);
};

/**
 * Build the statements for a modified container.
 *
 * @returns {(containerData: AlterContainer) => AlterScriptDto[]} Modify container script builder.
 */
const getModifyContainerScriptDto = () => containerData => {
	const commentScriptDto = getModifiedCommentOnSchemaScriptDtos({
		schemaName: wrapInQuotes(containerData.role.name),
		compMod: containerData.role.compMod ?? {},
		isActivated: containerData.isActivated !== false,
	});

	return commentScriptDto ? [commentScriptDto] : [];
};

/**
 * Build the container-level script builders bound to a DDL provider.
 *
 * @param {App} app App instance.
 * @returns {{
 * 	getAddContainerScriptDto: (containerData: AlterContainer) => AlterScriptDto | undefined;
 * 	getDeleteContainerScriptDto: (containerData: AlterContainer) => AlterScriptDto | undefined;
 * 	getModifyContainerScriptDto: (containerData: AlterContainer) => AlterScriptDto[];
 * }}
 *   Container script builders.
 */
const getContainersScripts = app => {
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);

	return {
		getAddContainerScriptDto: getAddContainerScriptDto(ddlProvider),
		getDeleteContainerScriptDto: getDeleteContainerScriptDto(ddlProvider),
		getModifyContainerScriptDto: getModifyContainerScriptDto(),
	};
};

module.exports = {
	getContainersScripts,
};
