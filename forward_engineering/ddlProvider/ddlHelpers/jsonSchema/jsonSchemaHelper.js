/**
 * @import {
 *   FieldNameLookupParams,
 *   IdToNameMap,
 *   WalkableSchema,
 *   WalkSchemaParams
 * } from '../../../types/ddlProvider'
 */

/**
 * Resolve a schema item name.
 *
 * @param {{ item?: WalkableSchema }} params Schema item.
 * @returns {string} Item name.
 */
const getName = ({ item }) => {
	const schemaItem = item ?? {};
	return schemaItem.code ?? schemaItem.collectionName ?? schemaItem.name ?? '';
};

/**
 * Walk schema properties recursively.
 *
 * @param {WalkSchemaParams} params Walk params.
 * @returns {void}
 */
const eachProperty = ({ jsonSchema, path, callback }) => {
	if (jsonSchema.properties) {
		Object.entries(jsonSchema.properties).forEach(([propertyName, property]) => {
			const nextPath = property.GUID ? [...path, property.GUID] : path;

			callback({ propertyName, property, path: nextPath });

			eachProperty({ jsonSchema: property, path: nextPath, callback });
		});
	}

	if (jsonSchema.items) {
		const items = Array.isArray(jsonSchema.items) ? jsonSchema.items : [jsonSchema.items];

		items.forEach((item, i) => {
			const nextPath = item.GUID ? [...path, item.GUID] : path;

			callback({ propertyName: String(i), property: item, path: nextPath });

			eachProperty({ jsonSchema: item, path: nextPath, callback });
		});
	}
};

/**
 * Build GUID-to-name lookup table.
 *
 * @param {{ jsonSchema?: WalkableSchema }} params JSON schema.
 * @returns {IdToNameMap} Id to name map.
 */
const getIdToNameHashTable = ({ jsonSchema }) => {
	const schema = jsonSchema ?? {};
	/** @type {Record<string, string>} */
	const IdToNameHashTable = {};

	/**
	 * Collect a property name.
	 *
	 * @param {{ propertyName: string; property: WalkableSchema }} params Property info.
	 * @returns {void}
	 */
	const callback = ({ propertyName, property }) => {
		if (property.GUID) {
			IdToNameHashTable[property.GUID] = getName({ item: property }) || propertyName;
		}
	};

	eachProperty({ jsonSchema: schema, path: [], callback });

	return IdToNameHashTable;
};

/**
 * Resolve a field list name from a key ref.
 *
 * @param {FieldNameLookupParams} params Lookup params.
 * @returns {string} Field name.
 */
const resolveFieldListName = ({ keyRef, idToNameHashTable }) => {
	const keyId = keyRef?.[0]?.keyId;
	return keyId ? idToNameHashTable[keyId] || '' : '';
};

module.exports = {
	getIdToNameHashTable,
	getName,
	resolveFieldListName,
};
