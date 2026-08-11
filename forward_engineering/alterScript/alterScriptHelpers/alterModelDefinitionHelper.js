/**
 * @import {
 *   AlterModelDefinition,
 *   AlterModelDefinitionCompMod,
 *   AlterScriptDto
 * } from '../../types/alterScript'
 * @import {
 *   App,
 *   DdlProvider,
 *   HydratedColumn,
 *   PropertyPair
 * } from '../../types/ddlProvider'
 */

const isEqual = require('lodash/isEqual');
const { createAlterScriptDto, createDropAndRecreateAlterScriptDto } = require('../dto/alterScriptDto');
const {
	checkFieldPropertiesChanged,
	getNamePrefixedWithSchemaName,
	getSchemaNameFromCollection,
	getSchemaOfAlterCollection,
} = require('../../utils/general');
const {
	dropTypeCommentStatement,
	getTypeCommentStatement,
} = require('../../ddlProvider/ddlHelpers/comment/commentHelper');
const { assignTemplates } = require('../../utils/assignTemplates');
const templates = require('../../ddlProvider/templates');
const { createColumnDefinitionBySchema } = require('./createColumnDefinition');

const SOURCE_TYPE_PROPERTIES = [
	'mode',
	'type',
	'length',
	'lengthSemantics',
	'precision',
	'scale',
	'fractSecPrecision',
	'withTimeZone',
	'characterSubtype',
	'ccsid',
	'inlineLength',
];

/**
 * Check whether a comparison pair changed.
 *
 * @param {PropertyPair<unknown> | undefined} pair Comparison pair.
 * @returns {boolean} Whether the values differ.
 */
const hasPairChanged = pair => pair !== undefined && !isEqual(pair.old, pair.new);

/**
 * Check source-type comparison pairs that can appear on a definition's role compMod in some Studio payloads.
 *
 * @param {AlterModelDefinitionCompMod | undefined} compMod Comparison data.
 * @returns {boolean} Whether a rendered source-type property changed.
 */
const hasSourceTypePairChanged = compMod =>
	hasPairChanged(compMod?.mode) ||
	hasPairChanged(compMod?.type) ||
	hasPairChanged(compMod?.length) ||
	hasPairChanged(compMod?.lengthSemantics) ||
	hasPairChanged(compMod?.precision) ||
	hasPairChanged(compMod?.scale) ||
	hasPairChanged(compMod?.fractSecPrecision) ||
	hasPairChanged(compMod?.withTimeZone) ||
	hasPairChanged(compMod?.characterSubtype) ||
	hasPairChanged(compMod?.ccsid) ||
	hasPairChanged(compMod?.inlineLength);

/**
 * Resolve the current definition name.
 *
 * @param {AlterModelDefinition} definitionData Definition delta.
 * @returns {string} Current type name.
 */
const getTypeName = definitionData => {
	const definitionSchema = getSchemaOfAlterCollection(definitionData);

	return (
		definitionData.role.compMod?.name?.new ??
		definitionData.compMod?.name?.new ??
		definitionData.compMod?.newField?.name ??
		definitionSchema.name ??
		''
	);
};

/**
 * Resolve the previous definition name for a drop during recreation.
 *
 * @param {AlterModelDefinition} definitionData Definition delta.
 * @returns {string} Previous type name.
 */
const getOldTypeName = definitionData => {
	return (
		definitionData.role.compMod?.name?.old ??
		definitionData.role.compMod?.collectionName?.old ??
		definitionData.compMod?.name?.old ??
		definitionData.compMod?.collectionName?.old ??
		definitionData.compMod?.oldField?.name ??
		getTypeName(definitionData)
	);
};

/**
 * Resolve the current activation flag from either supported comparison shape.
 *
 * @param {AlterModelDefinition} definitionData Definition delta.
 * @returns {boolean} Activation flag.
 */
const getIsActivated = definitionData => {
	const definitionSchema = getSchemaOfAlterCollection(definitionData);

	return (
		definitionData.role.compMod?.isActivated?.new ??
		definitionData.compMod?.isActivated?.new ??
		definitionSchema.isActivated ??
		true
	);
};

/**
 * Hydrate the current distinct type definition through the provider's standard column hydration path.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @param {AlterModelDefinition} definitionData Definition delta.
 * @returns {HydratedColumn} Hydrated UDT.
 */
const hydrateUdt = (ddlProvider, definitionData) => {
	const definitionSchema = getSchemaOfAlterCollection(definitionData);

	return createColumnDefinitionBySchema({
		name: getTypeName(definitionData),
		jsonSchema: { ...definitionSchema, compMod: undefined },
		parentJsonSchema: { required: [] },
		ddlProvider,
		schemaData: { schemaName: getSchemaNameFromCollection({ collection: definitionData }) ?? '' },
	});
};

/**
 * Build the DROP TYPE statement used only by delta scripts.
 *
 * @param {{ name: string; schemaName?: string }} params Type name.
 * @returns {string} Drop statement.
 */
const dropUdt = ({ name, schemaName }) => {
	return assignTemplates({
		template: templates.dropType,
		templateData: {
			name: getNamePrefixedWithSchemaName({ name, schemaName }),
		},
	});
};

