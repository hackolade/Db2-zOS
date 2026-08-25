/** @import {SchemaSequence} from '../forward_engineering/types/ddlProvider' */

const assert = require("node:assert/strict");
const { test } = require("node:test");
const createDdlProvider = require("../forward_engineering/ddlProvider/ddlProvider");

const ddlProvider = createDdlProvider(null, null, null);

const FILLED_SOME_SEQ = {
	GUID: "06742052-5bca-42eb-8b3a-df5f7ec9cb94",
	dataType: "BIGINT",
	sequenceName: "some_seq",
	increment: -1,
	start: -100,
	cache: "CACHE",
	noMinValue: false,
	noMaxValue: false,
	cacheValue: 2,
};

const NEAR_EMPTY_SEQ_3 = {
	GUID: "1994ec03-f740-4a9b-b0eb-ae43ce5662e0",
	dataType: "INTEGER",
	sequenceName: "seq_3",
};

const FULL_CLAUSE_SEQ = {
	sequenceName: "full_seq",
	dataType: "INTEGER",
	start: 1,
	increment: 1,
	minValue: 1,
	maxValue: 100,
	cycle: "CYCLE",
	cache: "CACHE",
	cacheValue: 20,
	order: "ORDER",
};

const FILLED_SOME_SEQ_SCRIPT = `CREATE SEQUENCE "new_schema"."some_seq"
	AS BIGINT
	START WITH -100
	INCREMENT BY -1
	CACHE 2;`;

const NEAR_EMPTY_SEQ_3_SCRIPT = `CREATE SEQUENCE "new_schema"."seq_3"
	AS INTEGER;`;

const FULL_CLAUSE_AND_SEQ_3_SCRIPT = `CREATE SEQUENCE "new_schema"."full_seq"
	AS INTEGER
	START WITH 1
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 100
	CYCLE
	CACHE 20
	ORDER;

CREATE SEQUENCE "new_schema"."seq_3"
	AS INTEGER;`;

/**
 * Hydrate the schema then emit CREATE SEQUENCE, matching Studio’s call order.
 *
 * @param {{ sequences?: SchemaSequence[]; isActivated?: boolean; name?: string }} params Schema fields.
 * @returns {string} Sequence DDL.
 */
const generateSequences = ({
	sequences,
	isActivated = true,
	name = "new_schema",
} = {}) => {
	const schemaData = ddlProvider.hydrateSchema(
		{ name, isActivated },
		{ sequences },
	);
	return ddlProvider.createSchemaSequences(schemaData);
};

/**
 * Strip block comments so remaining text is live SQL.
 *
 * @param {string} script DDL text.
 * @returns {string} Text outside block comments.
 */
