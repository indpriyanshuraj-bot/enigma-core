/**
 * Models: a whole machine, described once, so a renderer can draw it and the
 * core can run it.
 *
 * A preset answers "which rotors did this machine carry?". A model answers the
 * larger question a user interface asks: what parts does it have, how many
 * slots, what does it start as, and how is it serialised into a link? The maths
 * stays here; the pixels stay in whatever draws it.
 */
import { DEFAULT_ALPHABET, normaliseAlphabet } from './alphabet.js';
import { EnigmaConfigError } from './errors.js';
import { buildConfig } from './config.js';
import { keyspace, type KeyspaceBreakdown } from './keyspace.js';
import { PRESETS, REFLECTORS, ROTORS, type MachinePreset } from './presets.js';
import { createRng } from './random.js';
import { randomReflector, randomWiring } from './keygen.js';
import type { MachineConfig, PlugPair, ReflectorSpec, RotorSpec } from './types.js';
import { assertReflectorSpec, assertRotorSpec } from './validate.js';

/** Which physical parts a machine has. A renderer reads this; it invents nothing. */
export interface ModelParts {
	/** Steckerbrett: cables between letters. */
	readonly plugboard: boolean;
	/** A lamp panel, separate from the keys. */
	readonly lampboard: boolean;
	/** A lid over the rotor box. */
	readonly lid: boolean;
	/** How many rotors the machine physically holds. */
	readonly rotorSlots: number;
}

/** A complete machine description. */
export interface MachineModel {
	readonly id: string;
	readonly name: string;
	readonly summary: string;
	readonly era?: string | undefined;
	/** Rotors an operator could fit, in catalogue order. */
	readonly rotors: readonly RotorSpec[];
	readonly reflectors: readonly ReflectorSpec[];
	/** Default rotor order, left to right. */
	readonly defaultRotorOrder: readonly string[];
	readonly defaultReflector: string;
	readonly defaultCables: number;
	/** Interchangeable thin rotors for the leftmost slot, if any. */
	readonly thinRotorChoices?: number | undefined;
	readonly alphabet: string;
	readonly parts: ModelParts;
	/** True when this machine never existed and was generated from a seed. */
	readonly custom?: boolean | undefined;
}

/** Everything a model needs; the id and name are required, the rest has defaults. */
export interface ModelInput {
	readonly id: string;
	readonly name: string;
	readonly summary?: string;
	readonly era?: string;
	readonly rotors: readonly RotorSpec[];
	readonly reflectors: readonly ReflectorSpec[];
	readonly defaultRotorOrder: readonly string[];
	readonly defaultReflector: string;
	readonly defaultCables?: number;
	readonly thinRotorChoices?: number;
	readonly alphabet?: string;
	readonly parts?: Partial<ModelParts>;
	readonly custom?: boolean;
}

/** Validates a model and fills in the defaults. Throws rather than guess. */
export function defineModel(input: ModelInput): MachineModel {
	const alphabet = normaliseAlphabet(input.alphabet ?? DEFAULT_ALPHABET);
	const size = alphabet.length;
	if (input.rotors.length === 0) throw new EnigmaConfigError(`model ${input.id}: needs at least one rotor`);
	if (input.reflectors.length === 0) throw new EnigmaConfigError(`model ${input.id}: needs at least one reflector`);

	const rotorIds = new Set<string>();
	for (const rotor of input.rotors) {
		if (rotorIds.has(rotor.id)) throw new EnigmaConfigError(`model ${input.id}: rotor ${rotor.id} is listed twice`);
		rotorIds.add(rotor.id);
		assertRotorSpec(rotor, size);
	}
	const reflectorIds = new Set<string>();
	for (const reflector of input.reflectors) {
		if (reflectorIds.has(reflector.id)) {
			throw new EnigmaConfigError(`model ${input.id}: reflector ${reflector.id} is listed twice`);
		}
		reflectorIds.add(reflector.id);
		assertReflectorSpec(reflector, size);
	}
	if (input.defaultRotorOrder.length === 0) {
		throw new EnigmaConfigError(`model ${input.id}: default rotor order is empty`);
	}
	for (const id of input.defaultRotorOrder) {
		if (!rotorIds.has(id)) throw new EnigmaConfigError(`model ${input.id}: default order names unknown rotor ${id}`);
	}
	if (!reflectorIds.has(input.defaultReflector)) {
		throw new EnigmaConfigError(`model ${input.id}: default reflector ${input.defaultReflector} is not in the model`);
	}

	const slots = input.parts?.rotorSlots ?? Math.max(input.defaultRotorOrder.length, 3);
	return {
		id: input.id,
		name: input.name,
		summary: input.summary ?? '',
		era: input.era,
		rotors: input.rotors,
		reflectors: input.reflectors,
		defaultRotorOrder: input.defaultRotorOrder,
		defaultReflector: input.defaultReflector,
		defaultCables: input.defaultCables ?? 10,
		thinRotorChoices: input.thinRotorChoices,
		alphabet,
		parts: {
			plugboard: input.parts?.plugboard ?? true,
			lampboard: input.parts?.lampboard ?? true,
			lid: input.parts?.lid ?? true,
			rotorSlots: slots,
		},
		custom: input.custom,
	};
}

