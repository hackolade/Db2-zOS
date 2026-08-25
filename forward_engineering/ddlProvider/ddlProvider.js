/**
 * @import {
 *   CheckConstraintInput,
 *   ContainerData,
 *   ContainerLevelPreparedData,
 *   CreateSchemaParams,
 *   CreateTableParams,
 *   DdlProvider,
 *   ForeignKeyInput,
 *   ForeignKeyStatement,
 *   HydrateColumnParams,
 *   HydratedCheckConstraint,
 *   HydratedColumn,
 *   HydratedTable,
 *   HydratedTemporalPeriod,
 *   HydratedView,
 *   HydratedViewColumn,
 *   HydrateTableParams,
 *   HydrateViewColumnParams,
 *   HydrateViewParams,
 *   IndexData,
 *   JsonSchemaColumn,
 *   SchemaData,
 *   TypeDescriptors,
 *   ViewSelectColumn
 * } from '../types/ddlProvider'
 */

const get = require('lodash/get');
const isEmpty = require('lodash/isEmpty');
const toUpper = require('lodash/toUpper');
const trim = require('lodash/trim');
const templates = require('./templates');
const defaultTypes = require('../configs/defaultTypes.js');
const descriptors = require('../configs/descriptors.js');
const {
	commentIfDeactivated: commentDeactivatedStatement,
	wrapInQuotes,
	getNamePrefixedWithSchemaName,
	checkAllKeysDeactivated,
	hasType,
	setTab,
} = require('../utils/general.js');
const { assignTemplates } = require('../utils/assignTemplates');
const keyHelper = require('./ddlHelpers/key/keyHelper.js');
const { getColumnType } = require('./ddlHelpers/columnDefinition/getColumnType.js');
const { getColumnDefault } = require('./ddlHelpers/columnDefinition/getColumnDefault.js');
const { getColumnNullability, getColumnConstraints } = require('./ddlHelpers/columnDefinition/getColumnConstraints.js');
const {
	getTableCommentStatement,
	getColumnComments,
	getIndexCommentStatement,
	getTypeCommentStatement,
} = require('./ddlHelpers/comment/commentHelper.js');
const { getTableProps } = require('./ddlHelpers/table/getTableProps.js');
const { getTableOptions } = require('./ddlHelpers/table/getTableOptions.js');
const { getViewData } = require('./ddlHelpers/view/getViewData.js');
const { getTableType } = require('./ddlHelpers/table/getTableType.js');
const { hydrateAuxiliaryTableData } = require('./ddlHelpers/table/hydrateAuxiliaryTableData.js');
const { hydrateGlobalTemporaryTableData } = require('./ddlHelpers/table/hydrateGlobalTemporaryTableData.js');
const { hydratePartitioning, hydrateTemporalPeriod } = require('./ddlHelpers/table/hydrateZosTableData.js');
const { joinActivatedAndDeactivatedStatements } = require('../utils/joinActivatedAndDeactivatedStatements');
const { getIndexName } = require('./ddlHelpers/index/getIndexName.js');
const { getIndexType } = require('./ddlHelpers/index/getIndexType.js');
const { getIndexOptions } = require('./ddlHelpers/index/getIndexOptions.js');
const { getSequencesScript } = require('./ddlHelpers/sequence/getSequencesScript.js');
const { getNumericValue } = require('../utils/general.js');

/**
 * Format view columns as a string.
 *
 * @param {{ columns: ViewSelectColumn[] }} params View columns.
 * @returns {string} Columns string.
 */
const getViewColumnsAsString = ({ columns }) => {
	const indent = '\n\t\t';
	const statements = columns.map(({ statement, isActivated }) => {
		return commentDeactivatedStatement(statement, { isActivated, isPartOfLine: false });
	});

	return indent + joinActivatedAndDeactivatedStatements({ statements, delimiter: ',', indent });
};

/**
 * Build WITH CHECK OPTION clause.
 *
 * @param {{ withCheckOption?: boolean; checkTestingScope?: string }} params Check option params.
 * @returns {string} Check option clause.
 */
const getWithCheckOptionClause = ({ withCheckOption, checkTestingScope }) => {
	if (!withCheckOption) {
		return '';
	}

	const scope = checkTestingScope ?? 'CASCADED';
	return `\n\tWITH ${scope} CHECK OPTION`;
};

/**
 * Resolve default type mapping.
 *
 * @param {string} type Type name.
 * @returns {string | undefined} Default type.
 */
const getDefaultType = type => defaultTypes[type];

