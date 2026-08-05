// /**
//  * @typedef {import('../shared/types').App} App
//  * @typedef {import('../shared/types').AppLogger} AppLogger
//  * @typedef {import('../shared/types').ConnectionInfo} ConnectionInfo
//  * @typedef {import('../shared/types').Logger} Logger
//  * @typedef {import('../shared/types').Callback} Callback
//  */

// const { identity } = require('lodash');
// const { mapSeries } = require('async');
// const { connectionHelper } = require('../shared/helpers/connectionHelper');
// const { instanceHelper } = require('../shared/helpers/instanceHelper');
// const { logHelper } = require('../shared/helpers/logHelper');
// const { OBJECT_TYPE } = require('../constants/constants');
// const { nameHelper } = require('../shared/helpers/nameHelper');
// const { testConnection } = require('../shared/api/testConnection');

// /**
//  * @param {ConnectionInfo} connectionInfo
//  * @param {AppLogger} appLogger
//  * @param {Callback} callback
//  */
const disconnect = async (connectionInfo, appLogger, callback) => {
	// try {
	// 	await connectionHelper.disconnect();
	// 	callback();
	// } catch (error) {
	// 	const logger = logHelper.createLogger({
	// 		title: 'Disconnect from database',
	// 		hiddenKeys: connectionInfo.hiddenKeys,
	// 		logger: appLogger,
	// 	});

	// 	logger.error(error);
	// 	callback(error);
	// }
};

// /**
//  * @param {ConnectionInfo} connectionInfo
//  * @param {AppLogger} appLogger
//  * @param {Callback} callback
//  * @param {App} app
//  */
const getSchemaNames = async (connectionInfo, appLogger, callback, app) => {
	// const logger = logHelper.createLogger({
	// 	title: 'Retrieve schema names',
	// 	hiddenKeys: connectionInfo.hiddenKeys,
	// 	logger: appLogger,
	// });

	// try {
	// 	const connection = await connectionHelper.connect({ connectionInfo, logger });
	// 	const schemaNames = await instanceHelper.getSchemaNames({ connection });

	// 	callback(null, schemaNames);
	// } catch (error) {
	// 	logger.error(error);
	// 	callback(error);
	// }
};

// /**
//  * @param {ConnectionInfo} connectionInfo
//  * @param {AppLogger} appLogger
//  * @param {Callback} callback
//  * @param {App} app
//  */
const getDbCollectionsNames = async (connectionInfo, appLogger, callback, app) => {
	// const logger = logHelper.createLogger({
	// 	title: 'Retrieve table names',
	// 	hiddenKeys: connectionInfo.hiddenKeys,
	// 	logger: appLogger,
	// });

	// try {
	// 	const connection = await connectionHelper.connect({ connectionInfo, logger });
	// 	const dbVersion = await instanceHelper.getDbVersion({ connection });
	// 	logger.info('Db version: ' + dbVersion);

	// 	logger.info('Get table and schema names');
	// 	logger.info(connectionInfo);

	// 	const tableNames = await instanceHelper.getDatabasesWithTableNames({
	// 		connection,
	// 		objectType: OBJECT_TYPE.table,
	// 		includeSystemCollection: connectionInfo.includeSystemCollection,
	// 		tableNameModifier: identity,
	// 	});

	// 	logger.info('Get views and schema names');

	// 	const viewNames = await instanceHelper.getDatabasesWithTableNames({
	// 		connection,
	// 		objectType: OBJECT_TYPE.view,
	// 		includeSystemCollection: connectionInfo.includeSystemCollection,
	// 		tableNameModifier: nameHelper.setViewSign,
	// 	});
	// 	const allDatabaseNames = [...Object.keys(tableNames), ...Object.keys(viewNames)];
	// 	const dbCollectionNames = allDatabaseNames.map(dbName => {
	// 		const dbCollections = [...(tableNames[dbName] || []), ...(viewNames[dbName] || [])];

	// 		return {
	// 			dbName,
	// 			dbCollections,
	// 			isEmpty: !dbCollections.length,
	// 		};
	// 	});

	// 	logger.info('Names retrieved successfully');

	// 	callback(null, dbCollectionNames);
	// } catch (error) {
	// 	logger.error(error);
	// 	callback(error);
	// }
};

