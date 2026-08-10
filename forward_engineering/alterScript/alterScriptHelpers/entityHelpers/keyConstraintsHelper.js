/**
 * Diffing of primary and unique key constraints.
 *
 * Hackolade models a key that spans a single column either inline on that column or as a composite key holding one
 * column. Both representations produce the same DDL, so moving between them must not recreate the constraint unless the
 * key options changed as well. That is what the transition checks below establish.
 *
 * @import {
 *   AlterCollection,
 *   AlterColumn,
 *   AlterKeyKind,
 *   AlterScriptDto,
 *   ComparableKeyOptions,
 *   KeyScriptModification,
 *   KeyTransition
 * } from '../../../types/alterScript'
 * @import {
 *   CompositeKeyGroup,
 *   KeyConstraintColumn
 * } from '../../../types/ddlProvider'
 */

const lodash = require('lodash');
const { createAlterScriptDto } = require('../../dto/alterScriptDto');
const { createKeyScriptModification, keyTransition, noKeyTransition } = require('../../dto/keyDto');
const {
	getFullCollectionName,
	getSchemaOfAlterCollection,
	getEntityName,
	wrapInQuotes,
	isParentContainerActivated,
	isObjectInDeltaModelActivated,
} = require('../../../utils/general');

const AMOUNT_OF_COLUMNS_IN_REGULAR_KEY = 1;

/**
 * Build the constraint name Db2 for z/OS falls back to when the user did not provide one.
 *
 * @param {string} entityName Table name.
 * @param {AlterKeyKind} keyKind Key kind.
 * @returns {string} Constraint name.
 */
const getDefaultConstraintName = (entityName, keyKind) => [entityName, keyKind.constraintPostfix].join('_');

/**
 * Keep only the options that end up in the generated DDL.
 *
 * @param {{ id?: string; constraintName?: string } | undefined} optionHolder Key or key options.
 * @returns {ComparableKeyOptions} Comparable options.
 */
const extractComparableOptions = optionHolder => ({
	constraintName: optionHolder?.constraintName,
	id: optionHolder?.id,
});

/**
 * Read the comparable options of a key declared inline on a column.
 *
 * @param {AlterColumn} columnJsonSchema Column schema.
 * @param {AlterKeyKind} keyKind Key kind.
 * @returns {ComparableKeyOptions} Comparable options.
 */
const getRegularKeyOptions = (columnJsonSchema, keyKind) =>
	extractComparableOptions(columnJsonSchema[keyKind.keyOptionsProperty]);

/**
 * Check whether a column holds the key inline rather than as part of a composite key.
 *
 * @param {AlterColumn | undefined} columnJsonSchema Column schema.
 * @param {AlterKeyKind} keyKind Key kind.
 * @returns {boolean} Whether the key is declared inline.
 */
const isRegularKey = (columnJsonSchema, keyKind) =>
	Boolean(columnJsonSchema?.[keyKind.inlineKeyProperty]) && !columnJsonSchema?.[keyKind.compositeKeyProperty];

/**
 * Check whether a column takes part in the key in any representation.
 *
 * @param {AlterColumn | undefined} columnJsonSchema Column schema.
 * @param {AlterKeyKind} keyKind Key kind.
 * @returns {boolean} Whether the column is part of the key.
 */
const isAnyKey = (columnJsonSchema, keyKind) =>
	Boolean(columnJsonSchema?.[keyKind.inlineKeyProperty]) || Boolean(columnJsonSchema?.[keyKind.compositeKeyProperty]);

/**
 * Check whether a set of composite keys and an inline key describe the same constraint with the same options.
 *
 * @param {{ compositeKeys: CompositeKeyGroup[]; columnOptions: ComparableKeyOptions; keyKind: AlterKeyKind }} params
 *   Composite keys, inline key options and key kind.
 * @returns {boolean} Whether the options are equal.
 */
const areKeyOptionsEqual = ({ compositeKeys, columnOptions, keyKind }) =>
	compositeKeys.some(compositeKey => {
		if (compositeKey[keyKind.compositeKeyProperty]?.length !== AMOUNT_OF_COLUMNS_IN_REGULAR_KEY) {
			return false;
		}

		return lodash.isEqual(extractComparableOptions(compositeKey), columnOptions);
	});

