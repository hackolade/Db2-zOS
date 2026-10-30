/** @import {MegaTargetProvider} from './types/megaProvider' */

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