/**
 * Get type descriptors.
 *
 * @returns {TypeDescriptors} Type descriptors.
 */
const getTypesDescriptors = () => descriptors;

/**
 * Check whether a type is supported.
 *
 * @param {string} type Type name.
 * @returns {boolean} Whether type exists.
 */
const providerHasType = type => hasType({ descriptors, type });

/**
 * Hydrate schema data.
 *
 * @param {ContainerData} containerData Container data.
 * @param {ContainerLevelPreparedData} [data] Prepared container-level data from Studio.
 * @returns {SchemaData} Hydrated schema.
 */
const hydrateSchema = (containerData, data) => ({
	schemaName: containerData.name,
	isActivated: containerData.isActivated,
	description: containerData.description,
	sequences: data?.sequences,
});

/**
 * Set the current schema.
 *
 * @param {CreateSchemaParams} params Schema params.
 * @returns {string} SET SCHEMA DDL.
 */
const createSchema = ({ schemaName, isActivated = true }) => {
	// Studio always calls createSchema once at the start of a generation run, before any createTable call - the
	// natural place to reset cross-table ADD VERSIONING/ENABLE ARCHIVE ordering state for this run.
	resetVersioningTracking();
	const wrappedSchemaName = wrapInQuotes(schemaName);
	const setSchemaStatement = assignTemplates({
		template: templates.setSchema,
		templateData: {
			schemaName: wrappedSchemaName,
		},
	});

	return commentDeactivatedStatement(setSchemaStatement + '\n', { isActivated });
};

/**
 * Create schema-level CREATE SEQUENCE statements.
 *
 * @param {SchemaData} schemaData Hydrated schema.
 * @returns {string} CREATE SEQUENCE DDL, or empty.
 */
const createSchemaSequences = ({ schemaName, sequences, isActivated = true }) => {
	const script = getSequencesScript({ schemaName, sequences });
	if (!script) {
		return '';
	}

	return commentDeactivatedStatement(script, { isActivated, isPartOfLine: false });
};

/**
 * Return no DDL for dropping a schema. Db2 for z/OS schemas are qualifiers rather than standalone objects that can be
 * dropped. This method remains in the provider for framework compatibility.
 *
 * @returns {string} Empty DDL.
 */
const dropSchema = () => '';

/**
 * Return no DDL for altering a schema. Db2 for z/OS does not support ALTER SCHEMA. This method remains in the provider
 * for framework compatibility.
 *
 * @returns {string} Empty DDL.
 */
const alterSchema = () => '';

/**
 * Create distinct type DDL.
 *
 * @param {HydratedColumn} udt User-defined type data.
 * @returns {string} Type DDL.
 */
const createUdt = ({ name, schemaName, comment, isActivated = true, ...sourceTypeParams }) => {
	const wrappedName = getNamePrefixedWithSchemaName({ name, schemaName });
	const sourceType = getColumnType({
		...sourceTypeParams,
		name,
		primaryKey: false,
		unique: false,
		isUDTRef: false,
	}).trim();
	const typeStatement = assignTemplates({
		template: templates.createType,
		templateData: { name: wrappedName, sourceType },
	});
	const commentStatement = getTypeCommentStatement({ typeName: wrappedName, description: comment });
	const commentDdl = commentStatement ? '\n' + commentStatement + '\n' : '\n';

	return commentDeactivatedStatement(typeStatement + commentDdl, { isActivated });
};

/**
 * Hydrate column definition.
 *
 * @param {HydrateColumnParams} params Column input.
 * @returns {HydratedColumn} Hydrated column.
 */
