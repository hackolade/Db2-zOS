module.exports = {
	setSchema: 'SET SCHEMA = ${schemaName};',

	createType: 'CREATE DISTINCT TYPE ${name} AS ${sourceType};',

	dropType: 'DROP TYPE ${name};',

	createTable: 'CREATE${tableType} TABLE ${name}${tableProps}${tableOptions};',

	dropTable: 'DROP TABLE ${tableName};',

	addColumn: 'ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};',

	dropColumn: 'ALTER TABLE ${tableName} DROP COLUMN ${columnName};',

	createAuxiliaryTable: 'CREATE${tableType} TABLE ${name}${tableOptions};',

	addVersioning: 'ALTER TABLE ${tableName} ADD VERSIONING USE HISTORY TABLE ${historyTableName};',

	enableArchive: 'ALTER TABLE ${tableName} ENABLE ARCHIVE USE ARCHIVE TABLE ${archiveTableName};',

	comment: '\nCOMMENT ON ${objectType} ${objectName} IS ${comment};\n',

	createTableProps: '${columns}${keyConstraints}${checkConstraints}${foreignKeyConstraints}${temporalPeriods}',

	columnDefinition: '${name}${type}${nullability}${default}${constraints}',

	createForeignKey:
		'ALTER TABLE ${foreignTable} ADD CONSTRAINT ${name} FOREIGN KEY (${foreignKey}) REFERENCES ${primaryTable} (${primaryKey})${onDelete};',

	dropForeignKey: 'ALTER TABLE ${tableName} DROP FOREIGN KEY ${constraintName};',

	createForeignKeyConstraint:
		'${name} FOREIGN KEY (${foreignKey}) REFERENCES ${primaryTable} (${primaryKey})${onDelete}',

	checkConstraint: '${name}CHECK (${expression})${enforced}',

	createKeyConstraint: '${constraintName}${keyType}${columns}${options}',

	createView: 'CREATE VIEW ${name}${viewColumns}${viewProperties}${withCheckOption}\n\tAS ${selectStatement};',

	viewSelectStatement: 'SELECT ${keys}\n\tFROM ${tableName}',

	createIndex: 'CREATE${indexType} INDEX${indexName} ON ${indexTableName}${indexOptions};\n',

	dropView: 'DROP VIEW ${viewName};',

	alterPkConstraint: 'ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} PRIMARY KEY${columns}${options};',

	dropPK: 'ALTER TABLE ${tableName} DROP PRIMARY KEY;',

	alterNotNull: 'ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL;',

	dropNotNull: 'ALTER TABLE ${tableName} ALTER COLUMN ${columnName} DROP NOT NULL;',

	alterUkConstraint: 'ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} UNIQUE${columns}${options};',

	dropUkConstraint: 'ALTER TABLE ${tableName} DROP UNIQUE ${constraintName};',

	alterCheckConstraint: 'ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} CHECK (${expression})${enforced};',

	dropCheckConstraint: 'ALTER TABLE ${tableName} DROP CHECK ${constraintName};',

	updateColumnType: 'ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET DATA TYPE ${dataType};',

	updateColumnDefaultValue: 'ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET DEFAULT ${defaultValue};',

	dropColumnDefaultValue: 'ALTER TABLE ${tableName} ALTER COLUMN ${columnName} DROP DEFAULT;',

	renameColumn: 'ALTER TABLE ${tableName} RENAME COLUMN ${oldColumnName} TO ${newColumnName};',

	renameTable: 'RENAME TABLE ${oldTableName} TO ${newTableName};',

	renameIndex: 'RENAME INDEX ${oldIndexName} TO ${newIndexName};',

	dropIndex: 'DROP INDEX ${name};',
};
