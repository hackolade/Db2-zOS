const assert = require('node:assert/strict');
const { test } = require('node:test');
const megaProvider = require('../reverse_engineering/megaProvider');

const fs = require('node:fs');
const path = require('node:path');

/**
 * @typedef {{
 * 	propertyKeyword?: string;
 * 	propertyType?: string;
 * 	attributeList?: string[];
 * 	options?: (string | { value: string })[];
 * 	structure?: PropertyConfig[];
 * }} PropertyConfig
 */

/**
 * @param {string} keyword - Keyword of a property of a tab of the entity level properties config of the plugin.
 * @returns {PropertyConfig | undefined} - The config of that property.
 */
const entityLevelProperty = keyword => {
	const content = fs.readFileSync(
		path.join(__dirname, '..', 'properties_pane', 'entity_level', 'entityLevelConfig.json'),
		'utf8',
	);
	const json = content.slice(content.indexOf('[', content.indexOf('*/')));
	// The plugin owns the config, which is what the test checks the provider against, so the assertion is unchecked.
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion
	const tabs = /** @type {PropertyConfig[]} */ (JSON.parse(json));

	return tabs.flatMap(tab => tab.structure ?? []).find(property => property.propertyKeyword === keyword);
};

/**
 * @param {PropertyConfig | undefined} group - Config of a group of properties.
 * @param {string} keyword - Keyword of a property of the group.
 * @returns {PropertyConfig | undefined} - The config of that property.
 */
const propertyOf = (group, keyword) => group?.structure?.find(property => property.propertyKeyword === keyword);

/**
 * @param {PropertyConfig | undefined} property - Config of a select property.
 * @returns {string[]} - Values of its options.
 */
const optionsOf = property =>
	(property?.options ?? []).map(option => (typeof option === 'string' ? option : option.value));

const KEY_OPTION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/**
 * @param {unknown} options - Key options from a decorated attribute.
 * @returns {{ constraintName: string; id: string } | null} - Named key options.
 */
const namedKeyOptions = options => {
	if (
		!options ||
		typeof options !== 'object' ||
		!('constraintName' in options) ||
		typeof options.constraintName !== 'string' ||
		!('id' in options) ||
		typeof options.id !== 'string'
	) {
		return null;
	}

	return { constraintName: options.constraintName, id: options.id };
};

void test('imports the physical Db2 for z/OS model of a MEGA export', () => {
	assert.equal(megaProvider.apiVersion, 1);
	assert.equal(megaProvider.layer, 'physical');
	assert.deepEqual(megaProvider.dbmsNamePatterns, ['^DB2 OS', '^DB2 for z/OS']);
	assert.deepEqual(
		megaProvider.dbmsNamePatterns?.map(pattern => new RegExp(pattern, 'u').test('DB2 for z/OS Version 8')),
		[false, true],
	);
	assert.equal(new RegExp(megaProvider.dbmsNamePatterns?.[0] ?? '', 'u').test('DB2 OS/390 Version 8'), true);
});

/**
 * @param {Partial<import('../reverse_engineering/types/megaProvider').MegaIndex>} megaIndex - Options of the index.
 * @param {string[]} sortOrders - Direction of each member, in index order, or an empty string for none.
 * @returns {import('../reverse_engineering/types/megaProvider').DecorateIndexesOptions} - A table with that index.
 */
const tableWithIndex = (megaIndex, sortOrders) => ({
	megaTable: { id: 'TBL', name: 'CUSTOMER' },
	megaIndexes: [
		{
			id: 'index-id',
			megaIndex: { id: 'IX1', name: 'IX_CUSTOMER', ...megaIndex },
			members: sortOrders.map((sortOrder, position) => ({
				id: `member-id-${position}`,
				attributeId: `attribute-id-${position}`,
				megaIndexMember: { columnId: `COL${position}`, ...(sortOrder && { sortOrder }) },
			})),
		},
	],
});

void test('places MEGA indexes in the Indexes of the Db2 table, with their identifiers and ordered keys', () => {
	assert.deepEqual(megaProvider.decorateIndexes?.(tableWithIndex({ indexType: 'U', clustered: 'Y' }, ['D', 'A'])), {
		Indxs: [
			{
				id: 'index-id',
				indxName: 'IX_CUSTOMER',
				indxType: 'unique',
				indxCluster: 'CLUSTER',
				indxKey: [
					{ id: 'member-id-0', keyId: 'attribute-id-0', type: 'DESC' },
					{ id: 'member-id-1', keyId: 'attribute-id-1', type: 'ASC' },
				],
			},
		],
	});
});