/** Turns a historical preset into a model, using the published catalogue. */
export function modelFromPreset(preset: MachinePreset): MachineModel {
	// The thin rotors are physically part of the machine even though they are not
	// part of the cipher pool: the M4 chose one for the leftmost slot and then
	// three of the eight others, which is why its key space is 2·8·7·6.
	const pool = preset.hasThinRotor ? [...preset.rotorPool, 'Beta', 'Gamma'] : [...preset.rotorPool];
	const rotors = pool.map((id) => {
		const rotor = ROTORS[id];
		if (!rotor) throw new EnigmaConfigError(`preset ${preset.id}: unknown rotor ${id}`);
		return rotor;
	});
	const reflectors = preset.reflectorPool.map((id) => {
		const reflector = REFLECTORS[id];
		if (!reflector) throw new EnigmaConfigError(`preset ${preset.id}: unknown reflector ${id}`);
		return reflector;
	});
	return defineModel({
		id: preset.id,
		name: preset.name,
		summary: preset.summary,
		era: preset.era,
		rotors,
		reflectors,
		defaultRotorOrder: preset.defaultRotorOrder,
		defaultReflector: preset.defaultReflector,
		defaultCables: preset.defaultCables,
		...(preset.thinRotorChoices ? { thinRotorChoices: preset.thinRotorChoices } : {}),
		parts: { rotorSlots: preset.defaultRotorOrder.length, lid: true, plugboard: true, lampboard: true },
	});
}

/** Every historical machine, as models. */
export const MODELS: Readonly<Record<string, MachineModel>> = Object.fromEntries(
	Object.values(PRESETS).map((preset) => [preset.id, modelFromPreset(preset)]),
);

/** Looks a model up by id, or throws with the list of known ids. */
export function getModel(id: string): MachineModel {
	const model = MODELS[id];
	if (!model) throw new EnigmaConfigError(`unknown model "${id}"; known models: ${Object.keys(MODELS).join(', ')}`);
	return model;
}

/** Every model, in a stable order. */
export function listModels(): MachineModel[] {
	return Object.values(MODELS);
}

/** Options for a machine that never existed. */
export interface CustomModelOptions {
	readonly rotorCount: number;
	readonly seed?: number;
	/** Notch letters, e.g. `'Q'` or `'ZM'`. */
	readonly notches?: string;
	/** `'random'` for a generated reflector, or the id of a historical one. */
	readonly reflector?: string;
	readonly alphabet?: string;
	readonly name?: string;
}

/**
 * Generates a complete model — wiring, notches, reflector — from a seed.
 *
 * Deterministic, so a machine somebody invented can be shared as a seed and a
 * sentence, and two people get the same wheels. The constraints are the real
 * ones: a rotor wiring is a derangement, a reflector is an involution with no
 * fixed point.
 */
