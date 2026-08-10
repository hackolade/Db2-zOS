/**
 * @import {
 *   AlterScriptDto,
 *   AlterView,
 *   MapPropertiesFn
 * } from '../../../types/alterScript'
 * @import {DdlProvider} from '../../../types/ddlProvider'
 */

const { getSchemaOfAlterCollection } = require('../../../utils/general');
const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const { createView, dropView } = require('./createDropViewHelper');

/**
 * Build the statements applying a new select statement. Db2 for z/OS cannot alter the body of a view, so the view is
 * dropped and recreated.
 *
 * @param {AlterView} view View delta.
 * @param {DdlProvider} ddlProvider DDL provider.
 * @param {MapPropertiesFn} mapProperties Property mapper.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifySelectStatementScriptDtos = (view, ddlProvider, mapProperties) => {
	const viewSchema = getSchemaOfAlterCollection(view);
	const { old: oldStatement, new: newStatement } = viewSchema.compMod?.selectStatement ?? {};

	if (oldStatement === newStatement) {
		return [];
	}

	const dropScript = dropView({ viewSchema, ddlProvider });
	const createScript = createView({ ddlProvider, mapProperties, view });

	return [createAlterScriptDto([dropScript], true, true), createAlterScriptDto([createScript], true, false)].filter(
		scriptDto => scriptDto !== undefined,
	);
};

module.exports = {
	getModifySelectStatementScriptDtos,
};