void test('leaves to the Db2 defaults what MEGA does not state, or states in a way Db2 has no option for', () => {
	assert.deepEqual(
		megaProvider.decorateIndexes?.(
			tableWithIndex({ indexType: 'S', clustered: 'N', addOns: 'INCLUDE (CODE)' }, ['', 'X']),
		),
		{
			Indxs: [
				{
					id: 'index-id',
					indxName: 'IX_CUSTOMER',
					indxCluster: 'NOT CLUSTER',
					indxKey: [
						{ id: 'member-id-0', keyId: 'attribute-id-0' },
						{ id: 'member-id-1', keyId: 'attribute-id-1' },
					],
				},
			],
		},
	);
});

void test('places MEGA indexes with the keywords and values of the Indexes in the entity properties config', () => {
	const indexesConfig = entityLevelProperty('Indxs');
	const keywords = new Set((indexesConfig?.structure ?? []).map(({ propertyKeyword }) => propertyKeyword));
	const { Indxs: [index] = [] } =
		megaProvider.decorateIndexes?.(tableWithIndex({ indexType: 'U', clustered: 'Y' }, ['D'])) ?? {};
	const keysConfig = propertyOf(indexesConfig, 'indxKey');

	assert.equal(indexesConfig?.propertyType, 'group');
	assert.deepEqual(
		Object.keys(index ?? {}).filter(keyword => keyword !== 'id' && !keywords.has(keyword)),
		[],
	);
	assert.equal(keysConfig?.propertyType, 'fieldList');
	assert.ok(keysConfig?.attributeList?.includes(index?.indxKey[0]?.type ?? ''));
	assert.ok(optionsOf(propertyOf(indexesConfig, 'indxType')).includes(index?.indxType ?? ''));
	assert.ok(optionsOf(propertyOf(indexesConfig, 'indxCluster')).includes(index?.indxCluster ?? ''));
});

void test('maps a MEGA pivot class and a stated DBMS type onto flat type properties', () => {
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaAttribute: { type: { name: 'P-Character' } },
		}),
		{ type: 'string', childType: 'char', mode: 'char' },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'GRAPHIC' } },
		}),
		{ type: 'string', childType: 'char', mode: 'graphic' },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaAttribute: { type: { name: 'P-Datetime' } },
		}),
		{ type: 'string', childType: 'datetime', mode: 'timestamp', fractSecPrecision: undefined },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'GRAPHIC(@L)' } },
		}),
		{ type: 'string', childType: 'char', mode: 'graphic' },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'DECIMAL(@P,@S)' } },
		}),
		{ type: 'numeric', childType: 'number', mode: 'decimal' },
	);
});

void test('uses the pivot class, then adds precision and scale from the MEGA type', () => {
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'AMOUNT', pivot: 'P-Decimal', length: 15, decimal: 2 } },
		}),
		{ type: 'numeric', childType: 'number', mode: 'decimal', precision: 15, scale: 2 },
	);
});

void test('maps DBMS type names to configured Db2 for z/OS types and modes', () => {
	assert.deepEqual(megaProvider.decorateAttribute?.({ megaColumn: { type: { name: 'varchar' } } }), {
		type: 'string',
		childType: 'char',
		mode: 'varchar',
	});
	assert.deepEqual(megaProvider.decorateAttribute?.({ megaColumn: { type: { name: 'DEC' } } }), {
		type: 'numeric',
		childType: 'number',
		mode: 'decimal',
	});
	assert.deepEqual(megaProvider.decorateAttribute?.({ megaColumn: { type: { name: 'REAL' } } }), {
		type: 'numeric',
		childType: 'number',
		mode: 'real',
	});
	assert.deepEqual(megaProvider.decorateAttribute?.({ megaColumn: { type: { name: 'TIMESTAMP' } } }), {
		type: 'string',
		childType: 'datetime',
		mode: 'timestamp',
		fractSecPrecision: undefined,
	});
	assert.deepEqual(megaProvider.decorateAttribute?.({ megaColumn: { type: { name: 'XML' } } }), {
		type: 'binary',
		childType: 'xml',
	});
	assert.deepEqual(megaProvider.decorateAttribute?.({ megaColumn: { type: { name: 'ROWID' } } }), {
		type: 'string',
		childType: 'rowid',
		mode: 'rowid',
	});
});

