/**
 * @import {
 *   CheckConstraintInput,
 *   ContainerData,
 *   CreateSchemaParams,
 *   CreateTableParams,
 *   DdlProvider,
 *   DropSchemaParams,
 *   ForeignKeyInput,
 *   ForeignKeyStatement,
 *   HydrateColumnParams,
 *   HydratedCheckConstraint,
 *   HydratedColumn,
 *   HydratedTable,
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

const lodash = require('lodash');
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
const { getColumnConstraints } = require('./ddlHelpers/columnDefinition/getColumnConstraints.js');
const {
	getTableCommentStatement,
	getColumnComments,
	getSchemaCommentStatement,
	getIndexCommentStatement,
} = require('./ddlHelpers/comment/commentHelper.js');
const { getTableProps } = require('./ddlHelpers/table/getTableProps.js');
const { getTableOptions } = require('./ddlHelpers/table/getTableOptions.js');
const { getViewData } = require('./ddlHelpers/view/getViewData.js');
const { getTableType } = require('./ddlHelpers/table/getTableType.js');
const { hydrateAuxiliaryTableData } = require('./ddlHelpers/table/hydrateAuxiliaryTableData.js');
const { hydratePartitioning, hydrateTemporalPeriod } = require('./ddlHelpers/table/hydrateZosTableData.js');
const { joinActivatedAndDeactivatedStatements } = require('../utils/joinActivatedAndDeactivatedStatements');
const { getIndexName } = require('./ddlHelpers/index/getIndexName.js');
const { getIndexType } = require('./ddlHelpers/index/getIndexType.js');
const { getIndexOptions } = require('./ddlHelpers/index/getIndexOptions.js');

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
 * @returns {SchemaData} Hydrated schema.
 */
const hydrateSchema = containerData => ({
	schemaName: containerData.name,
	isActivated: containerData.isActivated,
	description: containerData.description,
});

/**
 * Create schema DDL.
 *
 * @param {CreateSchemaParams} params Schema params.
 * @returns {string} Schema DDL.
 */
const createSchema = ({ schemaName, description, isActivated = true }) => {
	const wrappedSchemaName = wrapInQuotes(schemaName);
	const schemaStatement = assignTemplates({
		template: templates.createSchema,
		templateData: {
			schemaName: wrappedSchemaName,
		},
	});

	const comment = getSchemaCommentStatement({ schemaName: wrappedSchemaName, description });
	const commentStatement = comment ? '\n' + comment + '\n' : '\n';

	return commentDeactivatedStatement(schemaStatement + commentStatement, { isActivated });
};

/**
 * Drop schema DDL.
 *
 * @param {DropSchemaParams} params Schema params.
 * @returns {string} Drop schema DDL.
 */
const dropSchema = ({ name, isActivated = true }) => {
	const dropSchemaStatement = assignTemplates({
		template: templates.dropSchema,
		templateData: {
			schemaName: wrapInQuotes(name),
		},
	});

	return commentDeactivatedStatement(dropSchemaStatement, { isActivated });
};

/**
 * Alter schema DDL.
 *
 * @param {string} schemaName Schema name.
 * @returns {string} Alter schema DDL.
 */
const alterSchema = schemaName =>
	assignTemplates({
		template: templates.alterSchema,
		templateData: {
			schemaName: wrapInQuotes(schemaName),
		},
	});

/**
 * Hydrate column definition.
 *
 * @param {HydrateColumnParams} params Column input.
 * @returns {HydratedColumn} Hydrated column.
 */
const hydrateColumn = ({ columnDefinition, jsonSchema, schemaData, definitionJsonSchema }) => {
	const definitionSchema = definitionJsonSchema ?? {};
	const isUDTRef = !!jsonSchema.$ref;
	const type = isUDTRef ? (columnDefinition.type ?? '') : lodash.toUpper(jsonSchema.mode ?? jsonSchema.type);
	const itemsSchema = Array.isArray(jsonSchema.items) ? jsonSchema.items[0] : jsonSchema.items;
	const itemsType = lodash.toUpper(itemsSchema?.mode ?? itemsSchema?.type ?? '');

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
		scale: columnDefinition.scale,
		precision: columnDefinition.precision,
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
		columnGenerationExpression: jsonSchema.columnGenerationExpression,
		generated: jsonSchema.generated,
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
	if (!jsonSchema.$ref || lodash.isEmpty(definitionJsonSchema)) {
		return jsonSchema;
	}
	const { $ref: _ref, ...jsonSchemaWithoutRef } = jsonSchema;

	return { ...definitionJsonSchema, ...jsonSchemaWithoutRef };
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
			expression: lodash.trim(expression).replace(/^\(([\s\S]*)\)$/u, '$1'),
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
		statement: lodash.trim(foreignKeyStatement),
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
		statement: lodash.trim(foreignKeyStatement) + '\n',
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
	};
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
		inClauseType,
		databaseName,
		table_tablespace_name,
		acceleratorName,
		tableOptions,
		partitioning,
		periodForSystemTime,
		periodForBusinessTime,
		description,
		tableProperties,
	} = tableData;
	const tableType = getTableType({ auxiliary });
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

	const tableProps = getTableProps({
		columns: columns ?? [],
		foreignKeyConstraints: foreignKeyConstraints ?? [],
		keyConstraints: keyConstraints ?? [],
		checkConstraints: checkConstraints ?? [],
		isActivated,
	});
	const renderedTableOptions = getTableOptions({
		inClauseType,
		databaseName,
		table_tablespace_name,
		acceleratorName,
		tableOptions,
		partitioning,
		periodForSystemTime,
		periodForBusinessTime,
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

	return commentDeactivatedStatement(createTableDdl + commentStatements, {
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
	const isParentActivated = lodash.get(tableData, '[0].isActivated', true);

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
		indexName: lodash.trim(indexName),
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
	const selectStatement = lodash.trim(rawSelectStatement)
		? lodash.trim(setTab({ text: rawSelectStatement }))
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
	dropSchema,
	alterSchema,
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
