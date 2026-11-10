import { EnigmaConfigError } from './errors.js';

/** The 26-letter alphabet of every service Enigma machine. */
export const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Euclidean modulo, always in `[0, m)`. */
export function mod(value: number, m: number): number {
	const r = value % m;
	return r < 0 ? r + m : r;
}

/** Normalises an alphabet string and rejects duplicates. */
export function normaliseAlphabet(alphabet: string = DEFAULT_ALPHABET): string {
	if (alphabet.length < 2) {
		throw new EnigmaConfigError('alphabet must contain at least 2 symbols', { alphabet });
	}
	const seen = new Set<string>();
	for (const symbol of alphabet) {
		if (seen.has(symbol)) {
			throw new EnigmaConfigError(`alphabet contains duplicate symbol "${symbol}"`, { alphabet });
		}
		seen.add(symbol);
	}
	return alphabet;
}

/** Index of `symbol` in `alphabet`, or `-1`. */
export function symbolToIndex(alphabet: string, symbol: string): number {
	return alphabet.indexOf(symbol);
}

/** Symbol at `index`, wrapping around the alphabet. */
export function indexToSymbol(alphabet: string, index: number): string {
	return alphabet.charAt(mod(index, alphabet.length));
}