const hydrateColumn = ({ columnDefinition, jsonSchema, schemaData, definitionJsonSchema }) => {
	const definitionSchema = definitionJsonSchema ?? {};
	const isUDTRef = !!jsonSchema.$ref;
	const type = isUDTRef ? (columnDefinition.type ?? '') : toUpper(jsonSchema.mode ?? jsonSchema.type);
	const itemsSchema = Array.isArray(jsonSchema.items) ? jsonSchema.items[0] : jsonSchema.items;
	const itemsType = toUpper(itemsSchema?.mode ?? itemsSchema?.type ?? '');

	return {
		name: columnDefinition.name,
		entityName: columnDefinition.entityName,
		type,
		ofType: jsonSchema.ofType,
		notPersistable: jsonSchema.notPersistable,
		size: jsonSchema.size,
		primaryKey: keyHelper.isInlinePrimaryKey({ column: jsonSchema }),
		primaryKeyOptions: jsonSchema.primaryKeyOptions,
		unique: keyHelper.isInlineUnique({ column: jsonSchema }),
		uniqueKeyOptions: jsonSchema.uniqueKeyOptions,
		nullable: columnDefinition.nullable,
		default: columnDefinition.default,
		comment: jsonSchema.refDescription ?? jsonSchema.description ?? definitionSchema.description,
		isActivated: columnDefinition.isActivated,
		scale: getNumericValue(columnDefinition.scale || jsonSchema.scale),
		precision: getNumericValue(columnDefinition.precision || jsonSchema.precision),
		length: columnDefinition.length,
		schemaName: schemaData.schemaName,
		fractSecPrecision: jsonSchema.fractSecPrecision,
		withTimeZone: jsonSchema.withTimeZone,
		lengthSemantics: jsonSchema.lengthSemantics,
		identity: jsonSchema.identity,
		characterSubtype: jsonSchema.characterSubtype,
		ccsid: jsonSchema.ccsid,
		inlineLength: jsonSchema.inlineLength,
		generatedColumn: jsonSchema.generatedColumn,
		generatedColumnType: jsonSchema.generatedColumnType,
		generatedColumnGenerated: jsonSchema.generatedColumnGenerated,
		columnGenerationExpression: jsonSchema.columnGenerationExpression,
		generated: jsonSchema.generated,
		implicitlyHidden: jsonSchema.implicitlyHidden,
		isUDTRef,
		itemsType,
	};
};

/**
 * Merge JSON schema column with definition schema.
 *
 * @param {JsonSchemaColumn} jsonSchema Column JSON schema.
 * @param {JsonSchemaColumn} definitionJsonSchema Definition schema.
 * @returns {JsonSchemaColumn} Merged schema.
 */
const hydrateJsonSchemaColumn = (jsonSchema, definitionJsonSchema) => {
	if (!jsonSchema.$ref || isEmpty(definitionJsonSchema)) {
		return jsonSchema;
	}

	return { ...definitionJsonSchema, ...jsonSchema };
};

/**
 * Convert hydrated column to DDL.
 *
 * @param {HydratedColumn} columnDefinition Column definition.
 * @param {string} [template] Column template.
 * @returns {string} Column DDL.
 */
const convertColumnDefinition = (columnDefinition, template = templates.columnDefinition) => {
	const statement = assignTemplates({
		template,
		templateData: {
			name: wrapInQuotes(columnDefinition.name),
			type: getColumnType(columnDefinition),
			nullability: getColumnNullability(columnDefinition),
			default: getColumnDefault(columnDefinition),
			constraints: getColumnConstraints(columnDefinition),
		},
	});

	return commentDeactivatedStatement(statement, { isActivated: columnDefinition.isActivated });
};

/**
 * Hydrate check constraint.
 *
 * @param {CheckConstraintInput} checkConstraint Check constraint data.
 * @returns {HydratedCheckConstraint} Hydrated constraint.
 */
const hydrateCheckConstraint = checkConstraint => ({
	name: checkConstraint.chkConstrName,
	expression: checkConstraint.constrExpression,
	comments: checkConstraint.constrComments,
	description: checkConstraint.constrDescription,
	enforced: checkConstraint.constrEnforced,
});

/**
 * Create check constraint DDL.
 *
 * @param {HydratedCheckConstraint} params Check constraint data.
 * @returns {string} Check constraint fragment.
 */
const createCheckConstraint = ({ name, expression, enforced } = {}) => {
	if (!expression) {
		return '';
	}

	return assignTemplates({
		template: templates.checkConstraint,
		templateData: {
			name: name ? `CONSTRAINT ${wrapInQuotes(name)} ` : '',
			expression: trim(expression).replace(/^\(([\s\S]*)\)$/u, '$1'),
			enforced: enforced ? ` ${enforced}` : '',
		},
	});
};

/**
 * Create foreign key constraint fragment.
 *
 * @param {ForeignKeyInput} constraint Constraint data.
 * @param {unknown} _dbData Database data.
 * @param {SchemaData} [schemaData] Schema data.
 * @returns {ForeignKeyStatement} Constraint statement.
 */
