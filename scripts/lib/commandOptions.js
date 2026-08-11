/** @import {CommandOptionDefinition} from './commandOptions.types' */

/** @type {typeof import('node:util')} */
const { parseArgs } = require('node:util');

/**
 * Reads supported command-line options as raw strings.
 *
 * @param {string[]} args Command-line arguments excluding the Node executable and script path.
 * @param {string[]} optionNames Supported argument names.
 * @returns {Map<string, string>} Raw option values keyed by argument name.
 */
function readCommandOptions(args, optionNames) {
	/** @type {Record<string, { type: 'string' }>} */
	const options = Object.fromEntries(
		optionNames.map(optionName => [
			optionName,
			{
				type: 'string',
			},
		]),
	);

	const { values } = parseArgs({
		args,
		options,
		strict: true,
	});

	/** @type {Map<string, string>} */
	const commandOptions = new Map();

	for (const [optionName, value] of Object.entries(values)) {
		if (typeof value !== 'string') {
			throw new TypeError(`--${optionName} must have a value`);
		}

		commandOptions.set(optionName, value);
	}

	return commandOptions;
}

/**
 * Gets and converts a parsed command-line option.
 *
 * @template T
 * @param {Map<string, string>} options Raw command-line options.
 * @param {string} optionName Argument name.
 * @param {CommandOptionDefinition<T>} definition Default value and converter for the argument.
 * @returns {T} Converted option value.
 */
function getCommandOption(options, optionName, definition) {
	const value = options.get(optionName);

	return value === undefined ? definition.defaultValue : definition.parse(value, optionName);
}

/**
 * Converts a command-line option value to a boolean.
 *
 * @param {string} value Raw option value.
 * @param {string} optionName Option name used in validation errors.
 * @returns {boolean} Parsed boolean value.
 */
function parseBooleanOption(value, optionName) {
	if (value === 'true') {
		return true;
	}

	if (value === 'false') {
		return false;
	}

	throw new TypeError(`--${optionName} must be either "true" or "false"; received "${value}"`);
}

module.exports = {
	getCommandOption,
	parseBooleanOption,
	readCommandOptions,
};