/**
 * Read the previous and current composite keys of a collection.
 *
 * @param {AlterCollection} collection Collection delta.
 * @param {AlterKeyKind} keyKind Key kind.
 * @returns {{ oldKeys: CompositeKeyGroup[]; newKeys: CompositeKeyGroup[] }} Composite keys.
 */
const getCompositeKeyDelta = (collection, keyKind) => {
	const keyDelta = collection.role?.compMod?.[keyKind.compModProperty] ?? {};

	return {
		oldKeys: keyDelta.old ?? [],
		newKeys: keyDelta.new ?? [],
	};
};

/**
 * Check whether a composite key holding exactly one column and an inline key on the same column describe the same
 * constraint.
 *
 * @param {{
 * 	compositeKeys: CompositeKeyGroup[];
 * 	columns: Record<string, AlterColumn>;
 * 	keyKind: AlterKeyKind;
 * }} params
 *   Composite keys of one side of the diff, columns of the other side and key kind.
 * @returns {KeyTransition} Transition result.
 */
const getCompositeKeyTransition = ({ compositeKeys, columns, keyKind }) => {
	const idsOfColumns = compositeKeys.flatMap(
		compositeKey => compositeKey[keyKind.compositeKeyProperty]?.map(keyRef => keyRef.keyId) ?? [],
	);

	if (idsOfColumns.length !== AMOUNT_OF_COLUMNS_IN_REGULAR_KEY) {
		return noKeyTransition();
	}

	const columnJsonSchema = Object.values(columns).find(column => column.GUID === idsOfColumns[0]);

	if (!columnJsonSchema || !isRegularKey(columnJsonSchema, keyKind)) {
		return noKeyTransition();
	}

	const columnOptions = getRegularKeyOptions(columnJsonSchema, keyKind);

	return keyTransition(!areKeyOptionsEqual({ compositeKeys, columnOptions, keyKind }));
};

/**
 * Check whether the composite keys of a collection actually changed.
 *
 * @param {{ oldKeys: CompositeKeyGroup[]; newKeys: CompositeKeyGroup[] }} params Composite keys.
 * @returns {boolean} Whether the keys changed.
 */
const didCompositeKeysChange = ({ oldKeys, newKeys }) => {
	if (oldKeys.length === 0 && newKeys.length === 0) {
		return false;
	}

	if (oldKeys.length !== newKeys.length) {
		return true;
	}

	return lodash.differenceWith(oldKeys, newKeys, (oldKey, newKey) => lodash.isEqual(oldKey, newKey)).length > 0;
};

/**
 * Resolve the columns of a composite key by the identifiers it references.
 *
 * @param {{ compositeKey: CompositeKeyGroup; columns: Record<string, AlterColumn>; keyKind: AlterKeyKind }} params
 *   Composite key, available columns and key kind.
 * @returns {KeyConstraintColumn[]} Constraint columns.
 */
const getCompositeKeyColumns = ({ compositeKey, columns, keyKind }) =>
	lodash
		.toPairs(columns)
		.filter(([, jsonSchema]) =>
			compositeKey[keyKind.compositeKeyProperty]?.some(keyRef => keyRef.keyId === jsonSchema.GUID),
		)
		.map(([name, jsonSchema]) => ({ name, isActivated: jsonSchema.isActivated }));

/**
 * Build the statements adding the composite keys that appeared or changed.
 *
 * @param {{ collection: AlterCollection; keyKind: AlterKeyKind }} params Collection delta and key kind.
 * @returns {KeyScriptModification[]} Key statements.
 */
