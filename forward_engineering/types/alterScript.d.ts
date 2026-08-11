/** DTOs describing the Hackolade delta model and the alter-script pipeline for Db2 for z/OS. */

import {
	AlterKeyConfig,
	AlterKeyStatement,
	CheckConstraintInput,
	CompMod,
	CompositeKeyGroup,
	EntityDetailsTab,
	ForeignKeyInput,
	HydratedViewColumn,
	IndexData,
	IndexKeyRef,
	JsonSchemaColumn,
	KeyConstraintColumn,
	PropertyPair,
} from './ddlProvider';

export type ModificationScript = {
	script: string;
	isDropScript: boolean;
};

export type AlterScriptDto = {
	isActivated?: boolean;
	scripts: ModificationScript[];
};

/**
 * Result of checking whether a key moved between its regular (single column) and composite representation. When a
 * transition happened, the key only has to be recreated if its options changed along the way.
 */
export type KeyTransition = {
	didTransitionHappen: boolean;
	wasKeyChangedInTransition?: boolean;
};

export type KeyScriptModification = {
	script: string;
	fullTableName: string;
	isDropScript: boolean;
	isActivated: boolean;
};

export type FieldSnapshot = Record<string, unknown> & {
	name?: string;
};

export type AlterColumnCompMod = {
	oldField: FieldSnapshot;
	newField: FieldSnapshot;
};

export type AlterColumn = JsonSchemaColumn & {
	compMod?: AlterColumnCompMod;
	default?: string | number | boolean | null;
	length?: number;
	maxLength?: number;
	precision?: number;
	scale?: number;
	hasMaxLength?: boolean;
	childType?: string;
	expression?: string;
	refId?: string;
};

export type AlterIndexKey = IndexKeyRef & {
	keyId?: string;
};

export type AlterIndex = Omit<IndexData, 'indxKey' | 'indxIncludeKey'> & {
	id?: string;
	indxKey?: AlterIndexKey[];
	indxIncludeKey?: AlterIndexKey[];
};

export type AlterCollectionCompMod = CompMod & {
	created?: boolean;
	deleted?: boolean;
	modified?: boolean;
	name?: PropertyPair<string>;
	code?: PropertyPair<string>;
	description?: PropertyPair<string>;
	selectStatement?: PropertyPair<string>;
	primaryKey?: PropertyPair<CompositeKeyGroup[]>;
	uniqueKey?: PropertyPair<CompositeKeyGroup[]>;
	chkConstr?: PropertyPair<CheckConstraintInput[]>;
	Indxs?: PropertyPair<AlterIndex[]>;
	oldProperties?: Array<AlterColumn & { id?: string }>;
	collectionData?: {
		collectionRefsDefinitionsMap?: Record<string, ViewDefinitionRef>;
	};
};

export type AlterCollectionRole = {
	id?: string;
	name?: string;
	code?: string;
	collectionName?: string;
	description?: string;
	isActivated?: boolean;
	required?: string[];
	properties?: Record<string, AlterColumn>;
	chkConstr?: CheckConstraintInput[];
	Indxs?: AlterIndex[];
	compMod?: AlterCollectionCompMod;
};

export type AlterCollection = {
	role?: AlterCollectionRole;
	compMod?: AlterCollectionCompMod;
	properties?: Record<string, AlterColumn>;
	required?: string[];
	isActivated?: boolean;
	id?: string;
	name?: string;
	code?: string;
	collectionName?: string;
	description?: string;
	chkConstr?: CheckConstraintInput[];
	Indxs?: AlterIndex[];
	/** Schema name resolved for a `relatedSchemas` entry; not part of the studio's own delta payload. */
	bucketName?: string;
};

export type AlterContainerRole = {
	name: string;
	description?: string;
	isActivated?: boolean;
	compMod?: {
		description?: PropertyPair<string>;
	};
};

export type AlterContainer = {
	role: AlterContainerRole;
	isActivated?: boolean;
};

export type AlterModelDefinitionCompMod = CompMod &
	Partial<AlterColumnCompMod> & {
		created?: boolean;
		deleted?: boolean;
		modified?: boolean;
		name?: PropertyPair<string>;
		description?: PropertyPair<string>;
		mode?: PropertyPair<string>;
		type?: PropertyPair<string>;
		length?: PropertyPair<number>;
		lengthSemantics?: PropertyPair<string>;
		precision?: PropertyPair<number>;
		scale?: PropertyPair<number>;
		fractSecPrecision?: PropertyPair<number>;
		withTimeZone?: PropertyPair<boolean>;
		characterSubtype?: PropertyPair<string>;
		ccsid?: PropertyPair<number>;
		inlineLength?: PropertyPair<number>;
	};

