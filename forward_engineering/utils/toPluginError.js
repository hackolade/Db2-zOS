/**
 * Normalize a thrown value into the error shape the studio expects from plugin callbacks.
 *
 * @param {unknown} error Thrown value.
 * @returns {{ message: string; stack?: string }} Plugin error.
 */
const toPluginError = error => {
	if (error instanceof Error) {
		return { message: error.message, stack: error.stack };
	}

	return { message: String(error) };
};

module.exports = {
	toPluginError,
};
