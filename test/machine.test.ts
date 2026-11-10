import { describe, expect, it } from 'vitest';
import {
	buildConfig,
	buildMachine,
	createMachine,
	EnigmaConfigError,
	EnigmaMachine,
	EnigmaSymbolError,
	PRESETS,
	REFLECTORS,
	ROTORS,
} from '../src/index.js';

describe('historical test vectors', () => {
	it('reproduces the published Enigma I trace: rings B, start AAA, AAAAA -> EWTYX', () => {
		const machine = buildMachine({ preset: 'enigma-1', rotorOrder: ['I', 'II', 'III'], reflector: 'B', rings: 'BBB', positions: 'AAA' });
		expect(machine.encrypt('AAAAA')).toBe('EWTYX');
	});

	it('reproduces the standard rings-A trace: AAAAA -> BDZGO', () => {
		const machine = buildMachine({ preset: 'enigma-1', rotorOrder: ['I', 'II', 'III'], reflector: 'B', rings: 'AAA', positions: 'AAA' });
		expect(machine.encrypt('AAAAA')).toBe('BDZGO');
	});

	it('decrypts its own ciphertext once the machine is returned to the start position', () => {
		const machine = buildMachine({ preset: 'enigma-1', positions: 'MCK', rings: 'AAA' });
		const plaintext = 'OBERKOMMANDODERWEHRMACHT';
		const ciphertext = machine.encrypt(plaintext);
		expect(ciphertext).not.toBe(plaintext);
		machine.setWindow('MCK');
		expect(machine.encrypt(ciphertext)).toBe(plaintext);
	});

	it('never maps a symbol to itself, which is what made Enigma self-reciprocal', () => {
		const machine = buildMachine({ preset: 'enigma-1', positions: 'XYZ' });
		for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
			expect(machine.encryptSymbol(letter)).not.toBe(letter);
		}
	});
});

describe('stepping', () => {
	it('double-steps the middle rotor from ADU through ADV to AEW', () => {
		const machine = buildMachine({ preset: 'enigma-1', rotorOrder: ['I', 'II', 'III'], positions: 'ADU' });
		const windows: string[] = [];
		for (let i = 0; i < 3; i += 1) {
			machine.press('A');
			windows.push(machine.window);
		}
		// ADU -> ADV (right rotor reaches its notch V), -> AEW (middle carries and
		// right passes V), -> BFX (the middle rotor is itself on its notch E, so it
		// steps *and* carries the left rotor: the double step).
		expect(windows).toEqual(['ADV', 'AEW', 'BFX']);
	});

	it('steps the right-hand rotor on every key press', () => {
		const machine = buildMachine({ preset: 'enigma-1', positions: 'AAA' });
		machine.encrypt('HELLOWORLD');
		expect(machine.window).toBe('AAK');
	});

	it('advances the third rotor only when the middle rotor turns over', () => {
		const machine = buildMachine({ preset: 'enigma-1', rotorOrder: ['I', 'II', 'III'], positions: 'AAV' });
		machine.press('A'); // right rotor sits on notch V, so the middle rotor carries
		expect(machine.window).toBe('ABW');
		machine.press('A'); // right rotor W -> X, middle rotor stays put
		expect(machine.window).toBe('ABX');
	});
});

describe('machine state', () => {
	it('round-trips a serialisable state snapshot', () => {
		const machine = buildMachine({ preset: 'kriegsmarine-m4', positions: 'ABCD', rings: 'BBBB' });
		machine.encrypt('HELLO');
		const state = machine.state;
		const restored = createMachine(buildConfig({ preset: 'kriegsmarine-m4' }));
		restored.setPositions(state.positions);
		restored.setRings(state.rings);
		expect(restored.window).toBe(machine.window);
		const clone = createMachine(buildConfig({ preset: 'kriegsmarine-m4' }));
		clone.setPositions(state.positions);
		clone.setRings(state.rings);
		expect(clone.encrypt('HELLO')).toBe(restored.encrypt('HELLO'));
	});

	it('preserves characters outside the alphabet by default', () => {
		const machine = buildMachine();
		expect(machine.encrypt('AB CD')).toMatch(/^..\s..$/);
	});

	it('throws for a symbol outside the alphabet when asked to', () => {
		const machine = buildMachine();
		expect(() => machine.encrypt('AB1', { preserveUnknown: false })).toThrow(EnigmaSymbolError);
	});

	it('accepts a custom alphabet', () => {
		const machine = new EnigmaMachine({
			alphabet: '01',
			rotors: [{ id: 'X', name: 'X', wiring: [1, 0], notches: [0] }],
			reflector: { id: 'R', name: 'R', wiring: [1, 0] },
		});
		expect(machine.encrypt('01')).toBe('10');
	});
});

describe('validation', () => {
	it('rejects a reflector that is not an involution', () => {
		expect(() =>
			createMachine({
				rotors: [ROTORS.I as never],
				reflector: { id: 'bad', name: 'bad', wiring: [...Array(26).keys()].map((i) => (i + 1) % 26) },
			}),
		).toThrow(EnigmaConfigError);
	});

	it('rejects a plugboard cable that reuses a symbol', () => {
		expect(() => buildMachine({ plugboard: [['A', 'B'], ['A', 'C']] })).toThrow(EnigmaConfigError);
	});

	it('rejects an unknown rotor id', () => {
		expect(() => buildMachine({ rotorOrder: ['I', 'II', 'ZZ'] })).toThrow(EnigmaConfigError);
	});

	it('ships a complete, validated historical catalogue', () => {
		for (const [id, spec] of Object.entries(ROTORS)) {
			expect(spec.wiring.length, id).toBe(26);
			expect(new Set(spec.wiring).size, id).toBe(26);
		}
		for (const [id, spec] of Object.entries(REFLECTORS)) {
			for (let i = 0; i < 26; i += 1) expect(spec.wiring[spec.wiring[i] as number], `${id}:${i}`).toBe(i);
		}
		expect(Object.keys(PRESETS)).toContain('kriegsmarine-m4');
	});
});