const getAddCompositeKeyScriptModifications = ({ collection, keyKind }) => {
	const { oldKeys, newKeys } = getCompositeKeyDelta(collection, keyKind);
	const transition = getCompositeKeyTransition({
		compositeKeys: newKeys,
		columns: collection.role?.properties ?? {},
		keyKind,
	});

	if (transition.didTransitionHappen && !transition.wasKeyChangedInTransition) {
		return [];
	}

	if (!didCompositeKeysChange({ oldKeys, newKeys })) {
		return [];
	}

	const collectionSchema = getSchemaOfAlterCollection(collection);
	const fullTableName = getFullCollectionName({ collectionSchema });
	const entityName = getEntityName(collectionSchema);
	const isCollectionActivated = isParentContainerActivated(collection) && isObjectInDeltaModelActivated(collection);

	return newKeys
		.map(compositeKey => {
			const columns = getCompositeKeyColumns({
				compositeKey,
				columns: collection.role?.properties ?? {},
				keyKind,
			});

			if (columns.length === 0) {
				return void 0;
			}

			const statement = keyKind.buildAlterStatement({
				tableName: fullTableName,
				isParentActivated: isCollectionActivated,
				keyConfig: {
					keyType: keyKind.keyType,
					name: compositeKey.constraintName ?? getDefaultConstraintName(entityName, keyKind),
					columns,
				},
			});

			return createKeyScriptModification({
				script: statement.statement,
				fullTableName,
				isDropScript: false,
				isActivated: statement.isActivated,
			});
		})
		.filter(scriptDto => scriptDto !== undefined)
		.filter(scriptDto => Boolean(scriptDto.script));
};

/**
 * Build the statements dropping the composite keys that disappeared or changed.
 *
 * @param {{ collection: AlterCollection; keyKind: AlterKeyKind }} params Collection delta and key kind.
 * @returns {KeyScriptModification[]} Key statements.
 */
const getDropCompositeKeyScriptModifications = ({ collection, keyKind }) => {
	const { oldKeys, newKeys } = getCompositeKeyDelta(collection, keyKind);
	const transition = getCompositeKeyTransition({
		compositeKeys: oldKeys,
		columns: collection.properties ?? {},
		keyKind,
	});

	if (transition.didTransitionHappen && !transition.wasKeyChangedInTransition) {
		return [];
	}

	if (!didCompositeKeysChange({ oldKeys, newKeys })) {
		return [];
	}

	const collectionSchema = getSchemaOfAlterCollection(collection);
	const fullTableName = getFullCollectionName({ collectionSchema });
	const entityName = getEntityName(collectionSchema);
	const isCollectionActivated = isParentContainerActivated(collection) && isObjectInDeltaModelActivated(collection);

	return oldKeys
		.map(compositeKey => {
			const constraintName = compositeKey.constraintName ?? getDefaultConstraintName(entityName, keyKind);
			const script = keyKind.buildDropStatement({
				tableName: fullTableName,
				constraintName: wrapInQuotes(constraintName),
			});

			return createKeyScriptModification({
				script,
				fullTableName,
				isDropScript: true,
				isActivated: isCollectionActivated,
			});
		})
		.filter(scriptDto => Boolean(scriptDto.script));
};

/**
 * Check whether a column that holds the key inline used to be part of a composite key with different options.
 *
 * @param {{ columnJsonSchema: AlterColumn; collection: AlterCollection; keyKind: AlterKeyKind }} params Column, its
 *   collection and the key kind.
 * @returns {KeyTransition} Transition result.
 */
const getRegularKeyTransitionFromComposite = ({ columnJsonSchema, collection, keyKind }) => {
	const oldName = columnJsonSchema.compMod?.oldField?.name ?? '';
	const oldColumnJsonSchema = collection.role?.properties?.[oldName];

	if (!isRegularKey(columnJsonSchema, keyKind) || !isAnyKey(oldColumnJsonSchema, keyKind)) {
		return noKeyTransition();
	}

	const { oldKeys, newKeys } = getCompositeKeyDelta(collection, keyKind);
	const wasCompositeKey = oldKeys.some(compositeKey =>
		compositeKey[keyKind.compositeKeyProperty]?.some(keyRef => keyRef.keyId === oldColumnJsonSchema?.GUID),
	);
	const isCompositeKey = newKeys.some(compositeKey =>
		compositeKey[keyKind.compositeKeyProperty]?.some(keyRef => keyRef.keyId === columnJsonSchema.GUID),
	);

	if (!wasCompositeKey || isCompositeKey) {
		return noKeyTransition();
	}

	const columnOptions = getRegularKeyOptions(columnJsonSchema, keyKind);

	return keyTransition(!areKeyOptionsEqual({ compositeKeys: oldKeys, columnOptions, keyKind }));
};

