/** Shared DTOs and ddlProvider method signatures for Db2 for z/OS forward engineering. */

export type AppModule = unknown;

export interface App {
	require: (libName: string) => AppModule;
	utils: object;
}

export type BaseProvider = object;

export type DdlProviderOptions = {
	isUpdateScript?: boolean;
	additionalOptions?: unknown;
	origin?: string;
	fakerLocalization?: string;
	showIndexStatementsInEndDdl?: boolean;
	targetScriptOptions?: { keyword?: string };
};

export type KeyRef = {
	keyId?: string;
	type?: string;
	name?: string;
	isActivated?: boolean;
};

export type FieldListRef = KeyRef[];

export type IdentityOptions = {
	generated?: string;
	start?: number;
	increment?: number;
	cycle?: string;
	minValue?: number;
	maxValue?: number;
	cache?: string;
	cacheValue?: number;
	order?: string;
};

export type ColumnDefinitionInput = {
	name: string;
	entityName?: string;
	type?: string;
	nullable?: boolean;
	default?: DefaultValue;
	isActivated?: boolean;
	scale?: number;
	precision?: number;
	length?: number;
};

export type KeyOptions = {
	id?: string;
	constraintName?: string;
};

export type JsonSchemaColumn = {
	$ref?: string;
	mode?: string;
	type?: string;
	description?: string;
	refDescription?: string;
	primaryKey?: boolean;
	unique?: boolean;
	compositePrimaryKey?: boolean;
	compositeUniqueKey?: boolean;
	primaryKeyOptions?: KeyOptions;
	uniqueKeyOptions?: KeyOptions;
	fractSecPrecision?: number;
	withTimeZone?: boolean;
	lengthSemantics?: string;
	identity?: IdentityOptions;
	characterSubtype?: string;
	ccsid?: number;
	inlineLength?: number;
	generatedColumn?: boolean;
	columnGenerationExpression?: string;
	generated?: string;
	items?: JsonSchemaColumn | JsonSchemaColumn[];
	ofType?: string;
	notPersistable?: boolean;
	size?: string | number;
	checkConstraints?: unknown;
	GUID?: string;
	isActivated?: boolean;
	code?: string;
	name?: string;
	collectionName?: string;
	bucketName?: string;
	properties?: Record<string, JsonSchemaColumn>;
};

export type CompositeKeyGroup = {
	constraintName?: string;
	compositePrimaryKey?: KeyRef[];
	compositeUniqueKey?: KeyRef[];
	indexComment?: string;
	alternateKey?: boolean;
} & KeyOptions;

export type JsonSchema = JsonSchemaColumn & {
	properties?: Record<string, JsonSchemaColumn>;
	primaryKey?: CompositeKeyGroup[];
	uniqueKey?: CompositeKeyGroup[];
};

export type HydratedColumn = {
	name: string;
	entityName?: string;
	type: string;
	ofType?: string;
	notPersistable?: boolean;
	size?: string | number;
	primaryKey: boolean;
	primaryKeyOptions?: KeyOptions;
	unique: boolean;
	uniqueKeyOptions?: KeyOptions;
	nullable?: boolean;
	default?: DefaultValue;
	comment?: string;
	isActivated?: boolean;
	scale?: number;
	precision?: number;
	length?: number;
	schemaName?: string;
	fractSecPrecision?: number;
	withTimeZone?: boolean;
	lengthSemantics?: string;
	identity?: IdentityOptions;
	characterSubtype?: string;
	ccsid?: number;
	inlineLength?: number;
	generatedColumn?: boolean;
	columnGenerationExpression?: string;
	generated?: string;
	isUDTRef?: boolean;
	itemsType?: string;
};

export type SchemaData = {
	schemaName: string;
	isActivated?: boolean;
	description?: string;
};

export type ContainerData = {
	name: string;
	isActivated?: boolean;
	description?: string;
};

export type CreateSchemaParams = {
	schemaName: string;
	description?: string;
	isActivated?: boolean;
};

export type DropSchemaParams = {
	name: string;
	isActivated?: boolean;
};