export function customModel(options: CustomModelOptions): MachineModel {
	const alphabet = normaliseAlphabet(options.alphabet ?? DEFAULT_ALPHABET);
	const size = alphabet.length;
	const count = Math.max(1, Math.min(Math.floor(options.rotorCount), 100));
	const notches = (options.notches ?? 'Q').toUpperCase().replace(/[^A-Z]/g, '') || 'Q';
	const rng = createRng(options.seed ?? 1932);

	const rotors: RotorSpec[] = Array.from({ length: count }, (_, index) => ({
		id: `C${index + 1}`,
		name: `Custom rotor ${index + 1}`,
		wiring: randomWiring(size, rng),
		notches: [...notches].map((letter) => Math.max(0, alphabet.indexOf(letter))),
	}));

	const historical = options.reflector && options.reflector !== 'random' ? REFLECTORS[options.reflector] : undefined;
	const reflectors: ReflectorSpec[] = historical
		? [historical]
		: [{ id: 'R', name: 'Generated reflector', wiring: randomReflector(size, rng) }];

	return defineModel({
		id: 'custom',
		name: options.name ?? `Custom ${count}-rotor machine`,
		summary: `A machine that never existed: ${count} rotor${count === 1 ? '' : 's'}, notches at ${notches}, ${size}-symbol alphabet.`,
		rotors,
		reflectors,
		defaultRotorOrder: rotors.map((rotor) => rotor.id),
		defaultReflector: reflectors[0]?.id ?? 'R',
		defaultCables: Math.min(10, Math.floor(size / 2)),
		alphabet,
		parts: { rotorSlots: count, lid: true, plugboard: true, lampboard: true },
		custom: true,
	});
}

/** Operator settings layered on top of a model. */
export interface ModelSettings {
	readonly rotorOrder?: readonly string[];
	readonly rings?: string;
	readonly positions?: string;
	readonly plugboard?: readonly PlugPair[];
	readonly reflector?: string;
}

/** Builds a runnable config from a model plus whatever the operator changed. */
export function modelToConfig(model: MachineModel, settings: ModelSettings = {}): MachineConfig {
	return buildConfig({
		alphabet: model.alphabet,
		rotorOrder: settings.rotorOrder ?? model.defaultRotorOrder,
		plugboard: settings.plugboard ?? [],
		reflector: settings.reflector ?? model.defaultReflector,
		rotors: model.rotors,
		reflectors: model.reflectors,
		...(settings.rings === undefined ? {} : { rings: settings.rings }),
		...(settings.positions === undefined ? {} : { positions: settings.positions }),
	});
}

/** Key space of a model as configured. */
export function modelKeyspace(model: MachineModel, settings: { rotorCount?: number; cables?: number } = {}): KeyspaceBreakdown {
	// Thin rotors are fitted but not chosen from the cipher pool.
	const pool = model.rotors.length - (model.thinRotorChoices ?? 0);
	return keyspace({
		alphabetSize: model.alphabet.length,
		rotorPool: pool,
		rotorCount: settings.rotorCount ?? model.defaultRotorOrder.length,
		cables: settings.cables ?? model.defaultCables,
		...(model.thinRotorChoices ? { thinRotorChoices: model.thinRotorChoices } : {}),
	});
}

/**
 * A compact, URL-safe description of a generated model.
 *
 * Only custom machines are encoded: a historical one is a known id, and the
 * catalogue is in the library, so `enigma-1` is enough to say everything.
 */
export function encodeModel(model: MachineModel): string | null {
	if (!model.custom) return null;
	const seed = model.summary.match(/\d+/)?.[0];
	const notches = model.rotors[0]?.notches.length
		? [...model.rotors[0].notches].map((index) => model.alphabet.charAt(index)).join('')
		: 'Q';
	const reflector = model.reflectors[0]?.id ?? 'R';
	const name = model.name.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 32);
	void seed;
	return ['c', model.rotors.length, model.alphabet.length, notches, reflector, encodeURIComponent(name)].join('~');
}

/** Rebuilds a generated model from {@link encodeModel} output. */
export function decodeModel(encoded: string): MachineModel | null {
	const parts = encoded.split('~');
	if (parts[0] !== 'c' || parts.length < 5) return null;
	const rotorCount = Number(parts[1]);
	const alphabetSize = Number(parts[2]);
	const notches = parts[3] ?? 'Q';
	const reflector = parts[4] ?? 'R';
	if (!Number.isFinite(rotorCount) || !Number.isFinite(alphabetSize)) return null;
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.slice(0, Math.max(2, Math.min(36, alphabetSize)));
	return customModel({
		rotorCount,
		notches,
		reflector,
		alphabet,
		...(parts[5] ? { name: decodeURIComponent(parts[5]) } : {}),
	});
}