const createForeignKeyConstraint = (constraint, _dbData, schemaData) => {
	const {
		name,
		foreignKey,
		primaryTable,
		primaryKey,
		primaryTableActivated,
		foreignTableActivated,
		primarySchemaName,
		customProperties,
	} = constraint;
	const isAllPrimaryKeysDeactivated = checkAllKeysDeactivated({ keys: primaryKey });
	const isAllForeignKeysDeactivated = checkAllKeysDeactivated({ keys: foreignKey });
	const isActivated = Boolean(
		!isAllPrimaryKeysDeactivated && !isAllForeignKeysDeactivated && primaryTableActivated && foreignTableActivated,
	);

	const onDelete = keyHelper.customPropertiesForForeignKey({ customProperties });
	const primaryTableName = getNamePrefixedWithSchemaName({
		name: primaryTable,
		schemaName: primarySchemaName ?? schemaData?.schemaName,
	});
	const constraintName = name ? `CONSTRAINT ${wrapInQuotes(name)}` : '';
	const foreignKeyName =
		typeof foreignKey === 'string'
			? foreignKey
			: isActivated
				? keyHelper.foreignKeysToString({ keys: foreignKey })
				: keyHelper.foreignActiveKeysToString({ keys: foreignKey });
	const primaryKeyName =
		typeof primaryKey === 'string'
			? primaryKey
			: isActivated
				? keyHelper.foreignKeysToString({ keys: primaryKey })
				: keyHelper.foreignActiveKeysToString({ keys: primaryKey });

	const foreignKeyStatement = assignTemplates({
		template: templates.createForeignKeyConstraint,
		templateData: {
			primaryTable: primaryTableName,
			name: constraintName,
			foreignKey: foreignKeyName,
			primaryKey: primaryKeyName,
			onDelete,
		},
	});

	return {
		statement: trim(foreignKeyStatement),
		isActivated,
	};
};

/**
 * Create standalone foreign key DDL.
 *
 * @param {ForeignKeyInput} constraint Constraint data.
 * @param {unknown} _dbData Database data.
 * @param {SchemaData} [schemaData] Schema data.
 * @returns {ForeignKeyStatement} Foreign key statement.
 */
const createForeignKey = (constraint, _dbData, schemaData) => {
	const {
		name,
		foreignTable,
		foreignKey,
		primaryTable,
		primaryKey,
		primaryTableActivated,
		foreignTableActivated,
		foreignSchemaName,
		primarySchemaName,
		customProperties,
	} = constraint;
	const isAllPrimaryKeysDeactivated = checkAllKeysDeactivated({ keys: primaryKey });
	const isAllForeignKeysDeactivated = checkAllKeysDeactivated({ keys: foreignKey });
	const isActivated = Boolean(
		!isAllPrimaryKeysDeactivated && !isAllForeignKeysDeactivated && primaryTableActivated && foreignTableActivated,
	);

	const onDelete = keyHelper.customPropertiesForForeignKey({ customProperties });
	const primaryTableName = getNamePrefixedWithSchemaName({
		name: primaryTable,
		schemaName: primarySchemaName ?? schemaData?.schemaName,
	});
	const foreignTableName = getNamePrefixedWithSchemaName({
		name: foreignTable ?? '',
		schemaName: foreignSchemaName ?? schemaData?.schemaName,
	});
	const constraintName = name ? wrapInQuotes(name) : '';
	const foreignKeyName =
		typeof foreignKey === 'string'
			? foreignKey
			: isActivated
				? keyHelper.foreignKeysToString({ keys: foreignKey })
				: keyHelper.foreignActiveKeysToString({ keys: foreignKey });
	const primaryKeyName =
		typeof primaryKey === 'string'
			? primaryKey
			: isActivated
				? keyHelper.foreignKeysToString({ keys: primaryKey })
				: keyHelper.foreignActiveKeysToString({ keys: primaryKey });

	const foreignKeyStatement = assignTemplates({
		template: templates.createForeignKey,
		templateData: {
			primaryTable: primaryTableName,
			foreignTable: foreignTableName,
			name: constraintName,
			foreignKey: foreignKeyName,
			primaryKey: primaryKeyName,
			onDelete,
		},
	});

	return {
		statement: trim(foreignKeyStatement) + '\n',
		isActivated,
	};
};

/**
 * Hydrate table data.
 *
 * @param {HydrateTableParams} params Table input.
 * @returns {HydratedTable} Hydrated table.
 */
