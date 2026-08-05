const { generateContainerScript } = require('./api/generateContainerScript');
const { isDropInStatements } = require('./api/isDropInStatements');
const { applyToInstance } = require('./api/applyToInstance');
const { generateScript } = require('./api/generateScript');

module.exports = {
	generateScript,

	generateViewScript(data, logger, callback, app) {
		throw new Error('Not implemented');
	},

	generateContainerScript,

	getDatabases(connectionInfo, logger, callback, app) {
		throw new Error('Not implemented');
	},

	applyToInstance,

	testConnection() {
		throw new Error('Not implemented');
	},

	isDropInStatements,
};
