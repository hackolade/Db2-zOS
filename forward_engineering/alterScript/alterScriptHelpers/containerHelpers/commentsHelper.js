/**
 * @import {AlterScriptDto} from '../../../types/alterScript'
 * @import {PropertyPair} from '../../../types/ddlProvider'
 */

const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const {
	getSchemaCommentStatement,
	dropSchemaCommentStatement,
} = require('../../../ddlProvider/ddlHelpers/comment/commentHelper');

/**
 * Build the comment statement for a modified schema.
 *
 * @param {{ schemaName: string; compMod: { description?: PropertyPair<string> }; isActivated: boolean }} params Schema
 *   name, its comparison data and activation flag.
 * @returns {AlterScriptDto | undefined} Alter script DTO, or undefined when the comment did not change.
 */
const getModifiedCommentOnSchemaScriptDtos = ({ schemaName, compMod, isActivated }) => {
	const description = compMod.description ?? {};

	if (description.new && description.new !== description.old) {
		const script = getSchemaCommentStatement({ schemaName, description: description.new });
		return createAlterScriptDto([script], isActivated, false);
	}

	if (description.old && !description.new) {
		const script = dropSchemaCommentStatement({ schemaName });
		return createAlterScriptDto([script], isActivated, true);
	}

	return void 0;
};

module.exports = {
	getModifiedCommentOnSchemaScriptDtos,
};
