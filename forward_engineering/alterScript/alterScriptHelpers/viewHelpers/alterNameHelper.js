/**
 * @import {
 *   AlterScriptDto,
 *   AlterView,
 *   MapPropertiesFn
 * } from '../../../types/alterScript'
 * @import {DdlProvider} from '../../../types/ddlProvider'
 */

const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const { getSchemaOfAlterCollection } = require('../../../utils/general');
const { createView, dropView } = require('./createDropViewHelper');

/**
 * Build the statements renaming a view. Db2 for z/OS has no RENAME VIEW, so the view is dropped and recreated.
 *
 * @param {AlterView} view View delta.
 * @param {DdlProvider} ddlProvider DDL provider.
 * @param {MapPropertiesFn} mapProperties Property mapper.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getRenameViewScriptDtos = (view, ddlProvider, mapProperties) => {
	const viewSchema = getSchemaOfAlterCollection(view);
	const { old: oldName, new: newName } = viewSchema.compMod?.name ?? {};

	if (!oldName || !newName || oldName === newName) {
		return [];
	}

	const dropScript = dropView({
		ddlProvider,
		viewSchema: { ...viewSchema, code: oldName, name: oldName },
	});
	const createScript = createView({ ddlProvider, mapProperties, view });

	return [createAlterScriptDto([dropScript], true, true), createAlterScriptDto([createScript], true, false)].filter(
		scriptDto => scriptDto !== undefined,
	);
};

module.exports = {
	getRenameViewScriptDtos,
};
