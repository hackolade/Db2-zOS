/**
 * @import {
 *   ActivatedKey,
 *   CommentDeactivatedOptions,
 *   DividedItems,
 *   DivideItemsParams,
 *   FieldComparisonParams,
 *   KeyConstraintColumn,
 *   ModelObject,
 *   PropertyChanges,
 *   PropertyPair,
 *   ToArrayParams,
 *   TypeDescriptors
 * } from '../types/ddlProvider'
 */

const isEqual = require('lodash/isEqual');
const omit = require('lodash/omit');
const toLower = require('lodash/toLower');
const { INLINE_COMMENT } = require('../../shared/constants/constants');

/**
 * Prefix each line with a tab.
 *
 * @param {{ text: string; tab?: string }} params Text and tab.
 * @returns {string} Indented text.
 */
const setTab = ({ text, tab }) => {
	const indent = tab ?? '\t';
	return text
		.split('\n')
		.map(line => indent + line)
		.join('\n');
};

/**
 * Check whether descriptors include a type.
 *
 * @param {{ descriptors: TypeDescriptors; type: string }} params Descriptors and type.
 * @returns {boolean} Whether type exists.
 */
const hasType = ({ descriptors, type }) => {
	return Object.keys(descriptors)
		.map(key => toLower(key))
		.includes(toLower(type));
};

/**
 * Check whether a key is activated.
 *
 * @param {{ key?: ActivatedKey | KeyConstraintColumn }} params Key object.
 * @returns {boolean} Activation flag.
 */
const checkIsKeyActivated = ({ key }) => {
	return key?.isActivated ?? true;
};

/**
 * Check whether all keys are deactivated.
 *
 * @param {{ keys: ActivatedKey[] | KeyConstraintColumn[] | string }} params Keys list.
 * @returns {boolean} Whether all keys are deactivated.
 */
const checkAllKeysDeactivated = ({ keys }) => {
	if (!Array.isArray(keys)) {
		return false;
	}
	return keys.length > 0 ? keys.every(key => !checkIsKeyActivated({ key })) : false;
};

/**
 * Split items into activated and deactivated mapped lists.
 *
 * @template {ActivatedKey} T
 * @template {any} K
 * @param {DivideItemsParams<T, K>} params Items and mapper.
 * @returns {DividedItems<K>} Divided items.
 */
const divideIntoActivatedAndDeactivated = ({ items, mapFunction }) => {
	const activatedItems = items.filter(item => checkIsKeyActivated({ key: item })).map(item => mapFunction(item));
	const deactivatedItems = items.filter(item => !checkIsKeyActivated({ key: item })).map(item => mapFunction(item));

	return { activatedItems, deactivatedItems };
};

/**
 * Comment a statement when deactivated.
 *
 * @param {string} statement Statement text.
 * @param {CommentDeactivatedOptions} options Comment options.
 * @returns {string} Possibly commented statement.
 */
const commentIfDeactivated = (statement, { isActivated, isPartOfLine, inlineComment }) => {
	const commentMarker = inlineComment ?? INLINE_COMMENT;
	if (isActivated) {
		return statement;
	}

	if (isPartOfLine) {
		return '/* ' + statement + ' */';
	}

	if (statement.includes('\n')) {
		return '/*\n' + statement + ' */\n';
	}
	return commentMarker + ' ' + statement;
};

/**
 * Wrap a value in double quotes.
 *
 * @param {string} str Value.
 * @returns {string} Quoted value.
 */
const wrapInQuotes = str => `"${str}"`;

/**
 * Wrap a name in single quotes.
 *
 * @param {{ name: string }} params Name value.
 * @returns {string} Quoted name.
 */
const wrapInSingleQuotes = ({ name }) => `'${name}'`;

/**
 * Remove all quotes from a string.
 *
 * @param {string} str Input string.
 * @returns {string} Unquoted string.
 */
