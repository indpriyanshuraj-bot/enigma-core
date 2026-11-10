import { mod, normaliseAlphabet } from './alphabet.js';
import { EnigmaConfigError } from './errors.js';
import type { PlugPair } from './types.js';

/**
 * Steckerbrett. Ten cables on the service Enigma, but the core imposes no
 * fixed count: a simulation may use zero, ten, or any legal maximum.
 */
export class Plugboard {
	readonly size: number;
	readonly pairs: readonly PlugPair[];
	readonly #map: Uint8Array;

	constructor(pairs: readonly PlugPair[] = [], alphabet: string = normaliseAlphabet()) {
		this.size = alphabet.length;
		this.pairs = pairs;
		const map = new Uint8Array(this.size);
		for (let contact = 0; contact < this.size; contact += 1) map[contact] = contact;
		const used = new Set<number>();
		for (const pair of pairs) {
			if (pair.length !== 2) {
				throw new EnigmaConfigError('each plugboard cable needs exactly two symbols', { pair });
			}
			const a = alphabet.indexOf(pair[0]);
			const b = alphabet.indexOf(pair[1]);
			if (a === -1 || b === -1) {
				throw new EnigmaConfigError(`plugboard cable ${pair[0]}${pair[1]} uses a symbol outside the alphabet`, {
					pair,
				});
			}
			if (a === b) {
				throw new EnigmaConfigError(`plugboard cable ${pair[0]}${pair[1]} connects a symbol to itself`, { pair });
			}
			if (used.has(a) || used.has(b)) {
				throw new EnigmaConfigError(`plugboard cable ${pair[0]}${pair[1]} reuses an already plugged symbol`, { pair });
			}
			used.add(a);
			used.add(b);
			map[a] = b;
			map[b] = a;
		}
		this.#map = map;
	}

	/** Applies the board. The board is an involution, so in and out are the same call. */
	swap(contact: number): number {
		return this.#map[mod(contact, this.size)] as number;
	}

	/** Number of cables plugged in. */
	get cableCount(): number {
		return this.pairs.length;
	}
}
