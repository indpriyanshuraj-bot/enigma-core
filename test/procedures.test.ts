import { describe, expect, it } from 'vitest';
import {
	buildMachine,
	decodeIndicator,
	encodeIndicator,
	generateKey,
	groupText,
	PRESETS,
	randomReflector,
	randomWiring,
	receive,
	transmit,
	createRng,
} from '../src/index.js';

const daily = { rotorOrder: ['I', 'II', 'III'], rings: 'AAA', positions: 'MCK' };

describe('key-sheet procedures', () => {
	it('sends the message key twice, as the procedure required', () => {
		const machine = buildMachine({ ...daily });
		machine.setWindow('MCK');
		const indicator = encodeIndicator(machine, 'XYZ');
		expect(indicator).toHaveLength(6);
		expect(indicator.slice(0, 3)).not.toBe(indicator.slice(3, 6));
	});

	it('recovers the message key from the indicator', () => {
		const sender = buildMachine({ ...daily });
		const receiver = buildMachine({ ...daily });
		sender.setWindow('MCK');
		const indicator = encodeIndicator(sender, 'QWE');
		receiver.setWindow('MCK');
		expect(decodeIndicator(receiver, indicator)).toBe('QWE');
	});

	it('reports a mismatch when the daily key is wrong', () => {
		const sender = buildMachine({ ...daily });
		const wrong = buildMachine({ ...daily, rings: 'BBB' });
		sender.setWindow('MCK');
		wrong.setWindow('MCK');
		const indicator = encodeIndicator(sender, 'QWE');
		expect(decodeIndicator(wrong, indicator)).toBeNull();
	});

	it('transmits and receives a message end to end', () => {
		const sender = buildMachine({ ...daily });
		const receiver = buildMachine({ ...daily });
		const sent = transmit(sender, 'attack at dawn', daily, 'QWE');
		expect(sent.indicator).toHaveLength(6);
		expect(sent.body).not.toContain(' ');
		const got = receive(receiver, sent, daily);
		expect(got.messageKey).toBe('QWE');
		expect(got.plaintext).toBe('ATTACKATDAWN');
	});

	it('groups text in fives', () => {
		expect(groupText('attackatdawn')).toBe('ATTAC KATDA WN');
	});
});

describe('key generation', () => {
	it('is deterministic for a seed', () => {
		expect(generateKey('enigma-1', { seed: 12 })).toEqual(generateKey('enigma-1', { seed: 12 }));
		expect(generateKey('enigma-1', { seed: 12 })).not.toEqual(generateKey('enigma-1', { seed: 13 }));
	});

	it('produces a usable key for every preset', () => {
		for (const id of Object.keys(PRESETS)) {
			const key = generateKey(id, { seed: 5 });
			const machine = buildMachine({ preset: id, rotorOrder: key.rotorOrder, rings: key.rings, positions: key.positions, plugboard: key.plugboard });
			expect(machine.encrypt('AAAAA')).toHaveLength(5);
		}
	});

	it('puts a thin rotor in the M4 slot', () => {
		const key = generateKey('kriegsmarine-m4', { seed: 3 });
		expect(['Beta', 'Gamma']).toContain(key.rotorOrder[0]);
		expect(key.rotorOrder).toHaveLength(4);
	});

	it('respects the cable count and the avoid list', () => {
		const key = generateKey('enigma-1', { seed: 9, cables: 3, avoid: ['A', 'B'] });
		expect(key.plugboard).toHaveLength(3);
		const used = new Set(key.plugboard.flat());
		expect(used.has('A')).toBe(false);
		expect(used.has('B')).toBe(false);
	});
});

describe('custom wiring', () => {
	it('generates a derangement', () => {
		const wiring = randomWiring(26, createRng(4));
		expect(wiring).toHaveLength(26);
		expect(new Set(wiring).size).toBe(26);
		expect(wiring.every((value, index) => value !== index)).toBe(true);
	});

	it('generates an involution without fixed points', () => {
		const wiring = randomReflector(26, createRng(4));
		for (let index = 0; index < 26; index += 1) {
			expect(wiring[wiring[index] as number]).toBe(index);
			expect(wiring[index]).not.toBe(index);
		}
	});

	it('refuses an odd alphabet for a reflector', () => {
		expect(() => randomReflector(25)).toThrow();
		expect(() => randomWiring(1)).toThrow();
	});
});
