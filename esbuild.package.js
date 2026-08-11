/** @type {typeof import('node:fs')} */
const fs = require('fs');

/** @type {typeof import('node:path')} */
const path = require('path');

/** @type {typeof import('@hackolade/hck-esbuild-plugins-pack')} */
const { copyFolderFiles, addReleaseFlag } = require('@hackolade/hck-esbuild-plugins-pack');

/** @type {typeof import('esbuild')} */
const esbuild = require('esbuild');

/** @type {typeof import('esbuild-plugin-clean')} */
const { clean } = require('esbuild-plugin-clean');

/** @type {typeof import('esbuild-plugin-copy')} */
const { copy } = require('esbuild-plugin-copy');

/** @type {typeof import('./buildConstants')} */
const { EXCLUDED_EXTENSIONS, EXCLUDED_FILES, DEFAULT_RELEASE_FOLDER_PATH } = require('./buildConstants');

/** @type {typeof import('./scripts/lib/commandOptions')} */
const { getCommandOption, parseBooleanOption, readCommandOptions } = require('./scripts/lib/commandOptions');

/**
 * Packages the plugin into the release folder.
 *
 * @returns {Promise<void>} Resolves when the esbuild packaging step finishes.
 */
async function packagePlugin() {
	const { default: packageData } = await import('./package.json', {
		with: { type: 'json' },
	});
	const RELEASE_FOLDER_PATH = path.join(DEFAULT_RELEASE_FOLDER_PATH, `${packageData.name}-${packageData.version}`);
	const commandOptions = readCommandOptions(process.argv.slice(2), ['write']);
	const write = getCommandOption(commandOptions, 'write', {
		defaultValue: true,
		parse: parseBooleanOption,
	});

	/**
	 * Checks whether a packaging entry point exists on disk.
	 *
	 * @param {string} entryPoint Absolute path to a potential entry point.
	 * @returns {boolean} `true` when the entry point file exists.
	 */
	const entryPointExists = entryPoint => fs.existsSync(entryPoint);

	/** @type {string[]} */
	const entryPoints = [
		path.resolve(__dirname, 'forward_engineering', 'api.js'),
		path.resolve(__dirname, 'api', 'fe.js'),
		path.resolve(__dirname, 'forward_engineering', 'ddlProvider.js'),
		path.resolve(__dirname, 'reverse_engineering', 'api.js'),
	].filter(entryPoint => entryPointExists(entryPoint));

	await esbuild.build({
		entryPoints,
		bundle: true,
		keepNames: true,
		platform: 'node',
		target: 'node24',
		outdir: RELEASE_FOLDER_PATH,
		write,
		minify: true,
		logLevel: 'info',
		plugins: write
			? [
					clean({
						patterns: [DEFAULT_RELEASE_FOLDER_PATH],
					}),
					copy({
						assets: {
							from: [path.join('node_modules', 'lodash', '**', '*')],
							to: [path.join('node_modules', 'lodash')],
						},
					}),
					copyFolderFiles({
						fromPath: __dirname,
						targetFolderPath: RELEASE_FOLDER_PATH,
						excludedExtensions: EXCLUDED_EXTENSIONS,
						excludedFiles: EXCLUDED_FILES,
					}),
					addReleaseFlag(path.resolve(RELEASE_FOLDER_PATH, 'package.json')),
				]
			: [],
	});
}

packagePlugin().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
