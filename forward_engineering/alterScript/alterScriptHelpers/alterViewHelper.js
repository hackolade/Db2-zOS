/**
 * @import {
 *   AlterScriptDto,
 *   AlterView,
 *   MapPropertiesFn
 * } from '../../types/alterScript'
 * @import {
 *   App,
 *   AppModule,
 *   DdlProvider
 * } from '../../types/ddlProvider'
 */

const { getModifyViewCommentsScriptDtos } = require('./viewHelpers/commentsHelper');
const { getRenameViewScriptDtos } = require('./viewHelpers/alterNameHelper');
const { createAlterScriptDto } = require('../dto/alterScriptDto');
const { getSchemaOfAlterCollection } = require('../../utils/general');
const { createView, dropView } = require('./viewHelpers/createDropViewHelper');
const { getModifySelectStatementScriptDtos } = require('./viewHelpers/alterViewStatementHelper');

/**
 * Check whether a runtime-loaded module exposes the property mapper used by view generation.
 *
 * @param {AppModule} appModule Runtime-loaded module.
 * @returns {appModule is { mapProperties: MapPropertiesFn }} Whether the module exposes the mapper.
 */
const hasMapProperties = appModule => {
	return (
		typeof appModule === 'object' &&
		appModule !== null &&
		'mapProperties' in appModule &&
		typeof appModule.mapProperties === 'function'
	);
};

/**
 * Build the CREATE VIEW statement for an added view.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @param {MapPropertiesFn} mapProperties Property mapper.
 * @returns {(view: AlterView) => AlterScriptDto | undefined} Add view script builder.
 */
const getAddViewScriptDto = (ddlProvider, mapProperties) => view => {
	const script = createView({ ddlProvider, mapProperties, view });

	return createAlterScriptDto([script], true, false);
};

/**
 * Build the DROP VIEW statement for a deleted view.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @returns {(view: AlterView) => AlterScriptDto | undefined} Delete view script builder.
 */
const getDeleteViewScriptDto = ddlProvider => view => {
	const script = dropView({ ddlProvider, viewSchema: getSchemaOfAlterCollection(view) });

	return createAlterScriptDto([script], true, true);
};

/**
 * Build the statements for a modified view.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @param {MapPropertiesFn} mapProperties Property mapper.
 * @returns {(view: AlterView) => AlterScriptDto[]} Modify view script builder.
 */
const getModifyViewScriptDtos = (ddlProvider, mapProperties) => view => {
	return [
		...getRenameViewScriptDtos(view, ddlProvider, mapProperties),
		...getModifySelectStatementScriptDtos(view, ddlProvider, mapProperties),
		...getModifyViewCommentsScriptDtos(view),
	];
};

/**
 * Build the view script builders bound to a DDL provider.
 *
 * @param {App} app App instance.
 * @returns {{
 * 	getAddViewScriptDto: (view: AlterView) => AlterScriptDto | undefined;
 * 	getDeleteViewScriptDto: (view: AlterView) => AlterScriptDto | undefined;
 * 	getModifyViewScriptDtos: (view: AlterView) => AlterScriptDto[];
 * }}
 *   View script builders.
 */
const getViewsScripts = app => {
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);
	const ddlFeUtils = app.require('@hackolade/ddl-fe-utils');

	if (!hasMapProperties(ddlFeUtils)) {
		throw new TypeError('@hackolade/ddl-fe-utils does not expose mapProperties');
	}

	const { mapProperties } = ddlFeUtils;

	return {
		getAddViewScriptDto: getAddViewScriptDto(ddlProvider, mapProperties),
		getDeleteViewScriptDto: getDeleteViewScriptDto(ddlProvider),
		getModifyViewScriptDtos: getModifyViewScriptDtos(ddlProvider, mapProperties),
	};
};

module.exports = {
	getViewsScripts,
};
