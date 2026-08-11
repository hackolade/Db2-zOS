/** @import {TypeDescriptors} from '../types/ddlProvider' */

/** @type {TypeDescriptors} */
module.exports = {
	SMALLINT: {
		capacity: 2,
	},
	INT: {
		capacity: 4,
	},
	INTEGER: {
		capacity: 4,
	},
	BIGINT: {
		capacity: 8,
	},
	DECIMAL: {
		mode: 'decimal',
	},
	DEC: {
		mode: 'decimal',
	},
	NUMERIC: {
		mode: 'decimal',
	},
	FLOAT: {
		capacity: 4,
		mode: 'float',
	},
	DOUBLE: {
		capacity: 8,
		mode: 'float',
	},
	'DOUBLE PRECISION': {
		capacity: 8,
		mode: 'float',
	},
	REAL: {
		capacity: 4,
		mode: 'float',
	},
	DECFLOAT: {
		mode: 'decfloat',
	},
	CHAR: {
		mode: 'char',
	},
	CHARACTER: {
		mode: 'char',
	},
	VARCHAR: {
		mode: 'varchar',
	},
	'CHAR VARYING': {
		mode: 'varchar',
	},
	'CHARACTER VARYING': {
		mode: 'varchar',
	},
	GRAPHIC: {
		mode: 'graphic',
	},
	VARGRAPHIC: {
		mode: 'vargraphic',
	},
	CLOB: {
		mode: 'clob',
	},
	'CHARACTER LARGE OBJECT': {
		mode: 'clob',
	},
	DBCLOB: {
		mode: 'dbclob',
	},
	BINARY: {
		mode: 'binary',
	},
	VARBINARY: {
		mode: 'varbinary',
	},
	BLOB: {
		mode: 'blob',
	},
	DATE: {
		format: 'YYYY-MM-DD',
	},
	TIME: {
		format: 'hh:mm:ss',
	},
	TIMESTAMP: {
		format: 'YYYY-MM-DD hh:mm:ss',
	},
	XML: {},
	ROWID: {},
};