const hydrateTable = ({ tableData, entityData, jsonSchema }) => {
	const detailsTab = entityData[0] ?? {};
	const auxiliaryTableData = hydrateAuxiliaryTableData({ tableData, detailsTab });
	const globalTemporaryTableData = hydrateGlobalTemporaryTableData({ tableData, detailsTab });
	const partitioning = hydratePartitioning({ jsonSchema, partitioning: detailsTab.partitioning });
	const periodForSystemTime = hydrateTemporalPeriod({
		jsonSchema,
		period: detailsTab.periodForSystemTime,
	});
	const periodForBusinessTime = hydrateTemporalPeriod({
		jsonSchema,
		period: detailsTab.periodForBusinessTime,
	});

	return {
		...tableData,
		...auxiliaryTableData,
		...globalTemporaryTableData,
		keyConstraints: keyHelper.getTableKeyConstraints({ jsonSchema, entityName: tableData.name }),
		description: detailsTab.description,
		tableProperties: detailsTab.tableProperties,
		inClauseType: detailsTab.inClauseType,
		databaseName: detailsTab.databaseName,
		table_tablespace_name: detailsTab.table_tablespace_name,
		acceleratorName: detailsTab.acceleratorName,
		tableOptions: detailsTab.tableOptions,
		partitioning: partitioning ?? undefined,
		periodForSystemTime: periodForSystemTime ?? undefined,
		periodForBusinessTime: periodForBusinessTime ?? undefined,
		archiveEnabled: detailsTab.archiveEnabled,
		archiveTable: detailsTab.archiveTable,
		tableKind: detailsTab.tableKind,
		gttCcsid: detailsTab.gttCcsid,
		mqtQuery: detailsTab.mqtQuery,
		mqtDataOption: detailsTab.mqtDataOption,
		mqtRefresh: detailsTab.mqtRefresh,
		mqtMaintainedBy: detailsTab.mqtMaintainedBy,
		mqtQueryOptimization: detailsTab.mqtQueryOptimization,
	};
};

/**
 * Tracks table names already rendered in the current generation run (unquoted `schema.table`, upper-cased), and any ADD
 * VERSIONING/ENABLE ARCHIVE statements still waiting on their target table to be rendered. Db2 requires both tables to
 * exist before the ALTER can run, but `historyTable`/`archiveTable` are plain text properties, invisible to Studio's
 * relationship-based entity ordering - so a statement can't always be attached to its owning table's own CREATE TABLE
 * safely. Reset per `createSchema` call, which Studio always calls once at the start of a generation run (container- or
 * entity-level) before any `createTable` call.
 *
 * @type {Set<string>}
 */
let renderedTableNames = new Set();
/** @type {{ targetTableName: string; statement: string }[]} */
let pendingVersioningStatements = [];

/**
 * Reset cross-table ADD VERSIONING/ENABLE ARCHIVE ordering state for a new generation run.
 *
 * @returns {void}
 */
const resetVersioningTracking = () => {
	renderedTableNames = new Set();
	pendingVersioningStatements = [];
};

/**
 * Build the ALTER TABLE ... ADD VERSIONING / ENABLE ARCHIVE statements that must follow a table's own CREATE TABLE,
 * deferring any whose target table hasn't been rendered yet and flushing them once that table comes up - regardless of
 * which of the two tables that turns out to be, so the statement always lands after both tables exist.
 *
 * @param {{
 * 	tableName: string;
 * 	canonicalTableName: string;
 * 	periodForSystemTime?: HydratedTemporalPeriod;
 * 	archiveEnabled?: boolean;
 * 	archiveTable?: string;
 * }} params
 *   Quoted table name (for the ALTER statement text), unquoted `schema.table` key (for matching against
 *   `historyTable`/`archiveTable` text values), and temporal/archive linkage data.
 * @returns {string} Statements ready to attach to this table's own CREATE TABLE, or an empty string.
 */
const getVersioningStatementsForTable = ({
	tableName,
	canonicalTableName,
	periodForSystemTime,
	archiveEnabled,
	archiveTable,
}) => {
	/** @type {string[]} */
	const readyStatements = [];

	pendingVersioningStatements = pendingVersioningStatements.filter(pending => {
		if (pending.targetTableName !== canonicalTableName) {
			return true;
		}
		readyStatements.push(pending.statement);
		return false;
	});

	/** @type {{ targetTableName: string; statement: string }[]} */
	const candidates = [];

	if (periodForSystemTime?.historyTable) {
		candidates.push({
			targetTableName: toUpper(periodForSystemTime.historyTable),
			statement: assignTemplates({
				template: templates.addVersioning,
				templateData: { tableName, historyTableName: periodForSystemTime.historyTable },
			}),
		});
	}

	if (archiveEnabled && archiveTable) {
		candidates.push({
			targetTableName: toUpper(archiveTable),
			statement: assignTemplates({
				template: templates.enableArchive,
				templateData: { tableName, archiveTableName: archiveTable },
			}),
		});
	}

	candidates.forEach(candidate => {
		if (renderedTableNames.has(candidate.targetTableName)) {
			readyStatements.push(candidate.statement);
		} else {
			pendingVersioningStatements.push(candidate);
		}
	});

	renderedTableNames.add(canonicalTableName);

	return readyStatements.length > 0 ? '\n\n' + readyStatements.join('\n\n') : '';
};