export type TableOptionsBlock = {
	editProc?: string;
	editProcRowAttributes?: string;
	validProc?: string;
	audit?: string;
	obid?: number;
	dataCapture?: string;
	withRestrictOnDrop?: boolean;
	ccsid?: string;
	volatile?: string;
	logged?: string;
	compress?: string;
	append?: string;
	dssize?: number;
	bufferPool?: string;
	memberCluster?: boolean;
	trackMod?: string;
	pageNum?: string;
	keyLabelMode?: string;
	keyLabelName?: string;
};

export type PartitionEntry = {
	partitionNumber?: number;
	endingAt?: string;
	inclusive?: boolean;
};

export type PartitioningConfig = {
	partitionBy?: string;
	everySize?: number;
	partitionKey?: KeyRef[];
	nullsLast?: boolean;
	partitions?: PartitionEntry[];
};

export type PeriodConfig = {
	startColumn?: FieldListRef;
	endColumn?: FieldListRef;
	endInclusive?: string;
	historyTable?: string;
};

export type HydratedTemporalPeriod = {
	startColumn?: string;
	endColumn?: string;
	endInclusive?: string;
};

export type HydratedPartitionKey = {
	name: string;
	type?: string;
	isActivated?: boolean;
};

export type HydratedPartitioning = {
	partitionBy?: string;
	everySize?: number;
	partitionKey?: HydratedPartitionKey[];
	nullsLast?: boolean;
	partitions?: PartitionEntry[];
};

export type EntityDetailsTab = {
	description?: string;
	tableProperties?: string;
	inClauseType?: string;
	databaseName?: string;
	table_tablespace_name?: string;
	acceleratorName?: string;
	tableOptions?: TableOptionsBlock;
	partitioning?: PartitioningConfig | PartitioningConfig[];
	periodForSystemTime?: PeriodConfig | PeriodConfig[];
	periodForBusinessTime?: PeriodConfig | PeriodConfig[];
	auxiliaryBaseTable?: string;
	auxiliaryBaseColumn?: FieldListRef;
	auxiliaryAppend?: string;
	auxiliaryPart?: number;
	tableKind?: string;
	likeTable?: string;
	gttCcsid?: string;
	mqtQuery?: string;
	mqtDataOption?: string;
	mqtRefresh?: string;
	mqtMaintainedBy?: string;
	mqtQueryOptimization?: string;
	archiveEnabled?: boolean;
	archiveTable?: string;
	selectStatement?: string;
	withCheckOption?: boolean;
	checkTestingScope?: string;
	viewProperties?: string;
};

export type KeyConstraintColumn = {
	name?: string;
	isActivated?: boolean;
	type?: string;
};

export type KeyConstraint = {
	keyType: string;
	constraintName?: string;
	columns: KeyConstraintColumn[];
};

export type AlterKeyConfig = {
	keyType: string;
	name: string;
	columns: KeyConstraintColumn[];
	options?: KeyOptions;
};

export type AlterKeyStatement = {
	statement: string;
	isActivated: boolean;
};

export type ForeignKeyStatement = {
	statement: string;
	isActivated: boolean;
};

export type ForeignKeyInput = {
	name?: string;
	foreignKey: KeyConstraintColumn[] | string;
	primaryTable: string;
	primaryKey: KeyConstraintColumn[] | string;
	primaryTableActivated?: boolean;
	foreignTableActivated?: boolean;
	primarySchemaName?: string;
	foreignSchemaName?: string;
	foreignTable?: string;
	customProperties?: {
		relationshipOnDelete?: string;
		relationshipEnforced?: string;
	};
};

export type HydratedTable = {
	name: string;
	schemaData: SchemaData;
	relatedSchemas?: Record<string, JsonSchema>;
	keyConstraints?: KeyConstraint[];
	checkConstraints?: string[];
	description?: string;
	tableProperties?: string;
	auxiliary?: boolean;
	auxiliaryAppend?: string;
	auxiliaryPart?: number;
	auxiliaryBaseTable?: string;
	auxiliaryBaseColumn?: string;
	tableKind?: string;
	likeTable?: string;
	gttCcsid?: string;
	mqtQuery?: string;
	mqtDataOption?: string;
	mqtRefresh?: string;
	mqtMaintainedBy?: string;
	mqtQueryOptimization?: string;
	inClauseType?: string;
	databaseName?: string;
	table_tablespace_name?: string;
	acceleratorName?: string;
	tableOptions?: TableOptionsBlock;
	partitioning?: HydratedPartitioning;
	periodForSystemTime?: HydratedTemporalPeriod;
	periodForBusinessTime?: HydratedTemporalPeriod;
	columnDefinitions?: HydratedColumn[];
	columns?: string[];
	foreignKeyConstraints?: ForeignKeyStatement[];
};

