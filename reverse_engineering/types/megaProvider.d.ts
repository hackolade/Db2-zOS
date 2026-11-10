export type AttributeTypeProperties = { type: string; childType: string; mode?: string };

export type MegaType = {
	name: string;
	pivot?: string;
	length?: number;
	decimal?: number;
};

export type MegaKey = { name?: string; keyType: 'primary' | 'unique' };

export type MegaKeyMembership = { megaKey: MegaKey };

export type MegaColumn = { type: MegaType; notNull?: string; initialValue?: string };

export type MegaAttribute = { type: MegaType };

export type AttributeProperties = Readonly<
	Record<string, string | number | boolean | { readonly constraintName: string; readonly id: string } | undefined>
>;

export type DecorateAttributeOptions = {
	megaColumn?: MegaColumn;
	megaAttribute?: MegaAttribute;
	megaKeys?: MegaKeyMembership[];
};

export type MegaForeignKey = {
	id: string;
	name: string;
	keyType?: string;
	onDelete?: string;
};

export type DecorateRelationshipOptions = { megaForeignKey?: MegaForeignKey };

export type RelationshipProperties = Readonly<Record<string, Record<string, string | undefined> | string | undefined>>;

export type MegaIndex = Readonly<{
	id: string;
	name: string;
	indexType?: string;
	sortOrder?: string;
	clustered?: string;
	addOns?: string;
}>;

export type MegaIndexMember = Readonly<{ columnId: string; sortOrder?: string }>;

export type MegaTable = Readonly<{ id: string; name: string }>;

export type MegaTargetIndex = Readonly<{
	id: string;
	megaIndex: MegaIndex;
	members: ReadonlyArray<Readonly<{ id: string; attributeId: string; megaIndexMember: MegaIndexMember }>>;
}>;

export type DecorateIndexesOptions = { megaTable: MegaTable; megaIndexes: MegaTargetIndex[] };

export type IndexKeyProperties = { id: string; keyId: string; type?: 'ASC' | 'DESC' };

export type IndexProperties = {
	id: string;
	indxName: string;
	indxType?: 'unique';
	indxCluster?: 'CLUSTER' | 'NOT CLUSTER';
	indxKey: IndexKeyProperties[];
};

export type IndexesProperties = { Indxs: IndexProperties[] };

export type MegaTargetProvider = {
	apiVersion?: number;
	layer: 'logical' | 'physical';
	dbmsNamePatterns?: string[];
	decorateAttribute?: (options: DecorateAttributeOptions) => AttributeProperties;
	decorateIndexes?: (options: DecorateIndexesOptions) => IndexesProperties;
	decorateRelationship?: (options: DecorateRelationshipOptions) => RelationshipProperties;
};
