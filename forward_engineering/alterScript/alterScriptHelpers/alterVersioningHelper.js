/**
 * @import {
 *   AlterScriptDto,
 *   AlterTable
 * } from '../../types/alterScript'
 * @import {PeriodConfig} from '../../types/ddlProvider'
 */

const { createAlterScriptDto } = require('../dto/alterScriptDto');
const {
	getEntityName,
	getSchemaNameFromCollection,
	getSchemaOfAlterCollection,
	getNamePrefixedWithSchemaName,
} = require('../../utils/general');
const templates = require('../../ddlProvider/templates');
const { assignTemplates } = require('../../utils/assignTemplates');

/**
 * Read the single period config out of a group property, which the studio may serialize as an object or as a one-item
 * array depending on how it was last edited.
 *
 * @param {PeriodConfig | PeriodConfig[] | undefined} period Period group value.
 * @returns {PeriodConfig | undefined} Period config.
 */
const getPeriodConfig = period => (Array.isArray(period) ? period[0] : period);

/**
 * Resolve a cross-entity GUID reference (e.g. history table, archive table) to its schema-qualified name.
 *
 * @param {{ relatedSchemas: Record<string, AlterTable>; entityId?: string }} params Related entities and the referenced
 *   entity's GUID.
 * @returns {string | undefined} Schema-qualified table name.
 */
const resolveRelatedTableName = ({ relatedSchemas, entityId }) => {
	const relatedSchema = entityId ? relatedSchemas[entityId] : undefined;
	const name = relatedSchema ? getEntityName(relatedSchema) : undefined;

	if (!name) {
		return void 0;
	}

	return getNamePrefixedWithSchemaName({ name, schemaName: relatedSchema?.bucketName });
};

/**
 * Build the ALTER TABLE ... ADD VERSIONING statement linking a system-period temporal table to its history table.
 *
 * @param {Record<string, AlterTable>} relatedSchemas Sibling entities of the model/container batch, keyed by entity
 *   GUID.
 * @returns {(collection: AlterTable) => AlterScriptDto | undefined} Add versioning script builder.
 */
const getAddVersioningScriptDto = relatedSchemas => collection => {
	const collectionSchema = getSchemaOfAlterCollection(collection);
	const historyTableId = getPeriodConfig(collectionSchema.periodForSystemTime)?.historyTable;
	const historyTableName = resolveRelatedTableName({ relatedSchemas, entityId: historyTableId });

	if (!historyTableName) {
		return void 0;
	}

	const script = assignTemplates({
		template: templates.addVersioning,
		templateData: {
			tableName: getNamePrefixedWithSchemaName({
				name: getEntityName(collectionSchema),
				schemaName: getSchemaNameFromCollection({ collection }),
			}),
			historyTableName,
		},
	});

	return createAlterScriptDto([script], collectionSchema.isActivated ?? true, false);
};

/**
 * Build the ALTER TABLE ... ENABLE ARCHIVE statement linking a table to its archive table.
 *
 * @param {Record<string, AlterTable>} relatedSchemas Sibling entities of the model/container batch, keyed by entity
 *   GUID.
 * @returns {(collection: AlterTable) => AlterScriptDto | undefined} Enable archive script builder.
 */
const getEnableArchiveScriptDto = relatedSchemas => collection => {
	const collectionSchema = getSchemaOfAlterCollection(collection);

	if (!collectionSchema.archiveEnabled) {
		return void 0;
	}

	const archiveTableName = resolveRelatedTableName({ relatedSchemas, entityId: collectionSchema.archiveTable });

	if (!archiveTableName) {
		return void 0;
	}

	const script = assignTemplates({
		template: templates.enableArchive,
		templateData: {
			tableName: getNamePrefixedWithSchemaName({
				name: getEntityName(collectionSchema),
				schemaName: getSchemaNameFromCollection({ collection }),
			}),
			archiveTableName,
		},
	});

	return createAlterScriptDto([script], collectionSchema.isActivated ?? true, false);
};

module.exports = {
	getAddVersioningScriptDto,
	getEnableArchiveScriptDto,
};
