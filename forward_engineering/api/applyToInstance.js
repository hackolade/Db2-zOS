

async function applyToInstance(connectionInfo, logger, callback, app) {
	// const applyToInstanceLogger = logHelper.createLogger({
	// 	title: 'Apply to instance',
	// 	hiddenKeys: connectionInfo.hiddenKeys,
	// 	logger,
	// });

	// try {
	// 	const connection = await connectionHelper.connect({ connectionInfo, logger: applyToInstanceLogger });
	// 	await instanceHelper.executeQuery({ connection, query: connectionInfo.script, ddl: true });

	// 	callback();
	// } catch (err) {
	// 	applyToInstanceLogger.error(err);
	// 	callback(err);
	// }
}

module.exports = { applyToInstance };
