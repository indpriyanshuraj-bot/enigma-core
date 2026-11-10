import { DEFAULT_ALPHABET } from './alphabet.js';
import { EnigmaConfigError } from './errors.js';
import type { MachinePreset } from './presets.js';
import { getPreset } from './presets.js';
import type { PlugPair } from './types.js';
import { createRng, type Rng } from './random.js';

/** A complete daily key, ready to hand to `buildMachine`. */
export interface GeneratedKey {
	/** Rotor order, left to right. */
	readonly rotorOrder: readonly string[];
	readonly rings: string;
	readonly positions: string;
	readonly plugboard: readonly PlugPair[];
}

export interface GenerateKeyOptions {
	readonly rng?: Rng;
	readonly seed?: number;
	/** Number of plugboard cables. Defaults to the preset's usual count. */
	readonly cables?: number;
	readonly alphabet?: string;
	/** Cables the operator would avoid pairing, e.g. `['A','B']`. */
	readonly avoid?: readonly string[];
}

/**
 * Generates a daily key the way a key sheet did: rotors, rings, start positions
 * and ten cables, all chosen independently.
 *
 * Deterministic for a given seed, so a "random key" can be shared, replayed and
 * asserted on in tests.
 */
export function generateKey(preset: MachinePreset | string, options: GenerateKeyOptions = {}): GeneratedKey {
	const resolved = typeof preset === 'string' ? getPreset(preset) : preset;
	const alphabet = options.alphabet ?? DEFAULT_ALPHABET;
	const rng = options.rng ?? createRng(options.seed ?? 1);
	const pool = [...resolved.rotorPool];
	const thin = resolved.thinRotorChoices ? ['Beta', 'Gamma'].slice(0, resolved.thinRotorChoices) : [];
	const rotorsNeeded = resolved.defaultRotorOrder.length;
	if (rotorsNeeded - thin.length > pool.length) {
		throw new EnigmaConfigError(`preset ${resolved.id} cannot fit ${rotorsNeeded} rotors from a pool of ${pool.length}`);
	}

	const thinCount = thin.length ? 1 : 0;
	const chosen = rng.shuffle(pool).slice(0, rotorsNeeded - thinCount);
	const rotorOrder = [...(thin.length ? [rng.pick(thin)] : []), ...chosen];
	const letter = (): string => alphabet.charAt(rng.int(alphabet.length));
	const rings = Array.from({ length: rotorOrder.length }, letter).join('');
	const positions = Array.from({ length: rotorOrder.length }, letter).join('');

	const avoid = new Set(options.avoid ?? []);
	const available = [...alphabet].filter((symbol) => !avoid.has(symbol));
	const cables = options.cables ?? resolved.defaultCables;
	const plugboard: PlugPair[] = [];
	const spare = rng.shuffle(available);
	for (let index = 0; index + 1 < spare.length && plugboard.length < cables; index += 2) {
		plugboard.push([spare[index] as string, spare[index + 1] as string]);
	}

	return { rotorOrder, rings, positions, plugboard };
}

/**
 * Builds a random rotor wiring: a permutation with no fixed contact.
 *
 * Real rotors never wired a contact to itself, because that would let a letter
 * encode to itself through a single rotor. Generating one is the first step of
 * building a machine that never existed.
 */
export function randomWiring(size = 26, rng: Rng = createRng(1)): number[] {
	if (size < 2) throw new EnigmaConfigError('a wiring table needs at least two contacts');
	for (let attempt = 0; attempt < 64; attempt += 1) {
		const contacts = Array.from({ length: size }, (_, index) => index);
		const shuffled = rng.shuffle(contacts);
		if (shuffled.every((value, index) => value !== index)) return shuffled;
	}
	throw new EnigmaConfigError('could not generate a derangement; try another seed');
}

/** Builds a random reflector: an involution with no fixed points. */
export function randomReflector(size = 26, rng: Rng = createRng(1)): number[] {
	if (size % 2 !== 0) throw new EnigmaConfigError('a reflector needs an even number of contacts');
	const contacts = rng.shuffle(Array.from({ length: size }, (_, index) => index));
	const wiring = new Array<number>(size).fill(0);
	for (let index = 0; index < size; index += 2) {
		const a = contacts[index] as number;
		const b = contacts[index + 1] as number;
		wiring[a] = b;
		wiring[b] = a;
	}
	return wiring;
}