void test('adds length, fractional-seconds precision, and DECFLOAT precision from the MEGA type', () => {
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'VARCHAR', length: 40 } },
		}),
		{ type: 'string', childType: 'char', mode: 'varchar', length: 40 },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'TIMESTAMP', length: 6 } },
		}),
		{ type: 'string', childType: 'datetime', mode: 'timestamp', fractSecPrecision: 6 },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'DECFLOAT', length: 16 } },
		}),
		{ type: 'numeric', childType: 'number', mode: 'decfloat', precision: '16' },
	);
});

void test('marks a column of a one-member primary key as primary, not also unique', () => {
	const { primaryKeyOptions, ...field } =
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'INTEGER' } },
			megaKeys: [
				{ megaKey: { name: 'PK_ID', keyType: 'primary' } },
				{ megaKey: { name: 'UK_CODE', keyType: 'unique' } },
			],
		}) ?? {};

	const keyOptions = namedKeyOptions(primaryKeyOptions);

	assert.deepEqual(field, {
		type: 'numeric',
		childType: 'number',
		mode: 'integer',
		primaryKey: true,
		required: true,
	});
	assert.equal(keyOptions?.constraintName, 'PK_ID');
	assert.match(keyOptions?.id ?? '', KEY_OPTION_ID);
});

void test('marks a column of one-member unique keys as an alternate key', () => {
	const { uniqueKeyOptions, ...field } =
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'CODE-2' } },
			megaKeys: [{ megaKey: { name: 'UK_CODE', keyType: 'unique' } }, { megaKey: { keyType: 'unique' } }],
		}) ?? {};

	const keyOptions = namedKeyOptions(uniqueKeyOptions);

	assert.deepEqual(field, {
		unique: true,
		alternateKey: true,
	});
	assert.equal(keyOptions?.constraintName, 'UK_CODE');
	assert.match(keyOptions?.id ?? '', KEY_OPTION_ID);
});

void test('marks a MEGA column that is not null with default as required and with default', () => {
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'INTEGER' }, notNull: 'W' },
		}),
		{ type: 'numeric', childType: 'number', mode: 'integer', required: true, withDefault: true },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'INTEGER' }, notNull: 'W', initialValue: '0' },
		}),
		{ type: 'numeric', childType: 'number', mode: 'integer', required: true, withDefault: true, default: '0' },
	);
});

void test('marks a MEGA column that states an initial value as with default', () => {
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'INTEGER' }, initialValue: '0' },
		}),
		{ type: 'numeric', childType: 'number', mode: 'integer', withDefault: true, default: '0' },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'INTEGER' }, initialValue: '' },
		}),
		{ type: 'numeric', childType: 'number', mode: 'integer', withDefault: true, default: '' },
	);
});

void test('does not mark a mandatory MEGA column as with default', () => {
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'INTEGER' }, notNull: 'M' },
		}),
		{ type: 'numeric', childType: 'number', mode: 'integer' },
	);
});

void test('maps a MEGA foreign key onto the Db2 delete rule', () => {
	assert.deepEqual(
		megaProvider.decorateRelationship?.({
			megaForeignKey: { id: 'fk', name: 'FK_ORDER', onDelete: 'Restrict' },
		}),
		{ relationshipInfo: { relationshipOnDelete: 'RESTRICT' } },
	);
	assert.deepEqual(
		megaProvider.decorateRelationship?.({
			megaForeignKey: { id: 'fk', name: 'FK_ORDER', onDelete: 'Cascade' },
		}),
		{ relationshipInfo: { relationshipOnDelete: 'CASCADE' } },
	);
	assert.deepEqual(
		megaProvider.decorateRelationship?.({ megaForeignKey: { id: 'fk', name: 'FK_ORDER', onDelete: 'R' } }),
		{ relationshipInfo: { relationshipOnDelete: 'RESTRICT' } },
	);
	assert.deepEqual(megaProvider.decorateRelationship?.({ megaForeignKey: { id: 'fk', name: 'FK_ORDER' } }), {});
});

void test('leaves a MEGA type that Db2 for z/OS has no field type for', () => {
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'CODE-2' } },
		}),
		{},
	);
});
