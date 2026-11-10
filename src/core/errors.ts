/** Base class for every error this library throws. */
export class EnigmaError extends Error {
	override readonly name: string = 'EnigmaError';
}

/** Thrown when a config, wiring table or setting fails validation. */
export class EnigmaConfigError extends EnigmaError {
	override readonly name: string = 'EnigmaConfigError';

	constructor(message: string, readonly detail?: Readonly<Record<string, unknown>>) {
		super(message);
	}
}

/** Thrown when a symbol is outside the machine alphabet. */
export class EnigmaSymbolError extends EnigmaError {
	override readonly name: string = 'EnigmaSymbolError';
}
