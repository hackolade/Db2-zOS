const assert = require('node:assert/strict');
const { test } = require('node:test');
const createDdlProvider = require('../forward_engineering/ddlProvider/ddlProvider');

const ddlProvider = createDdlProvider(null, null, null);

void test('places NOT NULL before the ROWID generated clause', () => {
	const columnDefinition = ddlProvider.convertColumnDefinition({
		name: 'row_id',
		type: 'ROWID',
		primaryKey: false,
		unique: false,
		nullable: false,
		generated: 'ALWAYS',
		isActivated: true,
	});

	assert.equal(columnDefinition, '"row_id" ROWID NOT NULL GENERATED ALWAYS');
});

void test('places NOT NULL before a column default', () => {
	const columnDefinition = ddlProvider.convertColumnDefinition({
		name: 'count',
		type: 'INTEGER',
		primaryKey: false,
		unique: false,
		nullable: false,
		default: 0,
		isActivated: true,
	});

	assert.equal(columnDefinition, '"count" INTEGER NOT NULL WITH DEFAULT 0');
});

void test('keeps inline key constraints after identity generation', () => {
	const columnDefinition = ddlProvider.convertColumnDefinition({
		name: 'id',
		entityName: 'sample',
		type: 'INTEGER',
		primaryKey: true,
		unique: false,
		nullable: false,
		isActivated: true,
		identity: {
			generated: 'ALWAYS',
			start: 1,
		},
	});

	assert.equal(
		columnDefinition,
		'"id" INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1) CONSTRAINT "sample_pk" PRIMARY KEY',
	);
});

void test('omits the empty parentheses when identity has no options', () => {
	const columnDefinition = ddlProvider.convertColumnDefinition({
		name: 'id',
		type: 'BIGINT',
		primaryKey: false,
		unique: false,
		nullable: false,
		isActivated: true,
		identity: {
			generated: 'ALWAYS',
		},
	});

	assert.equal(columnDefinition, '"id" BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY');
});
