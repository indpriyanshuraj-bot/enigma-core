import { describe, expect, it } from 'vitest';
import {
	buildConfig,
	buildMachine,
	createReflectorSpec,
	createRng,
	createRotorSpec,
	DEFAULT_ALPHABET,
	formatKeyspace,
	getPreset,
	indexToSymbol,
	keyspace,
	keyspaceForPreset,
	mod,
	normaliseAlphabet,
	PRESETS,
	REFLECTORS,
	ROTORS,
	symbolToIndex,
	withPlugboard,
	assertInvolution,
	assertPermutation,
	invertWiring,
	Plugboard,
	Rotor,
	EnigmaConfigError,
} from '../src/index.js';

describe('alphabet helpers', () => {
	it('normalises mod for negative values', () => {
		expect(mod(-1, 26)).toBe(25);
		expect(mod(27, 26)).toBe(1);
	});

	it('maps symbols to indices and back', () => {
		expect(symbolToIndex(DEFAULT_ALPHABET, 'A')).toBe(0);
		expect(symbolToIndex(DEFAULT_ALPHABET, '?')).toBe(-1);
		expect(indexToSymbol(DEFAULT_ALPHABET, 26)).toBe('A');
	});

	it('rejects duplicate and too-short alphabets', () => {
		expect(() => normaliseAlphabet('AAB')).toThrow(EnigmaConfigError);
		expect(() => normaliseAlphabet('A')).toThrow(EnigmaConfigError);
	});
});

describe('wiring validation', () => {
	it('detects a non-permutation', () => {
		expect(() => assertPermutation([0, 0], 2, 'test')).toThrow(EnigmaConfigError);
		expect(() => assertPermutation([0, 2], 2, 'test')).toThrow(EnigmaConfigError);
		expect(() => assertPermutation([0], 2, 'test')).toThrow(EnigmaConfigError);
		expect(() => assertPermutation([0, 1], 2, 'test')).not.toThrow();
	});

	it('detects a reflector with a fixed point', () => {
		expect(() => assertInvolution([0, 1], 2, 'test')).toThrow(EnigmaConfigError);
	});

	it('inverts a permutation', () => {
		expect(invertWiring([2, 0, 1])).toEqual([1, 2, 0]);
	});
});

describe('presets', () => {
	it('exposes every historical machine', () => {
		expect(Object.keys(PRESETS)).toEqual(['enigma-1', 'kriegsmarine-m3', 'kriegsmarine-m4']);
	});

	it('throws for an unknown preset', () => {
		expect(() => getPreset('nope')).toThrow(/unknown preset/);
	});

	it('accepts a preset object directly', () => {
		const config = buildConfig({ preset: getPreset('kriegsmarine-m4') });
		expect(config.rotors.map((rotor) => rotor.id)).toEqual(['Beta', 'II', 'IV', 'I']);
	});

	it('keeps the leftmost M4 rotor still, because thin rotors have no notch that engages', () => {
		const machine = buildMachine({ preset: 'kriegsmarine-m4', positions: 'AAAA' });
		machine.encrypt('A'.repeat(30));
		expect(machine.window.slice(0, 1)).toBe('A');
	});
});

