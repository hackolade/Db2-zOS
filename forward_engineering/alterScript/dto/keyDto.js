/**
 * @import {
 *   KeyScriptModification,
 *   KeyTransition
 * } from '../../types/alterScript'
 */

/**
 * Report that a key did not move between its regular and composite representation.
 *
 * @returns {KeyTransition} Transition result.
 */
const noKeyTransition = () => ({ didTransitionHappen: false });

/**
 * Report that a key moved between its regular and composite representation.
 *
 * @param {boolean} wasKeyChangedInTransition Whether the key options changed along the way.
 * @returns {KeyTransition} Transition result.
 */
const keyTransition = wasKeyChangedInTransition => ({
	didTransitionHappen: true,
	wasKeyChangedInTransition,
});

/**
 * Build a key statement paired with the table it belongs to, so that drop and create statements of the same table can
 * be ordered afterwards.
 *
 * @param {KeyScriptModification} params Statement and its metadata.
 * @returns {KeyScriptModification} Key script modification.
 */
const createKeyScriptModification = ({ script, fullTableName, isDropScript, isActivated }) => ({
	script,
	fullTableName,
	isDropScript,
	isActivated,
});

module.exports = {
	noKeyTransition,
	keyTransition,
	createKeyScriptModification,
};
