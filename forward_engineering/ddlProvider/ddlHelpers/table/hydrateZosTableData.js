/**
 * @import {
 *   HydratedPartitioning,
 *   HydratedTemporalPeriod,
 *   HydratePartitioningParams,
 *   HydrateTemporalPeriodParams
 * } from '../../../types/ddlProvider'
 */

const { getIdToNameHashTable, resolveFieldListName } = require('../jsonSchema/jsonSchemaHelper');

/**
 * Hydrate partitioning options.
 *
 * @param {HydratePartitioningParams} params Partitioning input.
 * @returns {HydratedPartitioning | null} Partitioning data.
 */
const hydratePartitioning = ({ jsonSchema, partitioning }) => {
	const partitioningConfig = Array.isArray(partitioning) ? partitioning[0] : partitioning;

	if (!partitioningConfig?.partitionBy) {
		return null;
	}

	const idToNameHashTable = getIdToNameHashTable({ jsonSchema });
	const partitionKey = (partitioningConfig.partitionKey ?? [])
		.map(key => {
			const name = key.keyId ? idToNameHashTable[key.keyId] : undefined;
			if (!name) {
				return null;
			}

			return {
				name,
				type: key.type,
				isActivated: key.isActivated ?? true,
			};
		})
		.filter(key => key !== null);

	return {
		partitionBy: partitioningConfig.partitionBy,
		everySize: partitioningConfig.everySize,
		nullsLast: partitioningConfig.nullsLast,
		partitionKey,
		partitions: partitioningConfig.partitions ?? [],
	};
};

/**
 * Hydrate temporal period options.
 *
 * @param {HydrateTemporalPeriodParams} params Period input.
 * @returns {HydratedTemporalPeriod | null} Period data.
 */
const hydrateTemporalPeriod = ({ jsonSchema, period }) => {
	const periodConfig = Array.isArray(period) ? period[0] : period;

	if (!periodConfig) {
		return null;
	}

	const idToNameHashTable = getIdToNameHashTable({ jsonSchema });
	const startColumn = resolveFieldListName({ keyRef: periodConfig.startColumn, idToNameHashTable });
	const endColumn = resolveFieldListName({ keyRef: periodConfig.endColumn, idToNameHashTable });

	if (!startColumn || !endColumn) {
		return null;
	}

	return {
		startColumn,
		endColumn,
		endInclusive: periodConfig.endInclusive,
	};
};

module.exports = {
	hydratePartitioning,
	hydrateTemporalPeriod,
};