describe('custom machines', () => {
	it('builds a rotor and reflector from letters', () => {
		const custom = createRotorSpec('custom', 'BACDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, 2) + 'CDEFGHIJKLMNOPQRSTUVWXYZ', 'A');
		expect(custom.wiring.length).toBe(26);
		const reflector = createReflectorSpec('custom-reflector', 'BACDEFGHIJKLMNOPQRSTUVWXYZ');
		expect(reflector.wiring.length).toBe(26);
	});

	it('runs a 100-rotor machine', () => {
		const rotor = createRotorSpec('spin', DEFAULT_ALPHABET.split('').reverse().join(''), 'A');
		const machine = buildMachine({ rotorOrder: Array.from({ length: 100 }, () => 'spin'), rotors: [rotor] });
		expect(machine.rotorCount).toBe(100);
		expect(machine.encrypt('HELLO')).toHaveLength(5);
	});

	it('rejects a rotor order that names a rotor twice', () => {
		expect(() => buildMachine({ rotorOrder: ['I', 'I', 'I'] })).not.toThrow();
	});

	it('rejects settings longer than the rotor stack', () => {
		expect(() => buildMachine({ positions: 'AAAAAA' })).toThrow(EnigmaConfigError);
		expect(() => buildMachine({ rings: 'AAAAAA' })).toThrow(EnigmaConfigError);
	});

	it('rejects letters outside the alphabet', () => {
		expect(() => buildMachine({ positions: 'AA1' })).toThrow(EnigmaConfigError);
	});

	it('swaps a plugboard without touching the rest of the config', () => {
		const config = buildConfig({ positions: 'AAA' });
		const updated = withPlugboard(config, [['A', 'B']]);
		expect(updated.plugboard).toEqual([['A', 'B']]);
		expect(config.plugboard).toEqual([]);
		const plugged = buildMachine({ plugboard: [['A', 'Q']] }).encrypt('A');
		const bare = buildMachine().encrypt('A');
		expect(plugged).not.toBe(bare);
	});

	it('rejects a bad plugboard pair shape', () => {
		expect(() => new Plugboard([['A'] as unknown as [string, string]])).toThrow(EnigmaConfigError);
		expect(() => new Plugboard([['A', 'A']])).toThrow(EnigmaConfigError);
		expect(() => new Plugboard([['A', '?']])).toThrow(EnigmaConfigError);
	});
});

describe('rotor', () => {
	it('wraps ring and position values', () => {
		const rotor = new Rotor(ROTORS.I as never, 26, { ring: 27, position: -1 });
		expect(rotor.ring).toBe(1);
		expect(rotor.position).toBe(25);
		expect(rotor.snapshot()).toEqual({ ring: 1, position: 25 });
	});

	it('reports the notch', () => {
		const rotor = new Rotor(ROTORS.I as never, 26, { position: 16 });
		expect(rotor.atNotch()).toBe(true);
		rotor.advance();
		expect(rotor.atNotch()).toBe(false);
	});

	it('rejects a wiring table of the wrong size', () => {
		expect(() => new Rotor(ROTORS.I as never, 25)).toThrow(EnigmaConfigError);
	});

	it('walks a signal forward and back through the same wiring', () => {
		const rotor = new Rotor(ROTORS.III as never, 26, { ring: 3, position: 7 });
		for (let contact = 0; contact < 26; contact += 1) {
			expect(rotor.backward(rotor.forward(contact))).toBe(contact);
		}
	});

	it('carries the naval rotors two notches', () => {
		expect(ROTORS.VI?.notches).toEqual([25, 12]);
		expect(REFLECTORS['thin-B']?.wiring.length).toBe(26);
	});
});

describe('symbol errors', () => {
	it('throws when pressing or encrypting an unknown symbol', () => {
		const machine = buildMachine();
		expect(() => machine.press('1')).toThrow();
		expect(() => machine.encryptSymbol('1')).toThrow();
		expect(() => machine.setWindow('A1')).toThrow();
		expect(() => machine.setRingLetters('A1')).toThrow();
	});

	it('throws when settings exceed the rotor stack', () => {
		const machine = buildMachine();
		expect(() => machine.setPositions([1, 2, 3, 4])).toThrow(EnigmaConfigError);
		expect(() => machine.setRings([1, 2, 3, 4])).toThrow(EnigmaConfigError);
	});

	it('refuses a config with no rotors', () => {
		expect(() => buildMachine({ rotorOrder: [] })).toThrow(EnigmaConfigError);
	});
});

describe('random', () => {
	it('is deterministic for a seed', () => {
		const a = createRng(42);
		const b = createRng(42);
		expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
	});

	it('shuffles without losing items', () => {
		const rng = createRng(7);
		const items = [...'ABCDEFGHIJ'];
		const shuffled = rng.shuffle(items);
		expect(shuffled).toHaveLength(items.length);
		expect([...shuffled].sort().join('')).toBe(items.join(''));
		expect(rng.pick(items)).toBeTypeOf('string');
		expect(rng.int(1)).toBe(0);
	});
});

describe('keyspace display', () => {
	it('formats small and large numbers differently', () => {
		expect(formatKeyspace(0n)).toBe('0');
		expect(formatKeyspace(999n)).toBe('999');
		expect(formatKeyspace(keyspaceForPreset('kriegsmarine-m4').total)).toMatch(/× 10\^/);
	});

	it('counts an M4 key space above an M3 one', () => {
		expect(keyspaceForPreset('kriegsmarine-m4').bits).toBeGreaterThan(keyspaceForPreset('kriegsmarine-m3').bits);
	});

	it('returns zero for an impossible machine', () => {
		const breakdown = keyspace({ rotorPool: 2, rotorCount: 3 });
		expect(breakdown.total).toBe(0n);
		expect(breakdown.bits).toBe(0);
		expect(formatKeyspace(breakdown)).toBe('0');
	});

	it('can exclude ring settings and positions', () => {
		const breakdown = keyspace({ rotorPool: 5, rotorCount: 3, cables: 0, includeRingSettings: false, includePositions: false });
		expect(breakdown.total).toBe(60n);
	});
});