export type AlterModelDefinitionRole = {
	name: string;
	description?: string;
	isActivated?: boolean;
	compMod?: AlterModelDefinitionCompMod;
};

export type AlterModelDefinition = JsonSchemaColumn & {
	name?: string;
	length?: number;
	lengthSemantics?: string;
	precision?: number;
	scale?: number;
	description?: string;
	isActivated?: boolean;
	compMod?: AlterModelDefinitionCompMod;
	role: AlterModelDefinitionRole;
};

export type ViewDefinitionRef = {
	name?: string;
	definition?: JsonSchemaColumn;
	collection?: Array<{ code?: string; collectionName?: string }>;
	bucket?: Array<{ code?: string; name?: string }>;
};

export type AlterView = AlterCollection & EntityDetailsTab;

export type AlterTable = AlterCollection & EntityDetailsTab;

/**
 * `mapProperties` from `@hackolade/ddl-fe-utils`: iterates the properties of a view schema and collects the mapped
 * column definitions.
 */
export type MapPropertiesFn = (
	viewSchema: object,
	callback: (propertyName: string, propertySchema: AlterColumn) => HydratedViewColumn,
) => HydratedViewColumn[];

export type RelationshipEndpoint = {
	bucket?: { name?: string };
	collection?: {
		name?: string;
		fkFields?: KeyConstraintColumn[];
		isActivated?: boolean;
	};
};

export type AlterRelationshipCompMod = {
	created?: boolean;
	deleted?: boolean;
	modified?: boolean;
	name?: PropertyPair<string>;
	code?: PropertyPair<string>;
	isActivated?: PropertyPair<boolean>;
	customProperties?: PropertyPair<ForeignKeyInput['customProperties']>;
	parent?: RelationshipEndpoint;
	child?: RelationshipEndpoint;
};

export type AlterRelationshipRole = {
	id?: string;
	name?: string;
	code?: string;
	childCollection?: string;
	compMod?: AlterRelationshipCompMod;
};

export type AlterRelationship = {
	role: AlterRelationshipRole;
};

/**
 * The Db2 for z/OS specifics of a key kind (primary or unique), so that the composite/regular key diffing can be
 * expressed once and reused for both.
 */
export type AlterKeyKind = {
	keyType: string;
	constraintPostfix: string;
	compModProperty: 'primaryKey' | 'uniqueKey';
	compositeKeyProperty: 'compositePrimaryKey' | 'compositeUniqueKey';
	inlineKeyProperty: 'primaryKey' | 'unique';
	keyOptionsProperty: 'primaryKeyOptions' | 'uniqueKeyOptions';
	buildAlterStatement: (params: {
		tableName: string;
		isParentActivated: boolean;
		keyConfig: AlterKeyConfig;
	}) => AlterKeyStatement;
	buildDropStatement: (params: { tableName: string; constraintName: string }) => string;
};

/** The only key options Db2 for z/OS renders, and therefore the only ones worth diffing. */
export type ComparableKeyOptions = {
	id?: string;
	constraintName?: string;
};

export type CheckConstraintHistoryEntry = {
	old?: CheckConstraintInput;
	new?: CheckConstraintInput;
};

export type DeltaItemWrapper<T> = {
	properties: Record<string, T>;
};

export type DeltaBucket<T> = {
	items?: DeltaItemWrapper<T> | Array<DeltaItemWrapper<T>>;
};

export type DeltaSection<T> = {
	properties?: {
		added?: DeltaBucket<T>;
		deleted?: DeltaBucket<T>;
		modified?: DeltaBucket<T>;
	};
};

export type DeltaModel = {
	properties?: {
		containers?: DeltaSection<AlterContainer>;
		entities?: DeltaSection<AlterTable>;
		views?: DeltaSection<AlterView>;
		relationships?: DeltaSection<AlterRelationship>;
		modelDefinitions?: DeltaSection<AlterModelDefinition>;
	};
};

export type AlterScriptGenerationOptions = {
	additionalOptions?: Array<{ id?: string; value?: unknown }>;
	scriptGenerationOptions?: {
		feActiveOptions?: {
			foreignKeys?: string;
		};
	};
};

export type AlterScriptData = {
	jsonSchema: string;
	collections?: string[];
	internalDefinitions?: Record<string, string>;
	options?: AlterScriptGenerationOptions;
	level?: string;
};

export type PluginLogger = {
	log: (type: string, data: object, title?: string) => void;
};

export type PluginCallback = (error: object | null, result?: unknown) => void;