const liveSql = (script) => script.replaceAll(/\/\*[\s\S]*?\*\//gu, "");

test("hydration forwards sequences from the second argument when they are present", () => {
	const sequences = [NEAR_EMPTY_SEQ_3];
	const schemaData = ddlProvider.hydrateSchema(
		{ name: "new_schema", isActivated: true },
		{ sequences },
	);

	assert.equal(schemaData.sequences, sequences);
});

test("hydration preserves isActivated", () => {
	const deactivated = ddlProvider.hydrateSchema(
		{ name: "new_schema", isActivated: false },
		{},
	);
	const activated = ddlProvider.hydrateSchema(
		{ name: "new_schema", isActivated: true },
		{},
	);

	assert.equal(deactivated.isActivated, false);
	assert.equal(activated.isActivated, true);
});

test("hydration does not throw when sequences are absent", () => {
	assert.doesNotThrow(() =>
		ddlProvider.hydrateSchema({ name: "new_schema", isActivated: true }),
	);
	assert.doesNotThrow(() =>
		ddlProvider.hydrateSchema(
			{ name: "new_schema", isActivated: true },
			{},
		),
	);
});

test("filled some_seq fixture shape emits the CREATE contract", () => {
	assert.equal(
		generateSequences({ sequences: [FILLED_SOME_SEQ] }),
		FILLED_SOME_SEQ_SCRIPT,
	);
});

test("near-empty seq_3 fixture shape emits the CREATE contract", () => {
	assert.equal(
		generateSequences({ sequences: [NEAR_EMPTY_SEQ_3] }),
		NEAR_EMPTY_SEQ_3_SCRIPT,
	);
});

test("CACHE with no cacheValue emits CACHE 20, never bare CACHE", () => {
	const script = generateSequences({
		sequences: [
			{
				sequenceName: "cache_default",
				dataType: "INTEGER",
				cache: "CACHE",
			},
		],
	});

	assert.match(script, /CACHE 20/u);
	assert.doesNotMatch(script, /\tCACHE;/u);
	assert.doesNotMatch(script, /\tCACHE\n/u);
});

test("start 0 and increment 0 emit START WITH 0 and INCREMENT BY 0", () => {
	const script = generateSequences({
		sequences: [
			{
				sequenceName: "zero_seq",
				dataType: "INTEGER",
				start: 0,
				increment: 0,
			},
		],
	});

	assert.match(script, /START WITH 0/u);
	assert.match(script, /INCREMENT BY 0/u);
});

test("noMinValue true with a leftover minValue emits NO MINVALUE and ignores the number", () => {
	const script = generateSequences({
		sequences: [
			{
				sequenceName: "no_min_seq",
				dataType: "INTEGER",
				noMinValue: true,
				minValue: 42,
			},
		],
	});

	assert.match(script, /NO MINVALUE/u);
	assert.doesNotMatch(script, /MINVALUE 42/u);
});

test("DECIMAL with no precision emits AS DECIMAL", () => {
	const script = generateSequences({
		sequences: [{ sequenceName: "dec_seq", dataType: "DECIMAL" }],
	});

	assert.match(script, /AS DECIMAL;/u);
	assert.doesNotMatch(script, /AS DECIMAL\(/u);
});

test("DECIMAL with precision 10 emits AS DECIMAL(10,0)", () => {
	const script = generateSequences({
		sequences: [
			{ sequenceName: "dec_p_seq", dataType: "DECIMAL", precision: 10 },
		],
	});

	assert.match(script, /AS DECIMAL\(10,0\)/u);
});

test("deactivated schema comments every CREATE SEQUENCE line, not only the first", () => {
	const script = generateSequences({
		sequences: [FILLED_SOME_SEQ],
		isActivated: false,
	});

	assert.match(script, /\/\*/u);
	assert.match(script, /\*\//u);
	assert.match(script, /AS BIGINT/u);
	assert.match(script, /START WITH -100/u);
	assert.match(script, /INCREMENT BY -1/u);

	const uncommented = liveSql(script);
	assert.doesNotMatch(uncommented, /AS BIGINT/u);
	assert.doesNotMatch(uncommented, /START WITH/u);
	assert.doesNotMatch(uncommented, /INCREMENT BY/u);
});

test("a blank sequenceName produces no statement for that row", () => {
	assert.equal(
		generateSequences({
			sequences: [{ sequenceName: "", dataType: "INTEGER" }],
		}),
		"",
	);
	assert.equal(
		generateSequences({
			sequences: [{ sequenceName: "   ", dataType: "INTEGER" }],
		}),
		"",
	);
	assert.equal(
		generateSequences({ sequences: [{ dataType: "INTEGER" }] }),
		"",
	);
	assert.equal(
		generateSequences({
			sequences: [
				{ sequenceName: "", dataType: "BIGINT" },
				NEAR_EMPTY_SEQ_3,
			],
		}),
		NEAR_EMPTY_SEQ_3_SCRIPT,
	);
});

test("full-clause row plus seq_3 emits clause order and a blank line between statements", () => {
	assert.equal(
		generateSequences({ sequences: [FULL_CLAUSE_SEQ, NEAR_EMPTY_SEQ_3] }),
		FULL_CLAUSE_AND_SEQ_3_SCRIPT,
	);
});
