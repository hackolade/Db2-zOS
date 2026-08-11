/** @import {TemplateData} from '../types/ddlProvider' */

/**
 * Build template placeholder regexp.
 *
 * @param {string} [modifiers] RegExp flags.
 * @returns {RegExp} Template regexp.
 */
const createTemplateRegExp = (modifiers = '') => new RegExp('\\$\\{(.*?)\\}', `${modifiers}u`);

/**
 * Find all template placeholders.
 *
 * @param {string} str Template string.
 * @returns {string[]} Matched placeholders.
 */
const getAllTemplates = str => str.match(createTemplateRegExp('gi')) ?? [];

/**
 * Parse placeholder name.
 *
 * @param {string} str Placeholder string.
 * @returns {string | undefined} Template name.
 */
const parseTemplate = str => (str.match(createTemplateRegExp('i')) ?? [])[1];

/**
 * Replace template placeholders with values.
 *
 * @param {{ template: string; templateData: TemplateData }} params Template input.
 * @returns {string} Rendered string.
 */
const assignTemplates = ({ template: templateString, templateData }) => {
	return getAllTemplates(templateString).reduce((result, item) => {
		const templateName = parseTemplate(item);

		return result.replace(item, () => {
			const value = templateName ? templateData[templateName] : undefined;
			return value || value === 0 ? String(value) : '';
		});
	}, templateString);
};

module.exports = {
	assignTemplates,
};
