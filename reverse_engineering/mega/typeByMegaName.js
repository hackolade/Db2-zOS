/** @import {AttributeTypeProperties} from '../types/megaProvider' */

/** @type {AttributeTypeProperties} */
const CHAR = { type: 'string', childType: 'char' };

/** @type {AttributeTypeProperties} */
const NUMBER = { type: 'numeric', childType: 'number' };

/** @type {AttributeTypeProperties} */
const DATETIME = { type: 'string', childType: 'datetime' };

/** @type {AttributeTypeProperties} */
const BINARY = { type: 'string', childType: 'binary' };

/** @type {AttributeTypeProperties} */
const XML = { type: 'binary', childType: 'xml' };

/** @type {AttributeTypeProperties} */
const ROWID = { type: 'string', childType: 'rowid' };

/** @type {Readonly<Record<string, AttributeTypeProperties>>} */
const TYPE_BY_MEGA_NAME = {
	'P-Character': { ...CHAR, mode: 'char' },
	'P-Variable Character': { ...CHAR, mode: 'varchar' },
	'P-Currency': { ...NUMBER, mode: 'decimal' },
	'P-Numeric': { ...NUMBER, mode: 'decimal' },
	'P-Date': { ...DATETIME, mode: 'date' },
	'P-Time': { ...DATETIME, mode: 'time' },
	'P-Datetime': { ...DATETIME, mode: 'timestamp' },
	'P-Timestamp': { ...DATETIME, mode: 'timestamp' },
	'P-Integer': { ...NUMBER, mode: 'integer' },
	'P-Smallint': { ...NUMBER, mode: 'smallint' },
	'P-Bigint': { ...NUMBER, mode: 'bigint' },
	'P-Decimal': { ...NUMBER, mode: 'decimal' },
	'P-Float': { ...NUMBER, mode: 'float' },
	'P-Double': { ...NUMBER, mode: 'double' },
	'P-Binary': { ...BINARY, mode: 'binary' },
	'P-Blob': { ...BINARY, mode: 'blob' },
	'P-Clob': { ...CHAR, mode: 'clob' },
	'P-Xml': XML,
	CHAR: { ...CHAR, mode: 'char' },
	CHARACTER: { ...CHAR, mode: 'char' },
	VARCHAR: { ...CHAR, mode: 'varchar' },
	LONGVARCHAR: { ...CHAR, mode: 'varchar' },
	GRAPHIC: { ...CHAR, mode: 'graphic' },
	VARGRAPHIC: { ...CHAR, mode: 'vargraphic' },
	LONGVARGRAPHIC: { ...CHAR, mode: 'vargraphic' },
	NCHAR: { ...CHAR, mode: 'graphic' },
	NVARCHAR: { ...CHAR, mode: 'vargraphic' },
	CLOB: { ...CHAR, mode: 'clob' },
	DBCLOB: { ...CHAR, mode: 'dbclob' },
	BLOB: { ...BINARY, mode: 'blob' },
	BINARY: { ...BINARY, mode: 'binary' },
	VARBINARY: { ...BINARY, mode: 'varbinary' },
	LONGVARBINARY: { ...BINARY, mode: 'varbinary' },
	SMALLINT: { ...NUMBER, mode: 'smallint' },
	INTEGER: { ...NUMBER, mode: 'integer' },
	INT: { ...NUMBER, mode: 'integer' },
	BIGINT: { ...NUMBER, mode: 'bigint' },
	DECIMAL: { ...NUMBER, mode: 'decimal' },
	DEC: { ...NUMBER, mode: 'decimal' },
	NUMERIC: { ...NUMBER, mode: 'decimal' },
	DECFLOAT: { ...NUMBER, mode: 'decfloat' },
	REAL: { ...NUMBER, mode: 'real' },
	FLOAT: { ...NUMBER, mode: 'float' },
	DOUBLE: { ...NUMBER, mode: 'double' },
	DATE: { ...DATETIME, mode: 'date' },
	TIME: { ...DATETIME, mode: 'time' },
	TIMESTAMP: { ...DATETIME, mode: 'timestamp' },
	ROWID: { ...ROWID, mode: 'rowid' },
	XML,
};

module.exports = {
	TYPE_BY_MEGA_NAME,
};
