/**
 * @import {
 *   AlterScriptDto,
 *   ModificationScript
 * } from '../../types/alterScript'
 */

/**
 * Build one DTO per script, all sharing the same activation and drop flags.
 *
 * @param {(string | undefined)[]} scripts Generated statements.
 * @param {boolean} isActivated Whether the statements are activated.
 * @param {boolean} isDropScript Whether the statements drop objects.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const createAlterScriptDtos = (scripts, isActivated, isDropScript) => {
	return scripts
		.filter(Boolean)
		.map(String)
		.map(script => ({
			isActivated,
			scripts: [{ isDropScript, script }],
		}));
};

/**
 * Build a single DTO holding all non-empty scripts.
 *
 * @param {(string | undefined)[]} scripts Generated statements.
 * @param {boolean} isActivated Whether the statements are activated.
 * @param {boolean} isDropScript Whether the statements drop objects.
 * @returns {AlterScriptDto | undefined} Alter script DTO, or undefined when there is nothing to run.
 */
const createAlterScriptDto = (scripts, isActivated, isDropScript) => {
	const nonEmptyScripts = scripts.filter(Boolean).map(String);

	if (nonEmptyScripts.length === 0) {
		return void 0;
	}

	return {
		isActivated,
		scripts: nonEmptyScripts.map(script => ({ isDropScript, script })),
	};
};

/**
 * Build a DTO that drops an object and recreates it, keeping both statements in the declared order.
 *
 * @param {string | undefined} dropScript Drop statement.
 * @param {string | undefined} createScript Create statement.
 * @param {boolean} isActivated Whether the statements are activated.
 * @returns {AlterScriptDto | undefined} Alter script DTO, or undefined when there is nothing to run.
 */
const createDropAndRecreateAlterScriptDto = (dropScript, createScript, isActivated) => {
	/** @type {ModificationScript[]} */
	const scripts = [];

	if (dropScript) {
		scripts.push({ isDropScript: true, script: dropScript });
	}

	if (createScript) {
		scripts.push({ isDropScript: false, script: createScript });
	}

	if (scripts.length === 0) {
		return void 0;
	}

	return { isActivated, scripts };
};

module.exports = {
	createAlterScriptDto,
	createAlterScriptDtos,
	createDropAndRecreateAlterScriptDto,
};
