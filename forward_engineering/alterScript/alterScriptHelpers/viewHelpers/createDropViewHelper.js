/**
 * @import {
 *   AlterView,
 *   MapPropertiesFn,
 *   ViewDefinitionRef
 * } from '../../../types/alterScript'
 * @import {
 *   DdlProvider,
 *   HydratedViewColumn
 * } from '../../../types/ddlProvider'
 */

const {
	getSchemaOfAlterCollection,
	getSchemaNameFromCollection,
	getFullCollectionName,
	getEntityName,
} = require('../../../utils/general');

/**
 * Build the column list of a view, resolving each property to the table column it selects.
 *
 * @param {{
 * 	viewSchema: AlterView;
 * 	collectionRefsDefinitionsMap: Record<string, ViewDefinitionRef>;
 * 	mapProperties: MapPropertiesFn;
 * 	ddlProvider: DdlProvider;
 * }} params
 *   View schema, its column references, the property mapper and the DDL provider.
 * @returns {HydratedViewColumn[]} View columns.
 */
const getKeys = ({ viewSchema, collectionRefsDefinitionsMap, mapProperties, ddlProvider }) => {
	return mapProperties(viewSchema, (propertyName, schema) => {
		const definition = schema.refId ? collectionRefsDefinitionsMap[schema.refId] : undefined;

		if (!definition) {
			return ddlProvider.hydrateViewColumn({ name: propertyName, isActivated: schema.isActivated });
		}

		const name = definition.name ?? propertyName;

		return ddlProvider.hydrateViewColumn({
			name,
			alias: name === propertyName ? undefined : propertyName,
			isActivated: schema.isActivated,
			entityName: getEntityName(definition.collection?.[0] ?? {}),
			dbName: definition.bucket?.[0]?.code ?? definition.bucket?.[0]?.name ?? '',
		});
	});
};

/**
 * Build the CREATE VIEW statement.
 *
 * @param {{ ddlProvider: DdlProvider; mapProperties: MapPropertiesFn; view: AlterView }} params DDL provider, property
 *   mapper and view delta.
 * @returns {string} Create statement.
 */
const createView = ({ ddlProvider, mapProperties, view }) => {
	const viewSchema = getSchemaOfAlterCollection(view);
	const schemaData = { schemaName: getSchemaNameFromCollection({ collection: viewSchema }) ?? '' };

	const hydratedView = ddlProvider.hydrateView({
		viewData: {
			name: viewSchema.code ?? viewSchema.name ?? '',
			keys: getKeys({
				viewSchema,
				ddlProvider,
				mapProperties,
				collectionRefsDefinitionsMap: view.compMod?.collectionData?.collectionRefsDefinitionsMap ?? {},
			}),
			schemaData,
		},
		entityData: [viewSchema],
	});

	return ddlProvider.createView(hydratedView, {}, viewSchema.isActivated);
};

/**
 * Build the DROP VIEW statement.
 *
 * @param {{ ddlProvider: DdlProvider; viewSchema: AlterView }} params DDL provider and view schema.
 * @returns {string} Drop statement.
 */
const dropView = ({ ddlProvider, viewSchema }) => {
	return ddlProvider.dropView({ viewName: getFullCollectionName({ collectionSchema: viewSchema }) });
};

module.exports = {
	createView,
	dropView,
};
