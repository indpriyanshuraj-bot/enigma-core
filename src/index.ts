/**
 * `@enigma-lab/core` — a headless, deterministic Enigma machine.
 *
 * ```ts
 * import { buildMachine, PRESETS, keyspaceForPreset } from '@enigma-lab/core';
 *
 * const machine = buildMachine({ preset: 'enigma-1', positions: 'AAA', rings: 'AAA' });
 * machine.encrypt('AAAAA'); // 'BDZGO'
 * keyspaceForPreset('enigma-1').bits; // ~83.5
 * ```
 *
 * Nothing in this entry point touches the DOM, so it runs in Node, in a worker,
 * in a test runner, or in a service worker.
 */
export { DEFAULT_ALPHABET, indexToSymbol, mod, normaliseAlphabet, symbolToIndex } from './core/alphabet.js';
export {
	buildConfig,
	buildMachine,
	createReflectorSpec,
	createRotorSpec,
	withPlugboard,
	type BuildOptions,
} from './core/config.js';
export { EnigmaConfigError, EnigmaError, EnigmaSymbolError } from './core/errors.js';
export { formatKeyspace, keyspace, keyspaceForPreset, plugboardCount, rotorOrderCount, type KeyspaceBreakdown, type KeyspaceInput } from './core/keyspace.js';
export { createMachine, EnigmaMachine, type EncryptOptions } from './core/machine.js';
export {
	decodeIndicator,
	encodeIndicator,
	groupText,
	receive,
	transmit,
	type DailyKey,
	type ProcedureOptions,
	type TransmittedMessage,
} from './core/procedures.js';
export {
	generateKey,
	randomReflector,
	randomWiring,
	type GeneratedKey,
	type GenerateKeyOptions,
} from './core/keygen.js';
export { Plugboard } from './core/plugboard.js';
export {
	DEFAULT_PRESET_ID,
	getPreset,
	PRESETS,
	REFLECTORS,
	ROTORS,
	type MachinePreset,
} from './core/presets.js';
export { createRng, type Rng } from './core/random.js';
export { Rotor } from './core/rotor.js';
export type {
	KeyPress,
	MachineConfig,
	MachineState,
	PlugPair,
	ReflectorSpec,
	RotorSpec,
	RotorState,
	Wiring,
} from './core/types.js';
export {
	assertInvolution,
	assertPermutation,
	assertReflectorSpec,
	assertRotorSpec,
	invertWiring,
	wiringFromLetters,
} from './core/validate.js';
export const VERSION = '0.3.0';
