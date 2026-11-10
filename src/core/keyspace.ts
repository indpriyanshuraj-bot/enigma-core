import { EnigmaConfigError } from './errors.js';
import type { MachinePreset } from './presets.js';
import { getPreset } from './presets.js';

/**
 * Keyspace maths.
 *
 * Counts are computed with `bigint` because a service Enigma key space is far
 * beyond `Number.MAX_SAFE_INTEGER` (2^53): Enigma I is roughly 2.8e24. Only the
 * derived entropy value is a `number`, and that is a logarithm, so it stays exact
 * to well under one part in a trillion.
 */
export interface KeyspaceInput {
	/** Size of the machine alphabet. Default 26. */
	readonly alphabetSize?: number;
	/** How many rotor types the operator could choose from. */
	readonly rotorPool: number;
	/** How many rotors are fitted. */
	readonly rotorCount: number;
	/** Plugboard cables. Default 10. */
	readonly cables?: number;
	/** Whether ring settings vary independently of window positions. Default true. */
	readonly includeRingSettings?: boolean;
	/** Whether the window start position is part of the key. Default true. */
	readonly includePositions?: boolean;
}

/** Every part of the count, so a UI can show where the numbers come from. */
export interface KeyspaceBreakdown {
	/** Ordered rotor choices: pool × (pool-1) × … */
	readonly rotorOrders: bigint;
	/** Alphabet size to the power of rotor count. */
	readonly ringSettings: bigint;
	/** Alphabet size to the power of rotor count. */
	readonly startPositions: bigint;
	/** Legal cable arrangements for the given cable count. */
	readonly plugboard: bigint;
	readonly total: bigint;
	/** log2 of the total: the key strength in bits. */
	readonly bits: number;
	/** Decimal string of the total, for exact display. */
	readonly decimal: string;
}

function factorial(n: number): bigint {
	let out = 1n;
	for (let i = 2n; i <= BigInt(n); i += 1n) out *= i;
	return out;
}

function pow(base: number, exponent: number): bigint {
	let out = 1n;
	const b = BigInt(base);
	for (let i = 0; i < exponent; i += 1) out *= b;
	return out;
}

/** Ordered selections without replacement: `pool! / (pool - used)!`. */
export function rotorOrderCount(pool: number, used: number): bigint {
	if (used > pool) return 0n;
	return factorial(pool) / factorial(pool - used);
}

/**
 * Number of ways to plug `cables` cables into `alphabetSize` contacts:
 * `n! / ((n - 2c)! · c! · 2^c)`, the standard 1-2-2-…-2 involution count.
 */
export function plugboardCount(alphabetSize: number, cables: number): bigint {
	if (cables < 0 || 2 * cables > alphabetSize) {
		throw new EnigmaConfigError(`cannot plug ${cables} cables into ${alphabetSize} contacts`, { alphabetSize, cables });
	}
	const numerator = factorial(alphabetSize);
	const denominator = factorial(alphabetSize - 2 * cables) * factorial(cables) * 2n ** BigInt(cables);
	return numerator / denominator;
}

/** Full breakdown for one machine shape. */
export function keyspace(input: KeyspaceInput): KeyspaceBreakdown {
	const alphabetSize = input.alphabetSize ?? 26;
	const cables = input.cables ?? 10;
	const rotorOrders = rotorOrderCount(input.rotorPool, input.rotorCount);
	const ringSettings = input.includeRingSettings === false ? 1n : pow(alphabetSize, input.rotorCount);
	const startPositions = input.includePositions === false ? 1n : pow(alphabetSize, input.rotorCount);
	const plugboard = plugboardCount(alphabetSize, cables);
	const total = rotorOrders * ringSettings * startPositions * plugboard;
	return {
		rotorOrders,
		ringSettings,
		startPositions,
		plugboard,
		total,
		bits: total > 0n ? Math.log2(Number(total)) : 0,
		decimal: total.toString(),
	};
}

/** Convenience wrapper: key space of a preset with an optional cable count. */
export function keyspaceForPreset(preset: MachinePreset | string, cables?: number): KeyspaceBreakdown {
	const resolved = typeof preset === 'string' ? getPreset(preset) : preset;
	return keyspace({
		rotorPool: resolved.rotorPool.length,
		rotorCount: resolved.defaultRotorOrder.length,
		cables: cables ?? resolved.defaultCables,
	});
}

/** Formats a big count the way a museum label would: `2.79 × 10^24`. */
export function formatKeyspace(value: bigint | KeyspaceBreakdown): string {
	const total = typeof value === 'bigint' ? value : value.total;
	if (total === 0n) return '0';
	const digits = total.toString();
	if (digits.length <= 12) return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	const exponent = digits.length - 1;
	const mantissa = `${digits.slice(0, 3)[0]}.${digits.slice(1, 3)}`;
	return `${mantissa} × 10^${exponent}`;
}
