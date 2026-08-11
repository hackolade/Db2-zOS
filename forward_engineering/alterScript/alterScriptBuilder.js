/**
 * @import {
 *   AlterScriptData,
 *   AlterScriptDto
 * } from '../types/alterScript'
 * @import {App} from '../types/ddlProvider'
 */

const { commentIfDeactivated } = require('../utils/general');
const { getAlterScriptDtos } = require('./alterScriptFromDeltaHelper');

/**
 * Join alter script DTOs into a single script. Deactivated statements are always commented out, and drop statements are
 * commented out as well unless the user opted into applying them.
 *
 * @param {AlterScriptDto[]} dtos Alter script DTOs.
 * @param {boolean} shouldApplyDropStatements Whether drop statements should be applied.
 * @returns {string} Alter script.
 */
const joinAlterScriptDtosIntoScript = (dtos, shouldApplyDropStatements) => {
	return dtos
		.flatMap(dto =>
			dto.scripts.map(scriptDto => {
				if (dto.isActivated === false) {
					return commentIfDeactivated(scriptDto.script, { isActivated: false, isPartOfLine: false });
				}

				if (shouldApplyDropStatements) {
					return scriptDto.script;
				}

				return commentIfDeactivated(scriptDto.script, {
					isActivated: !scriptDto.isDropScript,
					isPartOfLine: false,
				});
			}),
		)
		.map(scriptLine => scriptLine.trim())
		.filter(Boolean)
		.join('\n\n');
};

/**
 * Check whether the user opted into applying drop statements.
 *
 * @param {AlterScriptData} data FE data.
 * @returns {boolean} Whether drop statements should be applied.
 */
const shouldApplyDropStatements = data => {
	return Boolean(
		data.options?.additionalOptions?.some(option => option.id === 'applyDropStatements' && option.value),
	);
};

/**
 * Reshape container-level FE data into the entity-level shape the delta helpers expect.
 *
 * @param {AlterScriptData} data FE data.
 * @returns {AlterScriptData} Prepared FE data.
 */
const mapCoreDataForContainerLevelScripts = data => {
	return { ...data, jsonSchema: data.collections?.[0] ?? data.jsonSchema };
};

/**
 * Build the entity-level alter script.
 *
 * @param {AlterScriptData} data FE data.
 * @param {App} app App instance.
 * @returns {string} Alter script.
 */
const buildEntityLevelAlterScript = (data, app) => {
	return joinAlterScriptDtosIntoScript(getAlterScriptDtos(data, app), shouldApplyDropStatements(data));
};

/**
 * Build the container-level alter script.
 *
 * @param {AlterScriptData} data FE data.
 * @param {App} app App instance.
 * @returns {string} Alter script.
 */
const buildContainerLevelAlterScript = (data, app) => {
	const preparedData = mapCoreDataForContainerLevelScripts(data);

	return joinAlterScriptDtosIntoScript(
		getAlterScriptDtos(preparedData, app),
		shouldApplyDropStatements(preparedData),
	);
};

/**
 * Check whether the entity-level alter script contains statements that drop objects.
 *
 * @param {AlterScriptData} data FE data.
 * @param {App} app App instance.
 * @returns {boolean} Whether the script drops objects.
 */
const doesEntityLevelAlterScriptContainDropStatements = (data, app) => {
	return getAlterScriptDtos(data, app).some(
		dto => dto.isActivated && dto.scripts.some(scriptDto => scriptDto.isDropScript),
	);
};

/**
 * Check whether the container-level alter script contains statements that drop objects.
 *
 * @param {AlterScriptData} data FE data.
 * @param {App} app App instance.
 * @returns {boolean} Whether the script drops objects.
 */
const doesContainerLevelAlterScriptContainDropStatements = (data, app) => {
	return getAlterScriptDtos(mapCoreDataForContainerLevelScripts(data), app).some(
		dto => dto.isActivated && dto.scripts.some(scriptDto => scriptDto.isDropScript),
	);
};

module.exports = {
	doesEntityLevelAlterScriptContainDropStatements,
	buildEntityLevelAlterScript,
	buildContainerLevelAlterScript,
	doesContainerLevelAlterScriptContainDropStatements,
};
