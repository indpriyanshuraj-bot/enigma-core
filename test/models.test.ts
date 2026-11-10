import { describe, expect, it } from 'vitest';
import {
	customModel,
	decodeModel,
	defineModel,
	encodeModel,
	getModel,
	listModels,
	MODELS,
	modelKeyspace,
	modelToConfig,
	REFLECTORS,
	ROTORS,
	EnigmaMachine,
} from '../src/index.js';

describe('models', () => {
	it('exposes every historical machine as a model', () => {
		expect(Object.keys(MODELS)).toEqual(['enigma-1', 'kriegsmarine-m3', 'kriegsmarine-m4']);
		expect(listModels()).toHaveLength(3);
		expect(getModel('kriegsmarine-m4').parts.rotorSlots).toBe(4);
	});

	it('throws for an unknown model', () => {
		expect(() => getModel('nope')).toThrow(/unknown model/);
	});

	it('validates the parts of a model', () => {
		const base = { id: 'x', name: 'X', rotors: [ROTORS.I as never], reflectors: [REFLECTORS.B as never] };
		expect(() => defineModel({ ...base, defaultRotorOrder: ['II'], defaultReflector: 'B' })).toThrow(/unknown rotor/);
		expect(() => defineModel({ ...base, defaultRotorOrder: ['I'], defaultReflector: 'C' })).toThrow(/not in the model/);
		expect(() => defineModel({ ...base, rotors: [], defaultRotorOrder: ['I'], defaultReflector: 'B' })).toThrow();
		expect(() =>
			defineModel({ ...base, rotors: [ROTORS.I as never, ROTORS.I as never], defaultRotorOrder: ['I'], defaultReflector: 'B' }),
		).toThrow(/twice/);
	});

	it('fills in the defaults a renderer needs', () => {
		const model = defineModel({
			id: 'm',
			name: 'M',
			rotors: [ROTORS.I as never, ROTORS.II as never],
			reflectors: [REFLECTORS.B as never],
			defaultRotorOrder: ['I', 'II'],
			defaultReflector: 'B',
		});
		expect(model.parts).toEqual({ plugboard: true, lampboard: true, lid: true, rotorSlots: 3 });
		expect(model.alphabet).toHaveLength(26);
		expect(model.defaultCables).toBe(10);
	});

	it('runs a machine from a model', () => {
		const model = getModel('enigma-1');
		const config = modelToConfig(model, { rotorOrder: ['I', 'II', 'III'], rings: 'BBB', positions: 'AAA' });
		expect(new EnigmaMachine(config).encrypt('AAAAA')).toBe('EWTYX');
	});

	it('counts the key space of a model', () => {
		expect(modelKeyspace(getModel('enigma-1')).bits).toBeGreaterThan(81);
		expect(modelKeyspace(getModel('kriegsmarine-m4')).rotorOrders).toBe(672n);
	});
});

describe('custom models', () => {
	it('generates a deterministic machine from a seed', () => {
		const a = customModel({ rotorCount: 5, seed: 7 });
		const b = customModel({ rotorCount: 5, seed: 7 });
		expect(a.rotors.map((rotor) => rotor.wiring)).toEqual(b.rotors.map((rotor) => rotor.wiring));
		expect(a.rotors).toHaveLength(5);
		expect(a.parts.rotorSlots).toBe(5);
	});

	it('obeys the real constraints', () => {
		const model = customModel({ rotorCount: 3, seed: 3 });
		for (const rotor of model.rotors) {
			expect(new Set(rotor.wiring).size).toBe(26);
			expect(rotor.wiring.every((value, index) => value !== index)).toBe(true);
		}
		const reflector = model.reflectors[0];
		if (!reflector) throw new Error('no reflector');
		for (let index = 0; index < 26; index += 1) {
			expect(reflector.wiring[reflector.wiring[index] as number]).toBe(index);
		}
	});

	it('runs, and a hundred rotors still cipher', () => {
		const model = customModel({ rotorCount: 100, seed: 11 });
		const machine = new EnigmaMachine(modelToConfig(model, { rotorOrder: model.defaultRotorOrder }));
		expect(machine.encrypt('HELLO')).toHaveLength(5);
		expect(machine.rotorCount).toBe(100);
	});

	it('accepts a historical reflector', () => {
		expect(customModel({ rotorCount: 3, reflector: 'C' }).reflectors[0]?.id).toBe('C');
	});

	it('round-trips through a shareable string', () => {
		const model = customModel({ rotorCount: 7, seed: 5, notches: 'ZM', name: 'Workshop special' });
		const encoded = encodeModel(model);
		expect(encoded).toContain('c~7');
		const decoded = decodeModel(encoded ?? '');
		expect(decoded?.rotors).toHaveLength(7);
		expect(decoded?.rotors[0]?.notches).toEqual(model.rotors[0]?.notches);
		expect(decoded?.name).toBe('Workshop special');
	});

	it('encodes nothing for a historical model', () => {
		expect(encodeModel(getModel('enigma-1'))).toBeNull();
		expect(decodeModel('nonsense')).toBeNull();
	});
});