// /**
//  * @param {ConnectionInfo} data
//  * @param {AppLogger} appLogger
//  * @param {Callback} callback
//  * @param {App} app
//  */
const getDbCollectionsData = async (connectionInfo, appLogger, callback, app) => {
	// const logger = logHelper.createLogger({
	// 	title: 'Retrieve table names',
	// 	hiddenKeys: connectionInfo.hiddenKeys,
	// 	logger: appLogger,
	// });

	// try {
	// 	const collections = connectionInfo.collectionData.collections;
	// 	const dataBaseNames = connectionInfo.collectionData.dataBaseNames;
	// 	const connection = await connectionHelper.connect({ connectionInfo, logger });

	// 	const dbVersion = await instanceHelper.getDbVersion({ connection });
	// 	logger.info('Db version: ' + dbVersion);
	// 	logger.progress('Start reverse engineering ...');

	// 	const result = await mapSeries(dataBaseNames, async schemaName => {
	// 		const tables = (collections[schemaName] || []).filter(name => !nameHelper.isViewName(name));
	// 		const views = (collections[schemaName] || []).filter(nameHelper.isViewName).map(nameHelper.getViewName);
	// 		const bucketInfo = await instanceHelper.getSchemaProperties({ connection, schemaName, logger });
	// 		logger.info(`Parsing schema "${schemaName}"`);
	// 		logger.progress(`Parsing schema "${schemaName}"`, schemaName);

	// 		const result = await mapSeries(tables, async tableName => {
	// 			logger.info(`Get create table statement "${tableName}"`);
	// 			logger.progress(`Get create table statement`, schemaName, tableName);

	// 			const ddl = await instanceHelper.getTableDdl({
	// 				connection,
	// 				schemaName,
	// 				tableName,
	// 				objectType: OBJECT_TYPE.table,
	// 				logger,
	// 			});

	// 			return {
	// 				dbName: schemaName,
	// 				collectionName: tableName,
	// 				entityLevel: {},
	// 				documents: [],
	// 				views: [],
	// 				standardDoc: {},
	// 				ddl: {
	// 					script: ddl,
	// 					type: 'db2',
	// 					takeAllDdlProperties: true,
	// 				},
	// 				emptyBucket: false,
	// 				bucketInfo: {
	// 					...bucketInfo,
	// 				},
	// 				modelDefinitions: {},
	// 			};
	// 		});

	// 		const viewData = await mapSeries(views, async viewName => {
	// 			logger.info(`Get create view statement "${viewName}"`);
	// 			logger.progress(`Get create view statement`, schemaName, viewName);

	// 			const ddl = await instanceHelper.getTableDdl({
	// 				connection,
	// 				schemaName,
	// 				tableName: viewName,
	// 				objectType: OBJECT_TYPE.view,
	// 				logger,
	// 			});

	// 			return {
	// 				name: viewName,
	// 				ddl: {
	// 					script: ddl,
	// 					type: 'db2',
	// 					takeAllDdlProperties: true,
	// 				},
	// 			};
	// 		});

	// 		if (viewData.length) {
	// 			return [
	// 				...result,
	// 				{
	// 					dbName: schemaName,
	// 					views: viewData,
	// 					emptyBucket: false,
	// 				},
	// 			];
	// 		}

	// 		return result;
	// 	});

	// 	callback(null, result.flat(), { dbVersion, database_name: connectionInfo.database });
	// } catch (error) {
	// 	logger.error(error);
	// 	callback(error);
	// }
};

module.exports = {
	disconnect,
	// testConnection,
	getSchemaNames,
	getDbCollectionsNames,
	getDbCollectionsData,
};
