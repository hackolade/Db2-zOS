const assert = require('node:assert/strict');
const { test } = require('node:test');
const megaProvider = require('../reverse_engineering/megaProvider');

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

void test('maps a MEGA pivot class and a stated DBMS type onto flat type properties', () => {
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaAttribute: { type: { name: 'P-Character' } },
		}),
		{ type: 'char', mode: 'char' },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'GRAPHIC' } },
		}),
		{ type: 'char', mode: 'graphic' },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaAttribute: { type: { name: 'P-Datetime' } },
		}),
		{ type: 'datetime', mode: 'timestamp', fractSecPrecision: undefined },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'GRAPHIC(@L)' } },
		}),
		{ type: 'char', mode: 'graphic' },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'DECIMAL(@P,@S)' } },
		}),
		{ type: 'number', mode: 'decimal' },
	);
});

void test('uses the pivot class, then adds precision and scale from the MEGA type', () => {
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'AMOUNT', pivot: 'P-Decimal', length: 15, decimal: 2 } },
		}),
		{ type: 'number', mode: 'decimal', precision: 15, scale: 2 },
	);
});

void test('maps DBMS type names to configured Db2 for z/OS types and modes', () => {
	assert.deepEqual(megaProvider.decorateAttribute?.({ megaColumn: { type: { name: 'varchar' } } }), {
		type: 'char',
		mode: 'varchar',
	});
	assert.deepEqual(megaProvider.decorateAttribute?.({ megaColumn: { type: { name: 'DEC' } } }), {
		type: 'number',
		mode: 'decimal',
	});
	assert.deepEqual(megaProvider.decorateAttribute?.({ megaColumn: { type: { name: 'REAL' } } }), {
		type: 'number',
		mode: 'real',
	});
	assert.deepEqual(megaProvider.decorateAttribute?.({ megaColumn: { type: { name: 'TIMESTAMP' } } }), {
		type: 'datetime',
		mode: 'timestamp',
		fractSecPrecision: undefined,
	});
	assert.deepEqual(megaProvider.decorateAttribute?.({ megaColumn: { type: { name: 'XML' } } }), { type: 'xml' });
	assert.deepEqual(megaProvider.decorateAttribute?.({ megaColumn: { type: { name: 'ROWID' } } }), {
		type: 'rowid',
		mode: 'rowid',
	});
});

void test('adds length, fractional-seconds precision, and DECFLOAT precision from the MEGA type', () => {
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'VARCHAR', length: 40 } },
		}),
		{ type: 'char', mode: 'varchar', length: 40 },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'TIMESTAMP', length: 6 } },
		}),
		{ type: 'datetime', mode: 'timestamp', fractSecPrecision: 6 },
	);
	assert.deepEqual(
		megaProvider.decorateAttribute?.({
			megaColumn: { type: { name: 'DECFLOAT', length: 16 } },
		}),
		{ type: 'number', mode: 'decfloat', precision: '16' },
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
		type: 'number',
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