/**
 * Check whether a column that used to hold the key inline became part of a composite key with different options.
 *
 * @param {{ columnJsonSchema: AlterColumn; collection: AlterCollection; keyKind: AlterKeyKind }} params Column, its
 *   collection and the key kind.
 * @returns {KeyTransition} Transition result.
 */
const getRegularKeyTransitionToComposite = ({ columnJsonSchema, collection, keyKind }) => {
	const oldName = columnJsonSchema.compMod?.oldField?.name ?? '';
	const oldColumnJsonSchema = collection.role?.properties?.[oldName];

	if (!isRegularKey(oldColumnJsonSchema, keyKind) || !isAnyKey(columnJsonSchema, keyKind)) {
		return noKeyTransition();
	}

	const { oldKeys, newKeys } = getCompositeKeyDelta(collection, keyKind);
	const wasCompositeKey = oldKeys.some(compositeKey =>
		compositeKey[keyKind.compositeKeyProperty]?.some(keyRef => keyRef.keyId === oldColumnJsonSchema?.GUID),
	);
	const isCompositeKey = newKeys.some(compositeKey =>
		compositeKey[keyKind.compositeKeyProperty]?.some(keyRef => keyRef.keyId === columnJsonSchema.GUID),
	);

	if (!isCompositeKey || wasCompositeKey) {
		return noKeyTransition();
	}

	const columnOptions = getRegularKeyOptions(oldColumnJsonSchema ?? {}, keyKind);

	return keyTransition(!areKeyOptionsEqual({ compositeKeys: newKeys, columnOptions, keyKind }));
};

/**
 * Check whether the options of a key that stayed inline changed.
 *
 * @param {{ columnJsonSchema: AlterColumn; collection: AlterCollection; keyKind: AlterKeyKind }} params Column, its
 *   collection and the key kind.
 * @returns {boolean} Whether the key has to be recreated.
 */
const wasRegularKeyModified = ({ columnJsonSchema, collection, keyKind }) => {
	const oldName = columnJsonSchema.compMod?.oldField?.name ?? '';
	const oldColumnJsonSchema = collection.role?.properties?.[oldName];

	if (!isRegularKey(columnJsonSchema, keyKind) || !isRegularKey(oldColumnJsonSchema, keyKind)) {
		return false;
	}

	return !lodash.isEqual(
		getRegularKeyOptions(oldColumnJsonSchema ?? {}, keyKind),
		getRegularKeyOptions(columnJsonSchema, keyKind),
	);
};

/**
 * Build the statements adding the inline keys that appeared or changed.
 *
 * @param {{ collection: AlterCollection; keyKind: AlterKeyKind }} params Collection delta and key kind.
 * @returns {KeyScriptModification[]} Key statements.
 */
const getAddRegularKeyScriptModifications = ({ collection, keyKind }) => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const fullTableName = getFullCollectionName({ collectionSchema });
	const entityName = getEntityName(collectionSchema);
	const isCollectionActivated = isParentContainerActivated(collection) && isObjectInDeltaModelActivated(collection);

	return lodash
		.toPairs(collection.properties ?? {})
		.filter(([, columnJsonSchema]) => {
			const oldName = columnJsonSchema.compMod?.oldField?.name ?? '';
			const oldColumnJsonSchema = collection.role?.properties?.[oldName];

			if (isRegularKey(columnJsonSchema, keyKind) && !isAnyKey(oldColumnJsonSchema, keyKind)) {
				return true;
			}

			const transition = getRegularKeyTransitionFromComposite({ columnJsonSchema, collection, keyKind });

			if (transition.didTransitionHappen) {
				return Boolean(transition.wasKeyChangedInTransition);
			}

			return wasRegularKeyModified({ columnJsonSchema, collection, keyKind });
		})
		.map(([name, columnJsonSchema]) => {
			const configuredConstraintName = columnJsonSchema[keyKind.keyOptionsProperty]?.constraintName?.trim();
			const constraintName =
				configuredConstraintName === undefined || configuredConstraintName === ''
					? getDefaultConstraintName(entityName, keyKind)
					: configuredConstraintName;
			const statement = keyKind.buildAlterStatement({
				tableName: fullTableName,
				isParentActivated: isCollectionActivated,
				keyConfig: {
					keyType: keyKind.keyType,
					name: constraintName,
					columns: [{ name, isActivated: columnJsonSchema.isActivated }],
					options: columnJsonSchema[keyKind.keyOptionsProperty],
				},
			});

			return createKeyScriptModification({
				script: statement.statement,
				fullTableName,
				isDropScript: false,
				isActivated: statement.isActivated,
			});
		})
		.filter(scriptDto => Boolean(scriptDto.script));
};

