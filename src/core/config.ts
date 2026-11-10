import { DEFAULT_ALPHABET, normaliseAlphabet } from './alphabet.js';
import { EnigmaConfigError } from './errors.js';
import { EnigmaMachine } from './machine.js';
import { getPreset, REFLECTORS, ROTORS, type MachinePreset } from './presets.js';
import type { MachineConfig, PlugPair, ReflectorSpec, RotorSpec } from './types.js';
import { wiringFromLetters } from './validate.js';

/** Options for {@link buildConfig}, all of them operator-facing. */
export interface BuildOptions {
	/** Preset id, or a preset object. Default `enigma-1`. */
	readonly preset?: string | MachinePreset;
	/** Rotor order as the operator reads it: left to right. */
	readonly rotorOrder?: readonly string[];
	/** Reflector id, e.g. `B`. */
	readonly reflector?: string;
	/** Ring settings, left to right, as letters (`"AAA"`). */
	readonly rings?: string;
	/** Window start positions, left to right, as letters (`"AAA"`). */
	readonly positions?: string;
	/** Plugboard cables as symbol pairs. */
	readonly plugboard?: readonly PlugPair[];
	/** Extra rotors, letting a simulation go beyond the historical catalogue. */
	readonly rotors?: readonly RotorSpec[];
	/** Extra reflectors. */
	readonly reflectors?: readonly ReflectorSpec[];
	/** Machine alphabet. Default `A..Z`. */
	readonly alphabet?: string;
}

/** Builds a validated, serialisable config from operator-facing options. */
export function buildConfig(options: BuildOptions = {}): MachineConfig {
	const alphabet = normaliseAlphabet(options.alphabet ?? DEFAULT_ALPHABET);
	const preset = typeof options.preset === 'object' ? options.preset : getPreset(options.preset);
	const rotorCatalogue = new Map<string, RotorSpec>([
		...Object.entries(ROTORS).map(([id, spec]) => [id, spec] as const),
		...(options.rotors ?? []).map((spec) => [spec.id, spec] as const),
	]);
	const reflectorCatalogue = new Map<string, ReflectorSpec>([
		...Object.entries(REFLECTORS).map(([id, spec]) => [id, spec] as const),
		...(options.reflectors ?? []).map((spec) => [spec.id, spec] as const),
	]);

	const order = options.rotorOrder ?? preset.defaultRotorOrder;
	const leftToRight = order.map((id) => {
		const spec = rotorCatalogue.get(id);
		if (!spec) {
			throw new EnigmaConfigError(`unknown rotor "${id}"; known rotors: ${[...rotorCatalogue.keys()].join(', ')}`, { id });
		}
		return spec;
	});
	if (leftToRight.length === 0) {
		throw new EnigmaConfigError('rotor order is empty');
	}

	const reflectorId = options.reflector ?? preset.defaultReflector;
	const reflector = reflectorCatalogue.get(reflectorId);
	if (!reflector) {
		throw new EnigmaConfigError(`unknown reflector "${reflectorId}"`, { reflectorId });
	}

	const toIndices = (letters: string | undefined, label: string): number[] | undefined => {
		if (letters === undefined) return undefined;
		const indices = [...letters].map((letter) => {
			const index = alphabet.indexOf(letter);
			if (index === -1) {
				throw new EnigmaConfigError(`${label}: "${letter}" is outside the machine alphabet`, { letters });
			}
			return index;
		});
		if (indices.length > leftToRight.length) {
			throw new EnigmaConfigError(`${label}: got ${indices.length} letters for ${leftToRight.length} rotors`, { letters });
		}
		return indices;
	};

	return {
		alphabet,
		rotors: leftToRight,
		reflector,
		rings: toIndices(options.rings, 'rings'),
		positions: toIndices(options.positions, 'positions'),
		plugboard: options.plugboard ?? [],
	};
}

/** Builds a ready-to-use machine. */
export function buildMachine(options: BuildOptions = {}): EnigmaMachine {
	return new EnigmaMachine(buildConfig(options));
}

/** Creates a rotor spec from letter strings, so a UI can offer custom rotors. */
export function createRotorSpec(
	id: string,
	wiringLetters: string,
	notchLetters: string,
	options: { name?: string; alphabet?: string } = {},
): RotorSpec {
	const alphabet = normaliseAlphabet(options.alphabet ?? DEFAULT_ALPHABET);
	return {
		id,
		name: options.name ?? id,
		wiring: wiringFromLetters(wiringLetters, alphabet),
		notches: [...notchLetters].map((letter) => {
			const index = alphabet.indexOf(letter);
			if (index === -1) throw new EnigmaConfigError(`notch "${letter}" is outside the alphabet`);
			return index;
		}),
	};
}

/** Creates a reflector spec from a letter string. */
export function createReflectorSpec(id: string, wiringLetters: string, options: { name?: string; alphabet?: string } = {}): ReflectorSpec {
	const alphabet = normaliseAlphabet(options.alphabet ?? DEFAULT_ALPHABET);
	return { id, name: options.name ?? id, wiring: wiringFromLetters(wiringLetters, alphabet) };
}

/** Returns a copy of a config with a different plugboard. */
export function withPlugboard(config: MachineConfig, plugboard: readonly PlugPair[]): MachineConfig {
	return { ...config, plugboard };
}
