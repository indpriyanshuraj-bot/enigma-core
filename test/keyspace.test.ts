import { describe, expect, it } from 'vitest';
import { formatKeyspace, keyspace, keyspaceForPreset, plugboardCount, rotorOrderCount } from '../src/index.js';

describe('keyspace', () => {
	it('counts the ordered rotor choices', () => {
		expect(rotorOrderCount(5, 3)).toBe(60n);
		expect(rotorOrderCount(8, 3)).toBe(336n);
	});

	it('counts plugboard arrangements with the involution formula', () => {
		expect(plugboardCount(26, 0)).toBe(1n);
		expect(plugboardCount(26, 1)).toBe(325n);
		expect(plugboardCount(26, 10)).toBe(150_738_274_937_250n);
	});

	it('rejects an impossible cable count', () => {
		expect(() => plugboardCount(26, 14)).toThrow();
	});

	it('gives the textbook Enigma I key space', () => {
		const breakdown = keyspaceForPreset('enigma-1');
		// 60 rotor orders × 26^3 rings × 26^3 positions × 150,738,274,937,250 pluggings
		expect(breakdown.total).toBe(60n * 17576n * 17576n * 150_738_274_937_250n);
		expect(breakdown.total.toString()).toBe('2793925870508516103360000');
		expect(breakdown.bits).toBeGreaterThan(81);
		expect(breakdown.bits).toBeLessThan(82);
	});

	it('scales with a custom machine', () => {
		const big = keyspace({ rotorPool: 100, rotorCount: 100, cables: 0, alphabetSize: 26 });
		expect(big.bits).toBeGreaterThan(keyspaceForPreset('enigma-1').bits);
	});

	it('formats large counts for display', () => {
		expect(formatKeyspace(1234567n)).toBe('1,234,567');
		expect(formatKeyspace(keyspaceForPreset('enigma-1'))).toMatch(/× 10\^24$/);
	});
});