const removeAllQuotes = str => str.replaceAll(/['"]/gu, '');

/**
 * Prefix a name with an optional schema.
 *
 * @param {{ name: string; schemaName?: string }} params Name parts.
 * @returns {string} Qualified name.
 */
const getNamePrefixedWithSchemaName = ({ name, schemaName }) => {
	if (schemaName) {
		return `${wrapInQuotes(schemaName)}.${wrapInQuotes(name)}`;
	}

	return wrapInQuotes(name);
};

/**
 * Map a column to a quoted name.
 *
 * @param {{ name?: string }} params Column.
 * @returns {string} Quoted column name.
 */
const columnMapToString = ({ name }) => wrapInQuotes(name ?? '');

/**
 * Map a column to a quoted name with order.
 *
 * @param {{ name: string; type?: string }} params Column and order.
 * @returns {string} Column expression.
 */
const columnMapToStringWithOrder = ({ name, type }) => {
	const order = type === 'descending' ? ' DESC' : type === 'ascending' ? ' ASC' : '';
	return wrapInQuotes(name) + order;
};

/**
 * Build a columns list with activation comments.
 *
 * @param {KeyConstraintColumn[]} columns Columns.
 * @param {boolean} isAllColumnsDeactivated Whether all columns are deactivated.
 * @param {boolean} isParentActivated Whether parent is activated.
 * @param {(column: KeyConstraintColumn) => string} [mapColumn] Column mapper.
 * @returns {string} Columns list string.
 */
const getColumnsList = (columns, isAllColumnsDeactivated, isParentActivated, mapColumn = columnMapToString) => {
	const dividedColumns = divideIntoActivatedAndDeactivated({ items: columns, mapFunction: mapColumn });
	const deactivatedColumnsAsString = dividedColumns?.deactivatedItems?.length
		? commentIfDeactivated(dividedColumns.deactivatedItems.join(', '), {
				isActivated: false,
				isPartOfLine: true,
			})
		: '';

	return !isAllColumnsDeactivated && isParentActivated
		? ' (' + dividedColumns.activatedItems.join(', ') + deactivatedColumnsAsString + ')'
		: ' (' + columns.map(column => mapColumn(column)).join(', ') + ')';
};

/**
 * Normalize a value to an array.
 *
 * @template {object} T
 * @param {ToArrayParams<T>} params Value.
 * @returns {T[]} Array value.
 */
const toArray = ({ value }) => (Array.isArray(value) ? value : [value]);

/**
 * Get altered entity name.
 *
 * @param {ModelObject} entityData Entity data.
 * @returns {string | undefined} Alter name.
 */
const getAlterEntityName = entityData => {
	return entityData?.compMod?.collectionName?.new;
};

/**
 * Get entity display name.
 *
 * @param {ModelObject} entityData Entity data.
 * @returns {string} Entity name.
 */
const getEntityName = entityData => {
	return entityData?.code ?? entityData?.collectionName ?? entityData?.name ?? '';
};

/**
 * Get schema name from a collection.
 *
 * @param {{ collection: ModelObject }} params Collection.
 * @returns {string | undefined} Schema name.
 */
const getSchemaNameFromCollection = ({ collection }) => {
	return collection.compMod?.keyspaceName;
};

/**
 * Build a fully qualified collection name.
 *
 * @param {{ collectionSchema: ModelObject; preferAlterName?: boolean }} params Collection schema.
 * @returns {string} Qualified name.
 */
const getFullCollectionName = ({ collectionSchema, preferAlterName = true }) => {
	let name = '';

	if (preferAlterName) {
		name = getAlterEntityName(collectionSchema) ?? '';
	}

	name = name || getEntityName(collectionSchema);

	const schemaName = getSchemaNameFromCollection({ collection: collectionSchema });
	return getNamePrefixedWithSchemaName({ name, schemaName });
};

/**
 * Get schema of an alter collection.
 *
 * @template {ModelObject} T
 * @param {T} collection Collection.
 * @returns {T} Merged schema.
 */
const getSchemaOfAlterCollection = collection => {
	return { ...collection, ...omit(collection?.role, 'properties') };
};

/**
 * Check whether an object is activated in a delta model.
 *
 * @param {ModelObject} modelObject Model object.
 * @returns {boolean} Activation flag.
 */
const isObjectInDeltaModelActivated = modelObject => {
	return modelObject.compMod?.isActivated?.new ?? modelObject.role?.isActivated ?? false;
};

/**
 * Check whether parent container is activated.
 *
 * @param {ModelObject} collection Collection.
 * @returns {boolean} Activation flag.
 */
const isParentContainerActivated = collection => {
	return Boolean(
		collection?.compMod?.bucketProperties?.isActivated ?? collection?.role?.compMod?.bucketProperties?.isActivated,
	);
};

/**
 * Check whether field properties changed.
 *
 * @param {FieldComparisonParams} compMod CompMod object.
 * @param {string[]} propertiesToCheck Properties to check.
 * @returns {boolean} Whether any property changed.
 */
const checkFieldPropertiesChanged = (compMod, propertiesToCheck) => {
	return propertiesToCheck.some(prop => compMod?.oldField[prop] !== compMod?.newField[prop]);
};

/**
 * Compare old and new property values.
 *
 * @template T
 * @param {PropertyPair<T>} params Property pair.
 * @returns {boolean} Whether values differ.
 */
const compareProperties = ({ new: newProperty, old: oldProperty }) => {
	if (!newProperty && !oldProperty) {
		return false;
	}
	return !isEqual(newProperty, oldProperty);
};

/**
 * Collect updated properties from compMod.
 *
 * @param {PropertyChanges} compMod CompMod object.
 * @param {string[]} properties Property names.
 * @returns {Record<string, unknown>} Changed properties with new values.
 */
const getUpdatedProperties = (compMod, properties) => {
	/** @type {Record<string, unknown>} */
	const updatedProperties = {};
	properties.forEach(property => {
		const propCompMod = compMod[property] ?? {};
		if (compareProperties(propCompMod) && propCompMod.new !== undefined) {
			updatedProperties[property] = propCompMod.new;
		}
	});
	return updatedProperties;
};

module.exports = {
	setTab,
	hasType,
	checkAllKeysDeactivated,
	checkIsKeyActivated,
	divideIntoActivatedAndDeactivated,
	commentIfDeactivated,
	wrapInQuotes,
	wrapInSingleQuotes,
	removeAllQuotes,
	getNamePrefixedWithSchemaName,
	getColumnsList,
	columnMapToStringWithOrder,
	toArray,
	getFullCollectionName,
	getEntityName,
	getSchemaOfAlterCollection,
	isObjectInDeltaModelActivated,
	isParentContainerActivated,
	getSchemaNameFromCollection,
	getUpdatedProperties,
	checkFieldPropertiesChanged,
};
