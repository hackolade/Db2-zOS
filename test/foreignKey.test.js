const assert = require('node:assert/strict');
const { test } = require('node:test');
const createDdlProvider = require('../forward_engineering/ddlProvider/ddlProvider');

const ddlProvider = createDdlProvider(null, null, null);

const schemaData = { schemaName: 'SCHEMA1' };

/**
 * @param {boolean} [isActivated] - Relationship isActivated flag.
 * @returns {import('../forward_engineering/types/ddlProvider').ForeignKeyInput} - Foreign key data.
 */
const getForeignKeyInput = isActivated => ({
	name: 'FK_ORDER',
	foreignTable: 'ORDER',
	foreignKey: [{ name: 'CUSTOMER_ID', isActivated: true }],
	primaryTable: 'CUSTOMER',
	primaryKey: [{ name: 'ID', isActivated: true }],
	primaryTableActivated: true,
	foreignTableActivated: true,
	isActivated,
});

void test('deactivates the foreign key constraint of a deactivated relationship', () => {
	assert.equal(
		ddlProvider.createForeignKeyConstraint(getForeignKeyInput(false), null, schemaData).isActivated,
		false,
	);
});

void test('deactivates the standalone foreign key of a deactivated relationship', () => {
	assert.equal(ddlProvider.createForeignKey(getForeignKeyInput(false), null, schemaData).isActivated, false);
});

void test('keeps the foreign key activated when the relationship flag is missing', () => {
	assert.equal(ddlProvider.createForeignKeyConstraint(getForeignKeyInput(), null, schemaData).isActivated, true);
	assert.equal(ddlProvider.createForeignKey(getForeignKeyInput(), null, schemaData).isActivated, true);
});

void test('keeps the foreign key activated when the relationship is activated', () => {
	assert.equal(ddlProvider.createForeignKeyConstraint(getForeignKeyInput(true), null, schemaData).isActivated, true);
	assert.equal(ddlProvider.createForeignKey(getForeignKeyInput(true), null, schemaData).isActivated, true);
});