export type CreateTableParams = {
	columnDefinitions?: HydratedColumn[];
	columns?: string[];
	foreignKeyConstraints?: ForeignKeyStatement[];
	keyConstraints?: KeyConstraint[];
	checkConstraints?: string[];
	name: string;
	schemaData: SchemaData;
	description?: string;
	tableProperties?: string;
	auxiliary?: boolean;
	auxiliaryAppend?: string;
	auxiliaryPart?: number;
	auxiliaryBaseTable?: string;
	auxiliaryBaseColumn?: string;
	tableKind?: string;
	likeTable?: string;
	gttCcsid?: string;
	mqtQuery?: string;
	mqtDataOption?: string;
	mqtRefresh?: string;
	mqtMaintainedBy?: string;
	mqtQueryOptimization?: string;
	inClauseType?: string;
	databaseName?: string;
	table_tablespace_name?: string;
	acceleratorName?: string;
	tableOptions?: TableOptionsBlock;
	partitioning?: HydratedPartitioning;
	periodForSystemTime?: HydratedTemporalPeriod;
	periodForBusinessTime?: HydratedTemporalPeriod;
};

export type HydratedViewColumn = {
	name: string;
	tableName?: string;
	alias?: string;
	isActivated?: boolean;
	dbName?: string;
};

export type HydratedView = {
	name: string;
	keys?: HydratedViewColumn[];
	selectStatement?: string;
	tableName?: string;
	schemaName?: string;
	schemaData?: SchemaData;
	description?: string;
	viewProperties?: string;
	withCheckOption?: boolean;
	checkTestingScope?: string;
};

export type CheckConstraintInput = {
	chkConstrName?: string;
	constrExpression?: string;
	constrComments?: string;
	constrDescription?: string;
	constrEnforced?: string;
};

export type HydratedCheckConstraint = {
	name?: string;
	expression?: string;
	comments?: string;
	description?: string;
	enforced?: string;
};

export type IndexKeyRef = {
	name?: string;
	type?: string;
	isActivated?: boolean;
};

export type IndexData = {
	indxName?: string;
	indxType?: string;
	indxKey?: IndexKeyRef[];
	indxIncludeKey?: IndexKeyRef[];
	indxCompress?: string;
	indxNullKeys?: string;
	indxCluster?: string;
	indxPartitioned?: boolean;
	indxPadded?: string;
	indxUsingType?: string;
	indxStogroup?: string;
	indxVcat?: string;
	indxPriQty?: number;
	indxSecQty?: number;
	indxErase?: string;
	indxFreepage?: number;
	indxPctfree?: number;
	indxDefine?: string;
	indxBufferPool?: string;
	indxClose?: string;
	indxDefer?: string;
	indxCopy?: string;
	indxPiecesize?: number;
	indxPiecesizeUnit?: string;
	indxProperties?: string;
	indxDescription?: string;
	indxComments?: string;
	isActivated?: boolean;
	schemaName?: string;
	isParentActivated?: boolean;
};

export type ViewSelectColumn = {
	statement: string;
	isActivated?: boolean;
};

export type TypeDescriptors = Record<string, Record<string, unknown>>;

export type DefaultTypesMap = Record<string, string>;

export type TemplateData = Record<string, string | number | boolean | undefined>;

export type OptionConfig = {
	key: string;
	getValue: (value: any, data: object) => string;
};

export type ActivatedKey = {
	name?: string;
	isActivated?: boolean;
	statement?: string;
	type?: string;
};

export type DefaultValue = string | number | boolean;