/**
 * Create table DDL.
 *
 * @param {CreateTableParams} tableData Table data.
 * @param {boolean} [isActivated] Activation flag.
 * @returns {string} Table DDL.
 */
const createTable = (tableData, isActivated = true) => {
	const {
		columnDefinitions,
		columns,
		foreignKeyConstraints,
		keyConstraints,
		checkConstraints,
		name,
		schemaData,
		auxiliary,
		auxiliaryBaseTable,
		auxiliaryBaseColumn,
		auxiliaryAppend,
		auxiliaryPart,
		tableKind,
		likeTable,
		gttCcsid,
		mqtQuery,
		mqtDataOption,
		mqtRefresh,
		mqtMaintainedBy,
		mqtQueryOptimization,
		inClauseType,
		databaseName,
		table_tablespace_name,
		acceleratorName,
		tableOptions,
		partitioning,
		periodForSystemTime,
		periodForBusinessTime,
		archiveEnabled,
		archiveTable,
		description,
		tableProperties,
	} = tableData;
	const tableType = getTableType({ auxiliary, tableKind });
	const tableName = getNamePrefixedWithSchemaName({ name, schemaName: schemaData.schemaName });
	const comment = getTableCommentStatement({ tableName, description });

	if (auxiliary) {
		const auxiliaryOptions = getTableOptions({
			auxiliary: true,
			auxiliaryBaseTable,
			auxiliaryBaseColumn,
			auxiliaryAppend,
			auxiliaryPart,
		});
		const createTableStatement = assignTemplates({
			template: templates.createAuxiliaryTable,
			templateData: {
				name: tableName,
				tableType,
				tableOptions: auxiliaryOptions,
			},
		});
		const commentStatement = comment ? '\n' + comment + '\n' : '\n';

		return commentDeactivatedStatement(createTableStatement + commentStatement, {
			isActivated,
		});
	}

	if (tableKind === 'globalTemporary') {
		const globalTemporaryTableProps = likeTable
			? ` LIKE ${likeTable}`
			: getTableProps({
					columns: columns ?? [],
					foreignKeyConstraints: [],
					keyConstraints: [],
					checkConstraints: [],
					isActivated,
				});
		const createTableStatement = assignTemplates({
			template: templates.createTable,
			templateData: {
				name: tableName,
				tableProps: globalTemporaryTableProps,
				tableType,
				tableOptions: gttCcsid ? ` CCSID ${gttCcsid}` : '',
			},
		});
		const commentStatement = comment ? '\n' + comment + '\n' : '\n';

		return commentDeactivatedStatement(createTableStatement + commentStatement, {
			isActivated,
		});
	}

	const isMaterializedQuery = tableKind === 'materializedQuery';
	// PERIOD SYSTEM_TIME/BUSINESS_TIME must not be specified with IN ACCELERATOR.
	const canHaveTemporalPeriods = inClauseType !== 'accelerator';
	// The optional CREATE TABLE tableName (col1, col2, ...) AS (fullselect) result-column list is derived
	// from the modeled columns (rather than re-parsed from the fullselect), so it always reflects any
	// renames made in Studio after reverse engineering.
	const mqtResultColumns = (columnDefinitions ?? [])
		.filter(columnDefinition => columnDefinition.isActivated ?? true)
		.map(columnDefinition => wrapInQuotes(columnDefinition.name))
		.join(', ');
	const tableProps = isMaterializedQuery
		? mqtResultColumns
			? `\n(${mqtResultColumns})`
			: ''
		: getTableProps({
				columns: columns ?? [],
				foreignKeyConstraints: foreignKeyConstraints ?? [],
				keyConstraints: keyConstraints ?? [],
				checkConstraints: checkConstraints ?? [],
				periodForSystemTime: canHaveTemporalPeriods ? periodForSystemTime : undefined,
				periodForBusinessTime: canHaveTemporalPeriods ? periodForBusinessTime : undefined,
				isActivated,
			});
	const renderedTableOptions = getTableOptions({
		tableKind,
		mqtQuery,
		mqtDataOption,
		mqtRefresh,
		mqtMaintainedBy,
		mqtQueryOptimization,
		inClauseType,
		databaseName,
		table_tablespace_name,
		acceleratorName,
		tableOptions,
		partitioning,
		tableProperties,
	});

	const columnComments = getColumnComments({ tableName, columnDefinitions });
	const commentStatements = comment || columnComments ? '\n' + comment + columnComments : '\n';

	const createTableDdl = assignTemplates({
		template: templates.createTable,
		templateData: {
			name: tableName,
			tableProps,
			tableType,
			tableOptions: renderedTableOptions,
		},
	});
	const versioningStatements = getVersioningStatementsForTable({
		tableName,
		canonicalTableName: toUpper(`${schemaData.schemaName}.${name}`),
		periodForSystemTime: canHaveTemporalPeriods ? periodForSystemTime : undefined,
		archiveEnabled,
		archiveTable,
	});

	return commentDeactivatedStatement(createTableDdl + commentStatements + versioningStatements, {
		isActivated,
	});
};

