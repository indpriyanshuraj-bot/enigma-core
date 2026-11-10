/**
 * Small, deterministic PRNG (mulberry32) so a "random key" can be reproduced
 * from a seed. This is not a cryptographic generator and is not used for secrecy.
 */
export interface Rng {
	/** Uniform float in `[0, 1)`. */
	next(): number;
	/** Uniform integer in `[0, maxExclusive)`. */
	int(maxExclusive: number): number;
	/** Fisher-Yates shuffle returning a new array. */
	shuffle<T>(items: readonly T[]): T[];
	/** One item at random. */
	pick<T>(items: readonly T[]): T;
}

/** Creates a seeded PRNG. Same seed, same sequence, on every platform. */
export function createRng(seed: number = Date.now()): Rng {
	let state = seed >>> 0;
	const next = (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive);
	const shuffle = <T>(items: readonly T[]): T[] => {
		const out = [...items];
		for (let i = out.length - 1; i > 0; i -= 1) {
			const j = int(i + 1);
			const a = out[i] as T;
			out[i] = out[j] as T;
			out[j] = a;
		}
		return out;
	};
	const pick = <T>(items: readonly T[]): T => items[int(items.length)] as T;
	return { next, int, shuffle, pick };
}