export type CompMod = {
	collectionName?: PropertyPair<string>;
	keyspaceName?: string;
	isActivated?: PropertyPair<boolean>;
	bucketProperties?: { isActivated?: boolean };
};

export type ModelObject = {
	code?: string;
	collectionName?: string;
	name?: string;
	compMod?: CompMod;
	role?: { properties?: unknown; isActivated?: boolean; compMod?: CompMod };
};

export type JsonSchemaPropertyCallback = (params: {
	propertyName: string;
	property: WalkableSchema;
	path: string[];
}) => void;

export type DividedConstraints = {
	activatedItems: string[];
	deactivatedItems: string[];
};

export type ColumnConstraintParams = {
	nullable?: boolean;
	unique: boolean;
	primaryKey: boolean;
	primaryKeyOptions?: KeyOptions;
	uniqueKeyOptions?: KeyOptions;
	entityName?: string;
};

export type ColumnDefaultParams = {
	default?: DefaultValue;
	identity?: IdentityOptions;
	type: string;
	generated?: string;
	generatedColumn?: boolean;
	columnGenerationExpression?: string;
};

export type HydratePartitioningParams = {
	jsonSchema: JsonSchema;
	partitioning?: PartitioningConfig | PartitioningConfig[];
};

export type HydrateTemporalPeriodParams = {
	jsonSchema: JsonSchema;
	period?: PeriodConfig | PeriodConfig[];
};

export type HydrateAuxiliaryTableParams = {
	tableData: HydratedTable;
	detailsTab: EntityDetailsTab;
};

export type HydrateGlobalTemporaryTableParams = {
	tableData: HydratedTable;
	detailsTab: EntityDetailsTab;
};

export type ConstraintOptionsResult = {
	constraintString: string;
	statement: string;
};

export type OptionsByConfigsParams = {
	configs: OptionConfig[];
	data: object;
};

export type DelimiterParams = {
	index: number;
	numberOfStatements: number;
	lastIndexOfActivatedStatement: number;
	delimiter: string;
};

export type JoinStatementsParams = {
	statements: string[];
	delimiter?: string;
	indent?: string;
};

export type TablePropsParams = {
	columns: string[];
	foreignKeyConstraints: ForeignKeyStatement[];
	keyConstraints: KeyConstraint[];
	checkConstraints?: string[];
	isActivated: boolean;
};

export type TemporalPeriodsParams = {
	periodForSystemTime?: HydratedTemporalPeriod;
	periodForBusinessTime?: HydratedTemporalPeriod;
};

export type ViewData = {
	tables: string[];
	columns: ViewSelectColumn[];
};

export type HydrateColumnParams = {
	columnDefinition: ColumnDefinitionInput;
	jsonSchema: JsonSchemaColumn;
	schemaData: SchemaData;
	definitionJsonSchema?: JsonSchemaColumn;
};

export type HydrateTableParams = {
	tableData: HydratedTable;
	entityData: EntityDetailsTab[];
	jsonSchema: JsonSchema;
};

export type InClauseParams = {
	inClauseType?: string;
	databaseName?: string;
	table_tablespace_name?: string;
	acceleratorName?: string;
};

export type BasicValueParams<T> = {
	prefix?: string;
	postfix?: string;
	modifier?: (value: T) => T;
};

export type DivideItemsParams<T, K> = {
	items: T[];
	mapFunction: (item: T) => K;
};

export type DividedItems<K> = {
	activatedItems: K[];
	deactivatedItems: K[];
};

export type CommentDeactivatedOptions = {
	isActivated?: boolean;
	isPartOfLine?: boolean;
	inlineComment?: string;
};

export type FieldComparisonParams = {
	oldField: Record<string, unknown>;
	newField: Record<string, unknown>;
};

export type PropertyChanges = Record<string, { new?: unknown; old?: unknown }>;

export type ToArrayParams<T> = {
	value: T | T[];
};

export type PropertyPair<T> = {
	new?: T;
	old?: T;
};

export type CommentStatementParams = {
	objectName: string;
	objectType: string;
	description?: string;
	mode?: string;
};

export type ColumnCommentParams = {
	tableName: string;
	columnName: string;
	description?: string;
};

