/** @type {typeof import('node:path')} */
const path = require('path');

const DEFAULT_RELEASE_FOLDER_PATH = path.resolve(__dirname, 'release');

const EXCLUDED_EXTENSIONS = ['.js', '.g4', '.interp', '.tokens'];
const EXCLUDED_FILES = [
	'.github',
	'.DS_Store',
	'.editorconfig',
	'.git',
	'.gitignore',
	'.vscode',
	'.idea',
	'.dockerignore',
	'.oxlintrc.json',
	'.oxfmtrc.json',
	'.sonarlint',
	'.sonarcloud.properties',
	'tsconfig.json',
	'types',
	'build',
	'release',
	'node_modules',
	'lint-staged.config.js',
	'scripts',
];

module.exports = {
	DEFAULT_RELEASE_FOLDER_PATH,
	EXCLUDED_EXTENSIONS,
	EXCLUDED_FILES,
};