/**
 * Drop table DDL.
 *
 * @param {{ tableName: string }} params Table name.
 * @returns {string} Drop table DDL.
 */
const dropTable = ({ tableName }) => assignTemplates({ template: templates.dropTable, templateData: { tableName } });

/**
 * Add column DDL.
 *
 * @param {{ tableName: string; columnDefinition: string }} params Add column params.
 * @returns {string} Add column DDL.
 */
const addColumn = ({ tableName, columnDefinition }) =>
	assignTemplates({ template: templates.addColumn, templateData: { tableName, columnDefinition } });

/**
 * Drop column DDL.
 *
 * @param {{ tableName: string; columnName: string }} params Drop column params.
 * @returns {string} Drop column DDL.
 */
const dropColumn = ({ tableName, columnName }) =>
	assignTemplates({ template: templates.dropColumn, templateData: { tableName, columnName } });

/**
 * Drop view DDL.
 *
 * @param {{ viewName: string }} params View name.
 * @returns {string} Drop view DDL.
 */
const dropView = ({ viewName }) => assignTemplates({ template: templates.dropView, templateData: { viewName } });

/**
 * Hydrate index data.
 *
 * @param {IndexData} indexData Index data.
 * @param {unknown} [tableData] Table data.
 * @param {SchemaData} [schemaData] Schema data.
 * @returns {IndexData} Hydrated index.
 */
const hydrateIndex = (indexData, tableData, schemaData) => {
	const isParentActivated = get(tableData, '[0].isActivated', true);

	return {
		...indexData,
		schemaName: schemaData?.schemaName,
		isParentActivated,
	};
};

/**
 * Create index DDL.
 *
 * @param {string} tableName Table name.
 * @param {IndexData} index Index data.
 * @returns {string} Index DDL.
 */
const createIndex = (tableName, index) => {
	if (!index?.indxName || !index?.indxKey?.length) {
		return '';
	}

	const indexName = getIndexName({ index });
	const indexType = getIndexType({ index });
	const indexOptions = getIndexOptions({ index });
	const indexTableName = getNamePrefixedWithSchemaName({ name: tableName, schemaName: index.schemaName });
	const statement = assignTemplates({
		template: templates.createIndex,
		templateData: { indexType, indexName, indexOptions, indexTableName },
	});
	const commentStatement = getIndexCommentStatement({
		indexName: trim(indexName),
		description: index.indxDescription,
	});

	let finalStatement = commentDeactivatedStatement(statement, {
		isActivated: Boolean(index.isActivated && index.isParentActivated),
	});

	if (commentStatement) {
		finalStatement +=
			'\n' +
			commentDeactivatedStatement(commentStatement, {
				isPartOfLine: true,
				isActivated: Boolean(index.isActivated && index.isParentActivated),
			}) +
			'\n';
	}

	return finalStatement;
};

/**
 * Drop index DDL.
 *
 * @param {string} name Index name.
 * @returns {string} Drop index DDL.
 */
const dropIndex = name => {
	if (!name) {
		return '';
	}

	return assignTemplates({ template: templates.dropIndex, templateData: { name } });
};

/**
 * Hydrate view column.
 *
 * @param {HydrateViewColumnParams} data View column data.
 * @returns {HydratedViewColumn} Hydrated view column.
 */
const hydrateViewColumn = data => ({
	name: data.name,
	tableName: data.entityName,
	alias: data.alias,
	isActivated: data.isActivated,
	dbName: data.dbName,
});