export type HydrateKeyOptionsParams = {
	columnName?: string;
	isActivated?: boolean;
	options?: KeyOptions | CompositeKeyGroup;
	keyType: string;
	entityName?: string;
};

export type KeyPropertyLookupParams = {
	keyId?: string;
	properties: Record<string, JsonSchemaColumn>;
};

export type ForeignKeyCustomPropertiesParams = {
	customProperties?: ForeignKeyInput['customProperties'];
};

export type IdToNameMap = Record<string, string>;

/**
 * The subset of a JSON schema the recursive walker needs. `items` is modeled as a schema rather than as the `{ mode,
 * type }` pair `JsonSchemaColumn` carries, so that `Array.isArray` narrows to a schema list instead of `any[]`.
 */
export type WalkableSchema = {
	GUID?: string;
	code?: string;
	name?: string;
	collectionName?: string;
	properties?: Record<string, WalkableSchema>;
	items?: WalkableSchema | WalkableSchema[];
};

export type WalkSchemaParams = {
	jsonSchema: WalkableSchema;
	path: string[];
	callback: JsonSchemaPropertyCallback;
};

export type FieldNameLookupParams = {
	keyRef?: { keyId?: string }[];
	idToNameHashTable: IdToNameMap;
};

export type LengthWithMultiplierParams = {
	type: string;
	length: number;
	lengthSemantics: string;
};

export type ScalePrecisionParams = {
	type: string;
	precision?: number;
	scale?: number;
};

export type HydrateViewColumnParams = {
	name: string;
	entityName?: string;
	alias?: string;
	isActivated?: boolean;
	dbName?: string;
};

export type HydrateViewParams = {
	viewData: HydratedView;
	entityData: EntityDetailsTab[];
};

export type DdlProvider = {
	getDefaultType(type: string): string | undefined;
	getTypesDescriptors(): TypeDescriptors;
	hasType(type: string): boolean;

	hydrateSchema(containerData: ContainerData, data?: unknown): SchemaData;
	createSchema(params: CreateSchemaParams): string;
	dropSchema(params: DropSchemaParams): string;
	alterSchema(schemaName: string, data?: unknown): string;

	hydrateColumn(params: HydrateColumnParams): HydratedColumn;
	hydrateJsonSchemaColumn(jsonSchema: JsonSchemaColumn, definitionJsonSchema: JsonSchemaColumn): JsonSchemaColumn;
	convertColumnDefinition(columnDefinition: HydratedColumn, template?: string): string;
	addColumn(params: { tableName: string; columnDefinition: string }): string;
	dropColumn(params: { tableName: string; columnName: string }): string;

	hydrateTable(params: HydrateTableParams): HydratedTable;
	createTable(params: CreateTableParams, isActivated?: boolean): string;
	dropTable(params: { tableName: string }): string;

	createForeignKeyConstraint(params: ForeignKeyInput, dbData?: unknown, schemaData?: SchemaData): ForeignKeyStatement;
	createForeignKey(params: ForeignKeyInput, dbData?: unknown, schemaData?: SchemaData): ForeignKeyStatement;

	hydrateViewColumn(data: HydrateViewColumnParams): HydratedViewColumn;
	hydrateView(params: HydrateViewParams): HydratedView;
	createView(viewData: HydratedView, dbData?: unknown, isActivated?: boolean): string;
	dropView(params: { viewName: string }): string;

	hydrateCheckConstraint(checkConstraint: CheckConstraintInput): HydratedCheckConstraint;
	createCheckConstraint(params?: HydratedCheckConstraint): string;

	hydrateIndex(indexData: IndexData, tableData?: unknown, schemaData?: SchemaData): IndexData;
	createIndex(tableName?: string, index?: IndexData): string;
	dropIndex(name?: string): string;

	commentIfDeactivated(
		statement: string,
		data?: { isActivated?: boolean; isPartOfLine?: boolean },
		isPartOfLine?: boolean,
	): string;
	commentStatement(statement: string): string;
	prepareName(name: string): string;
};

export type DdlProviderFactory = (
	baseProvider: BaseProvider | null,
	options: DdlProviderOptions | null,
	app: App | null,
) => DdlProvider;
