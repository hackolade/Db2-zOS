export type AttributeTypeProperties = { type: string; mode?: string };

export type MegaType = {
	name: string;
	pivot?: string;
	length?: number;
	decimal?: number;
};

export type MegaKey = { name?: string; keyType: 'primary' | 'unique' };

export type MegaKeyMembership = { megaKey: MegaKey };

export type MegaColumn = { type: MegaType };

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

export type MegaTargetProvider = {
	apiVersion?: number;
	layer: 'logical' | 'physical';
	dbmsNamePatterns?: string[];
	decorateAttribute?: (options: DecorateAttributeOptions) => AttributeProperties;
	decorateRelationship?: (options: DecorateRelationshipOptions) => RelationshipProperties;
};
