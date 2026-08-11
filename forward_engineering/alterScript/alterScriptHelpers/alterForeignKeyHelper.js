/**
 * @import {
 *   AlterRelationship,
 *   AlterScriptDto
 * } from '../../types/alterScript'
 * @import {ForeignKeyStatement} from '../../types/ddlProvider'
 */

const { createAlterScriptDto, createDropAndRecreateAlterScriptDto } = require('../dto/alterScriptDto');
const { getNamePrefixedWithSchemaName, wrapInQuotes } = require('../../utils/general');
const templates = require('../../ddlProvider/templates');
const { assignTemplates } = require('../../utils/assignTemplates');
const { getDefaultConstraintName } = require('../../ddlProvider/ddlHelpers/key/getDefaultConstraintName');
const { CONSTRAINT_POSTFIX } = require('../../../shared/constants/constants');

/**
 * Resolve the current name of a relationship, falling back to a generated name (matching the PK/UK pattern) when the
 * relationship has none, so the FK statement is not silently dropped.
 *
 * @param {AlterRelationship} relationship Relationship delta.
 * @returns {string} Relationship name.
 */
const getRelationshipName = relationship => {
	const compMod = relationship.role.compMod;
	const name = compMod?.code?.new ?? compMod?.name?.new ?? relationship.role.code ?? relationship.role.name ?? '';

	return (
		name ||
		getDefaultConstraintName({
			entityName: compMod?.child?.collection?.name,
			postfix: CONSTRAINT_POSTFIX.foreignKey,
		})
	);
};

/**
 * Resolve the previous name of a relationship, falling back to a generated name (matching the PK/UK pattern) when the
 * relationship has none, so the FK statement is not silently dropped.
 *
 * @param {AlterRelationship} relationship Relationship delta.
 * @returns {string} Relationship name.
 */
const getOldRelationshipName = relationship => {
	const compMod = relationship.role.compMod;
	const name = compMod?.code?.old ?? compMod?.name?.old ?? relationship.role.code ?? relationship.role.name ?? '';

	return (
		name ||
		getDefaultConstraintName({
			entityName: compMod?.child?.collection?.name,
			postfix: CONSTRAINT_POSTFIX.foreignKey,
		})
	);
};

/**
 * Build the ADD FOREIGN KEY statement for a relationship.
 *
 * @param {AlterRelationship} relationship Relationship delta.
 * @returns {ForeignKeyStatement} Foreign key statement.
 */
const getAddForeignKeyStatement = relationship => {
	const compMod = relationship.role.compMod ?? {};
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, null);

	return ddlProvider.createForeignKey(
		{
			name: getRelationshipName(relationship),
			foreignKey: compMod.child?.collection?.fkFields ?? [],
			primaryKey: compMod.parent?.collection?.fkFields ?? [],
			customProperties: compMod.customProperties?.new,
			foreignTable: compMod.child?.collection?.name,
			foreignSchemaName: compMod.child?.bucket?.name,
			foreignTableActivated: compMod.child?.collection?.isActivated,
			primaryTable: compMod.parent?.collection?.name ?? '',
			primarySchemaName: compMod.parent?.bucket?.name,
			primaryTableActivated: compMod.parent?.collection?.isActivated,
		},
		{},
		{ schemaName: compMod.child?.bucket?.name ?? '' },
	);
};

/**
 * Build the DROP FOREIGN KEY statement for a relationship.
 *
 * @param {AlterRelationship} relationship Relationship delta.
 * @returns {ForeignKeyStatement} Foreign key statement.
 */
const getDeleteForeignKeyStatement = relationship => {
	const compMod = relationship.role.compMod ?? {};
	const statement = assignTemplates({
		template: templates.dropForeignKey,
		templateData: {
			tableName: getNamePrefixedWithSchemaName({
				name: compMod.child?.collection?.name ?? '',
				schemaName: compMod.child?.bucket?.name,
			}),
			constraintName: wrapInQuotes(getOldRelationshipName(relationship)),
		},
	});

	return {
		statement,
		isActivated: Boolean(compMod.isActivated?.new) && Boolean(compMod.child?.collection?.isActivated),
	};
};

/**
 * Check whether a relationship carries everything needed to build a foreign key.
 *
 * @param {AlterRelationship} relationship Relationship delta.
 * @returns {boolean} Whether the foreign key can be added.
 */
const canRelationshipBeAdded = relationship => {
	const compMod = relationship.role.compMod;

	if (!compMod) {
		return false;
	}

	return [
		getRelationshipName(relationship),
		compMod.parent?.bucket,
		compMod.parent?.collection,
		compMod.parent?.collection?.fkFields?.length,
		compMod.child?.bucket,
		compMod.child?.collection,
		compMod.child?.collection?.fkFields?.length,
	].every(Boolean);
};

/**
 * Check whether a relationship carries everything needed to drop a foreign key.
 *
 * @param {AlterRelationship} relationship Relationship delta.
 * @returns {boolean} Whether the foreign key can be dropped.
 */
const canRelationshipBeDeleted = relationship => {
	const compMod = relationship.role.compMod;

	if (!compMod) {
		return false;
	}

	return [getOldRelationshipName(relationship), compMod.child?.bucket, compMod.child?.collection].every(Boolean);
};

/**
 * Build the statements adding the foreign keys of new relationships.
 *
 * @param {AlterRelationship[]} addedRelationships Added relationships.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getAddForeignKeyScriptDtos = addedRelationships => {
	return addedRelationships
		.filter(relationship => canRelationshipBeAdded(relationship))
		.map(relationship => {
			const statement = getAddForeignKeyStatement(relationship);

			return createAlterScriptDto([statement.statement], statement.isActivated, false);
		})
		.filter(scriptDto => scriptDto !== undefined);
};

/**
 * Build the statements dropping the foreign keys of removed relationships.
 *
 * @param {AlterRelationship[]} deletedRelationships Deleted relationships.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getDeleteForeignKeyScriptDtos = deletedRelationships => {
	return deletedRelationships
		.filter(relationship => canRelationshipBeDeleted(relationship))
		.map(relationship => {
			const statement = getDeleteForeignKeyStatement(relationship);

			return createAlterScriptDto([statement.statement], statement.isActivated, true);
		})
		.filter(scriptDto => scriptDto !== undefined);
};

/**
 * Build the statements recreating the foreign keys of modified relationships.
 *
 * @param {AlterRelationship[]} modifiedRelationships Modified relationships.
 * @returns {AlterScriptDto[]} Alter script DTOs.
 */
const getModifyForeignKeyScriptDtos = modifiedRelationships => {
	return modifiedRelationships
		.filter(relationship => canRelationshipBeAdded(relationship) && canRelationshipBeDeleted(relationship))
		.map(relationship => {
			const deleteStatement = getDeleteForeignKeyStatement(relationship);
			const addStatement = getAddForeignKeyStatement(relationship);

			return createDropAndRecreateAlterScriptDto(
				deleteStatement.statement,
				addStatement.statement,
				deleteStatement.isActivated && addStatement.isActivated,
			);
		})
		.filter(scriptDto => scriptDto !== undefined);
};

module.exports = {
	getRelationshipName,
	getDeleteForeignKeyScriptDtos,
	getModifyForeignKeyScriptDtos,
	getAddForeignKeyScriptDtos,
};
