import type { ReflectorSpec, RotorSpec } from './types.js';
import { DEFAULT_ALPHABET } from './alphabet.js';
import { wiringFromLetters } from './validate.js';

/**
 * Historical rotor and reflector data.
 *
 * Wiring is given from the entry-disc (right-hand) side with the ring setting at
 * `A`, which is the measurement convention used by the Crypto Museum catalogue.
 * Notches are zero-based positions on the index ring: rotor I steps the next
 * rotor when `Q` shows in the window.
 */
const LETTERS = DEFAULT_ALPHABET;

function rotor(id: string, name: string, wiring: string, notches: string): RotorSpec {
	return {
		id,
		name,
		wiring: wiringFromLetters(wiring, LETTERS),
		notches: [...notches].map((letter) => LETTERS.indexOf(letter)),
	};
}

function reflector(id: string, name: string, wiring: string): ReflectorSpec {
	return { id, name, wiring: wiringFromLetters(wiring, LETTERS) };
}

/** Army/Luftwaffe and naval cipher rotors I-VIII, plus the two naval thin rotors. */
export const ROTORS: Readonly<Record<string, RotorSpec>> = {
	I: rotor('I', 'Rotor I', 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', 'Q'),
	II: rotor('II', 'Rotor II', 'AJDKSIRUXBLHWTMCQGZNPYFVOE', 'E'),
	III: rotor('III', 'Rotor III', 'BDFHJLCPRTXVZNYEIWGAKMUSQO', 'V'),
	IV: rotor('IV', 'Rotor IV', 'ESOVPZJAYQUIRHXLNFTGKDCMWB', 'J'),
	V: rotor('V', 'Rotor V', 'VZBRGITYUPSDNHLXAWMJQOFECK', 'Z'),
	VI: rotor('VI', 'Rotor VI', 'JPGVOUMFYQBENHZRDKASXLICTW', 'ZM'),
	VII: rotor('VII', 'Rotor VII', 'NZJHGRCXMYSWBOUFAIVLPEKQDT', 'ZM'),
	VIII: rotor('VIII', 'Rotor VIII', 'FKQHTLXOCBJSPDZRAMEWNIUYGV', 'ZM'),
	Beta: rotor('Beta', 'Thin rotor Beta (no notch)', 'LEYJVCNIXWPBQMDRTAKZGFUHOS', 'A'),
	Gamma: rotor('Gamma', 'Thin rotor Gamma (no notch)', 'FSOKANUERHMBTIYCWLQPZXVGJD', 'A'),
};

/** Reflectors: UKW-A (pre-war), UKW-B and UKW-C (standard), plus the M4 thin pair. */
export const REFLECTORS: Readonly<Record<string, ReflectorSpec>> = {
	A: reflector('A', 'UKW-A', 'EJMZALYXVBWFCRQUONTSPIKHGD'),
	B: reflector('B', 'UKW-B', 'YRUHQSLDPXNGOKMIEBFZCWVJAT'),
	C: reflector('C', 'UKW-C', 'FVPJIAOYEDRZXWGCTKUQSBNMHL'),
	'thin-B': reflector('thin-B', 'UKW-B thin (M4)', 'ENKQAUYWJICOPBLMDXZVFTHRGS'),
	'thin-C': reflector('thin-C', 'UKW-C thin (M4)', 'RDOBJNTKVEHMLFCWZAXGYIPSUQ'),
};

/** A named historical machine, described without any rendering information. */
export interface MachinePreset {
	readonly id: string;
	readonly name: string;
	readonly era: string;
	readonly summary: string;
	/** Rotors that could be fitted to this machine. */
	readonly rotorPool: readonly string[];
	/** Default rotor order, left to right, as an operator would read it. */
	readonly defaultRotorOrder: readonly string[];
	/** Reflectors this machine could be fitted with. */
	readonly reflectorPool: readonly string[];
	readonly defaultReflector: string;
	/** Plausible number of plugboard cables. */
	readonly defaultCables: number;
	/** True when thin rotors sit in the leftmost slot and never step. */
	readonly hasThinRotor: boolean;
}

export const PRESETS: Readonly<Record<string, MachinePreset>> = {
	'enigma-1': {
		id: 'enigma-1',
		name: 'Enigma I (Wehrmacht / Luftwaffe)',
		era: '1930-1945',
		summary:
			'The standard three-rotor service machine, chosen from five rotors with one of three reflectors and a ten-cable plugboard.',
		rotorPool: ['I', 'II', 'III', 'IV', 'V'],
		defaultRotorOrder: ['I', 'II', 'III'],
		reflectorPool: ['A', 'B', 'C'],
		defaultReflector: 'B',
		defaultCables: 10,
		hasThinRotor: false,
	},
	'kriegsmarine-m3': {
		id: 'kriegsmarine-m3',
		name: 'Kriegsmarine M3',
		era: '1940-1945',
		summary: 'Naval three-rotor machine with the wider pool of eight rotors and the thin reflectors.',
		rotorPool: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'],
		defaultRotorOrder: ['III', 'VI', 'VIII'],
		reflectorPool: ['B', 'C'],
		defaultReflector: 'B',
		defaultCables: 10,
		hasThinRotor: false,
	},
	'kriegsmarine-m4': {
		id: 'kriegsmarine-m4',
		name: 'Kriegsmarine M4 (Triton)',
		era: '1942-1945',
		summary:
			'The four-rotor U-boat machine: a thin Beta or Gamma rotor in the leftmost slot, which never steps, plus a thin reflector.',
		rotorPool: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'],
		defaultRotorOrder: ['Beta', 'II', 'IV', 'I'],
		reflectorPool: ['thin-B', 'thin-C'],
		defaultReflector: 'thin-B',
		defaultCables: 10,
		hasThinRotor: true,
	},
};

/** Default preset: the machine most people picture. */
export const DEFAULT_PRESET_ID = 'enigma-1';

/** Returns a preset by id, or throws with the list of known ids. */
export function getPreset(id: string = DEFAULT_PRESET_ID): MachinePreset {
	const preset = PRESETS[id];
	if (!preset) {
		throw new Error(`unknown preset "${id}"; known presets: ${Object.keys(PRESETS).join(', ')}`);
	}
	return preset;
}