/**
 * Build the statements dropping the inline keys that disappeared or changed.
 *
 * @param {{ collection: AlterCollection; keyKind: AlterKeyKind }} params Collection delta and key kind.
 * @returns {KeyScriptModification[]} Key statements.
 */
const getDropRegularKeyScriptModifications = ({ collection, keyKind }) => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const fullTableName = getFullCollectionName({ collectionSchema });
	const entityName = getEntityName(collectionSchema);
	const isCollectionActivated = isParentContainerActivated(collection) && isObjectInDeltaModelActivated(collection);

	return lodash
		.toPairs(collection.properties ?? {})
		.filter(([, columnJsonSchema]) => {
			const oldName = columnJsonSchema.compMod?.oldField?.name ?? '';
			const oldColumnJsonSchema = collection.role?.properties?.[oldName];

			if (isRegularKey(oldColumnJsonSchema, keyKind) && !isAnyKey(columnJsonSchema, keyKind)) {
				return true;
			}

			const transition = getRegularKeyTransitionToComposite({ columnJsonSchema, collection, keyKind });

			if (transition.didTransitionHappen) {
				return Boolean(transition.wasKeyChangedInTransition);
			}

			return wasRegularKeyModified({ columnJsonSchema, collection, keyKind });
		})
		.map(([, columnJsonSchema]) => {
			const oldName = columnJsonSchema.compMod?.oldField?.name ?? '';
			const oldColumnJsonSchema = collection.role?.properties?.[oldName];
			const configuredConstraintName = oldColumnJsonSchema?.[keyKind.keyOptionsProperty]?.constraintName?.trim();
			const constraintName =
				configuredConstraintName === undefined || configuredConstraintName === ''
					? getDefaultConstraintName(entityName, keyKind)
					: configuredConstraintName;
			const script = keyKind.buildDropStatement({
				tableName: fullTableName,
				constraintName: wrapInQuotes(constraintName),
			});

			return createKeyScriptModification({
				script,
				fullTableName,
				isDropScript: true,
				isActivated: isCollectionActivated,
			});
		})
		.filter(scriptDto => Boolean(scriptDto.script));
};

/**
 * Order the statements so that, for a given table, the drop of a key always precedes its recreation.
 *
 * @param {KeyScriptModification[]} keyScriptModifications Key statements.
 * @returns {KeyScriptModification[]} Ordered key statements.
 */
const sortKeyScriptModifications = keyScriptModifications =>
	lodash.orderBy(
		keyScriptModifications,
		[modification => modification.fullTableName, modification => !modification.isDropScript],
		['asc', 'asc'],
	);

/**
 * Build all statements for one key kind of a collection.
 *
 * @param {{ collection: AlterCollection; keyKind: AlterKeyKind }} params Collection delta and key kind.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifyKeyConstraintsScriptDtos = ({ collection, keyKind }) => {
	const keyScriptModifications = [
		...getDropCompositeKeyScriptModifications({ collection, keyKind }),
		...getAddCompositeKeyScriptModifications({ collection, keyKind }),
		...getDropRegularKeyScriptModifications({ collection, keyKind }),
		...getAddRegularKeyScriptModifications({ collection, keyKind }),
	];

	return sortKeyScriptModifications(keyScriptModifications)
		.map(modification =>
			createAlterScriptDto([modification.script], modification.isActivated, modification.isDropScript),
		)
		.filter(scriptDto => scriptDto !== undefined);
};

module.exports = {
	getModifyKeyConstraintsScriptDtos,
};