/**
 * Check whether a modification changes the rendered type definition and therefore requires recreation.
 *
 * @param {AlterModelDefinition} definitionData Definition delta.
 * @returns {boolean} Whether the type must be recreated.
 */
const shouldRecreateType = definitionData => {
	const fieldCompMod = definitionData.compMod;
	const oldField = fieldCompMod?.oldField;
	const newField = fieldCompMod?.newField;
	const didFieldChange =
		oldField !== undefined &&
		newField !== undefined &&
		checkFieldPropertiesChanged({ oldField, newField }, [...SOURCE_TYPE_PROPERTIES, 'name']);

	return (
		didFieldChange ||
		hasSourceTypePairChanged(definitionData.compMod) ||
		hasSourceTypePairChanged(definitionData.role.compMod) ||
		hasPairChanged(definitionData.compMod?.name) ||
		hasPairChanged(definitionData.compMod?.collectionName) ||
		hasPairChanged(definitionData.role.compMod?.name) ||
		hasPairChanged(definitionData.role.compMod?.collectionName)
	);
};

/**
 * Resolve a modified description from either the role-level pair or field snapshots.
 *
 * @param {AlterModelDefinition} definitionData Definition delta.
 * @returns {PropertyPair<string>} Description comparison pair.
 */
const getDescriptionChange = definitionData => {
	const pair = definitionData.role.compMod?.description ?? definitionData.compMod?.description;
	if (pair) {
		return pair;
	}

	const oldDescription = definitionData.compMod?.oldField?.description;
	const newDescription = definitionData.compMod?.newField?.description;

	return {
		old: typeof oldDescription === 'string' ? oldDescription : undefined,
		new: typeof newDescription === 'string' ? newDescription : undefined,
	};
};

/**
 * Build the CREATE TYPE statement for an added definition.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @returns {(definitionData: AlterModelDefinition) => AlterScriptDto | undefined} Add type script builder.
 */
const getAddTypeScriptDto = ddlProvider => definitionData => {
	const script = ddlProvider.createUdt(hydrateUdt(ddlProvider, definitionData));

	return createAlterScriptDto([script], true, false);
};

/**
 * Build the DROP TYPE statement for a deleted definition.
 *
 * @param {AlterModelDefinition} definitionData Definition delta.
 * @returns {AlterScriptDto | undefined} Delete type script DTO.
 */
const getDeleteTypeScriptDto = definitionData => {
	const script = dropUdt({
		name: getOldTypeName(definitionData),
		schemaName: getSchemaNameFromCollection({ collection: definitionData }),
	});

	return createAlterScriptDto([script], true, true);
};

/**
 * Build the statements for a modified distinct type.
 *
 * @param {DdlProvider} ddlProvider DDL provider.
 * @returns {(definitionData: AlterModelDefinition) => AlterScriptDto[]} Modify type script builder.
 */
const getModifyTypeScriptDtos = ddlProvider => definitionData => {
	const hydratedUdt = hydrateUdt(ddlProvider, definitionData);
	const isActivated = getIsActivated(definitionData);

	if (shouldRecreateType(definitionData)) {
		const dropScript = dropUdt({
			name: getOldTypeName(definitionData),
			schemaName: hydratedUdt.schemaName,
		});
		const createScript = ddlProvider.createUdt({ ...hydratedUdt, isActivated: true });
		const scriptDto = createDropAndRecreateAlterScriptDto(dropScript, createScript, isActivated);

		return scriptDto ? [scriptDto] : [];
	}

	const description = getDescriptionChange(definitionData);
	if (!hasPairChanged(description)) {
		return [];
	}

	const typeName = getNamePrefixedWithSchemaName({
		name: hydratedUdt.name,
		schemaName: hydratedUdt.schemaName,
	});
	if (description.new) {
		const script = getTypeCommentStatement({ typeName, description: description.new });
		const scriptDto = createAlterScriptDto([script], isActivated, false);

		return scriptDto ? [scriptDto] : [];
	}

	if (description.old) {
		const script = dropTypeCommentStatement({ typeName });
		const scriptDto = createAlterScriptDto([script], isActivated, true);

		return scriptDto ? [scriptDto] : [];
	}

	return [];
};

/**
 * Build model-definition script builders bound to a DDL provider.
 *
 * @param {App} app App instance.
 * @returns {{
 * 	getAddTypeScriptDto: (definitionData: AlterModelDefinition) => AlterScriptDto | undefined;
 * 	getDeleteTypeScriptDto: (definitionData: AlterModelDefinition) => AlterScriptDto | undefined;
 * 	getModifyTypeScriptDtos: (definitionData: AlterModelDefinition) => AlterScriptDto[];
 * }}
 *   Type script builders.
 */
const getModelDefinitionsScripts = app => {
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);

	return {
		getAddTypeScriptDto: getAddTypeScriptDto(ddlProvider),
		getDeleteTypeScriptDto,
		getModifyTypeScriptDtos: getModifyTypeScriptDtos(ddlProvider),
	};
};

module.exports = {
	getModelDefinitionsScripts,
};
