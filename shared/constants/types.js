/** @enum {string} */
const DATA_TYPE = {
	char: 'CHAR',
	varchar: 'VARCHAR',
	clob: 'CLOB',
	graphic: 'GRAPHIC',
	vargraphic: 'VARGRAPHIC',
	dbclob: 'DBCLOB',
	integer: 'INTEGER',
	smallint: 'SMALLINT',
	bigint: 'BIGINT',
	decimal: 'DECIMAL',
	float: 'FLOAT',
	real: 'REAL',
	double: 'DOUBLE',
	decfloat: 'DECFLOAT',
	date: 'DATE',
	time: 'TIME',
	timestamp: 'TIMESTAMP',
	binary: 'BINARY',
	varbinary: 'VARBINARY',
	blob: 'BLOB',
	xml: 'XML',
	rowid: 'ROWID',
};

const DATA_TYPES_WITH_LENGTH_MULTIPLIER = [
	DATA_TYPE.char,
	DATA_TYPE.varchar,
	DATA_TYPE.clob,
	DATA_TYPE.graphic,
	DATA_TYPE.vargraphic,
	DATA_TYPE.dbclob,
	DATA_TYPE.binary,
	DATA_TYPE.varbinary,
	DATA_TYPE.blob,
];

const DATA_TYPES_WITH_LENGTH = [
	DATA_TYPE.char,
	DATA_TYPE.varchar,
	DATA_TYPE.clob,
	DATA_TYPE.graphic,
	DATA_TYPE.vargraphic,
	DATA_TYPE.dbclob,
	DATA_TYPE.binary,
	DATA_TYPE.varbinary,
	DATA_TYPE.blob,
];

const DATA_TYPES_WITH_PRECISION = [DATA_TYPE.decimal, DATA_TYPE.float, DATA_TYPE.decfloat];

const DATA_TYPES_WITH_IDENTITY = [DATA_TYPE.integer, DATA_TYPE.smallint, DATA_TYPE.bigint, DATA_TYPE.decimal];

const DATA_TYPES_WITH_CHARACTER_SUBTYPE = [DATA_TYPE.char, DATA_TYPE.varchar, DATA_TYPE.clob];

const DATA_TYPES_WITH_CCSID = [
	DATA_TYPE.char,
	DATA_TYPE.varchar,
	DATA_TYPE.clob,
	DATA_TYPE.graphic,
	DATA_TYPE.vargraphic,
	DATA_TYPE.dbclob,
];

const DATA_TYPES_WITH_INLINE_LENGTH = [DATA_TYPE.clob, DATA_TYPE.dbclob, DATA_TYPE.blob];

module.exports = {
	DATA_TYPE,
	DATA_TYPES_WITH_LENGTH_MULTIPLIER,
	DATA_TYPES_WITH_LENGTH,
	DATA_TYPES_WITH_PRECISION,
	DATA_TYPES_WITH_IDENTITY,
	DATA_TYPES_WITH_CHARACTER_SUBTYPE,
	DATA_TYPES_WITH_CCSID,
	DATA_TYPES_WITH_INLINE_LENGTH,
};