/**
 * Hydrate view data.
 *
 * @param {HydrateViewParams} params View input.
 * @returns {HydratedView} Hydrated view.
 */
const hydrateView = ({ viewData, entityData }) => {
	const detailsTab = entityData[0] ?? {};

	return {
		name: viewData.name,
		keys: viewData.keys,
		selectStatement: detailsTab.selectStatement,
		tableName: viewData.tableName,
		schemaName: viewData.schemaData?.schemaName ?? viewData.schemaName,
		description: detailsTab.description,
		viewProperties: detailsTab.viewProperties,
		withCheckOption: detailsTab.withCheckOption,
		checkTestingScope: detailsTab.checkTestingScope,
	};
};

/**
 * Create view DDL.
 *
 * @param {HydratedView} viewData View data.
 * @param {unknown} _dbData Database data.
 * @param {boolean} [isActivated] Activation flag.
 * @returns {string} View DDL.
 */
const createView = (viewData, _dbData, isActivated = true) => {
	const viewName = getNamePrefixedWithSchemaName({ name: viewData.name, schemaName: viewData.schemaName });

	const { columns, tables } = getViewData({ keys: viewData.keys });
	const columnsAsString = getViewColumnsAsString({ columns });
	const commentStatement = getTableCommentStatement({
		tableName: viewName,
		description: viewData.description,
	});
	const comment = commentStatement ? '\n' + commentStatement + `\n` : '\n';
	const viewProperties = viewData.viewProperties ? ' \n' + setTab({ text: viewData.viewProperties }) : '';
	const withCheckOption = getWithCheckOptionClause({
		withCheckOption: viewData.withCheckOption,
		checkTestingScope: viewData.checkTestingScope,
	});
	const viewColumns = columns.length > 0 ? ` (${columnsAsString}\n\t)` : '';

	const rawSelectStatement = viewData.selectStatement ?? '';
	const selectStatement = trim(rawSelectStatement)
		? trim(setTab({ text: rawSelectStatement }))
		: assignTemplates({
				template: templates.viewSelectStatement,
				templateData: {
					tableName: tables.join(', '),
					keys: columnsAsString,
				},
			});

	const statement = assignTemplates({
		template: templates.createView,
		templateData: {
			name: viewName,
			viewColumns,
			viewProperties,
			withCheckOption,
			selectStatement,
		},
	});

	return commentDeactivatedStatement(statement + comment, { isActivated });
};

/**
 * Comment a statement when deactivated.
 *
 * @param {string} statement Statement text.
 * @param {{ isActivated?: boolean; isPartOfLine?: boolean }} [data] Comment options.
 * @param {boolean} [isPartOfLine] Inline flag.
 * @returns {string} Possibly commented statement.
 */
const commentIfDeactivated = (statement, data = {}, isPartOfLine) =>
	commentDeactivatedStatement(statement, {
		isActivated: data.isActivated ?? true,
		isPartOfLine: data.isPartOfLine ?? isPartOfLine,
	});

/**
 * Force-comment a statement.
 *
 * @param {string} statement Statement text.
 * @returns {string} Commented statement.
 */
const commentStatement = statement => commentDeactivatedStatement(statement, { isActivated: false });

/**
 * Prepare a quoted identifier.
 *
 * @param {string} name Identifier.
 * @returns {string} Quoted name.
 */
const prepareName = name => wrapInQuotes(name);

/**
 * Create Db2 z/OS DDL provider.
 *
 * @param {unknown} _baseProvider Base provider.
 * @param {unknown} _options Provider options.
 * @param {unknown} _app App instance.
 * @returns {DdlProvider} DDL provider.
 */
module.exports = (_baseProvider, _options, _app) => ({
	getDefaultType,
	getTypesDescriptors,
	hasType: providerHasType,
	hydrateSchema,
	createSchema,
	createSchemaSequences,
	dropSchema,
	alterSchema,
	createUdt,
	hydrateColumn,
	hydrateJsonSchemaColumn,
	convertColumnDefinition,
	hydrateCheckConstraint,
	createCheckConstraint,
	createForeignKeyConstraint,
	createForeignKey,
	hydrateTable,
	createTable,
	dropTable,
	addColumn,
	dropColumn,
	dropView,
	hydrateIndex,
	createIndex,
	dropIndex,
	hydrateViewColumn,
	hydrateView,
	createView,
	commentIfDeactivated,
	commentStatement,
	prepareName,
});
