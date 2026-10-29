/**
 * @typedef {import('./mega/decorateAttribute').DecorateAttributeOptions} DecorateAttributeOptions
 *
 * @typedef {import('./mega/decorateAttribute').MegaTargetProperties} AttributeProperties
 *
 * @typedef {import('./mega/decorateRelationship').DecorateRelationshipOptions} DecorateRelationshipOptions
 *
 * @typedef {import('./mega/decorateRelationship').MegaTargetProperties} RelationshipProperties
 */

/**
 * @typedef {{
 * 	apiVersion?: number;
 * 	layer: 'logical' | 'physical';
 * 	dbmsNamePatterns?: string[];
 * 	decorateAttribute?: (options: DecorateAttributeOptions) => AttributeProperties;
 * 	decorateRelationship?: (options: DecorateRelationshipOptions) => RelationshipProperties;
 * }} MegaTargetProvider
 */

const { decorateAttribute } = require('./mega/decorateAttribute');
const { decorateRelationship } = require('./mega/decorateRelationship');

/** @type {MegaTargetProvider} */
module.exports = {
	apiVersion: 1,
	layer: 'physical',
	dbmsNamePatterns: ['^DB2 OS', '^DB2 for z/OS'],
	decorateAttribute,
	decorateRelationship,
};
