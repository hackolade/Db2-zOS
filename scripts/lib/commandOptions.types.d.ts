export type CommandOptionDefinition<T> = {
	readonly defaultValue: T;
	readonly parse: (value: string, optionName: string) => T;
};
