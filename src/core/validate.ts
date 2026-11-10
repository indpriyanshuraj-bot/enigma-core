import { EnigmaConfigError } from './errors.js';
import type { ReflectorSpec, RotorSpec, Wiring } from './types.js';

/** Throws unless `wiring` is a permutation of `0..size-1`. */
export function assertPermutation(wiring: Wiring, size: number, label: string): void {
	if (wiring.length !== size) {
		throw new EnigmaConfigError(`${label}: wiring length ${wiring.length} does not match alphabet size ${size}`, {
			label,
			length: wiring.length,
			size,
		});
	}
	const seen = new Uint8Array(size);
	for (const contact of wiring) {
		if (!Number.isInteger(contact) || contact < 0 || contact >= size) {
			throw new EnigmaConfigError(`${label}: contact ${contact} is out of range 0..${size - 1}`, { label, contact });
		}
		if (seen[contact] === 1) {
			throw new EnigmaConfigError(`${label}: contact ${contact} is wired twice, so this is not a permutation`, {
				label,
				contact,
			});
		}
		seen[contact] = 1;
	}
}

/** Throws unless `wiring` is an involution without fixed points, as a reflector must be. */
export function assertInvolution(wiring: Wiring, size: number, label: string): void {
	assertPermutation(wiring, size, label);
	for (let contact = 0; contact < size; contact += 1) {
		const target = wiring[contact] as number;
		if (target === contact) {
			throw new EnigmaConfigError(`${label}: contact ${contact} reflects onto itself`, { label, contact });
		}
		if (wiring[target] !== contact) {
			throw new EnigmaConfigError(`${label}: contact ${contact} reflects to ${target}, which reflects elsewhere`, {
				label,
				contact,
				target,
			});
		}
	}
}

/** Builds the inverse of a permutation wiring table. */
export function invertWiring(wiring: Wiring): number[] {
	const inverse = new Array<number>(wiring.length).fill(-1);
	wiring.forEach((target, contact) => {
		inverse[target] = contact;
	});
	return inverse;
}

/** Converts a letter wiring such as `"EKMFLGDQVZNTOWYHXUSPAIBRCJ"` into contact indices. */
export function wiringFromLetters(letters: string, alphabet: string): number[] {
	return [...letters].map((letter) => {
		const index = alphabet.indexOf(letter);
		if (index === -1) {
			throw new EnigmaConfigError(`wiring letter "${letter}" is not part of the machine alphabet`, { letters });
		}
		return index;
	});
}

/** Validates a rotor spec against a machine alphabet size. */
export function assertRotorSpec(spec: RotorSpec, size: number): void {
	assertPermutation(spec.wiring, size, `rotor ${spec.id}`);
	if (spec.notches.length === 0) {
		throw new EnigmaConfigError(`rotor ${spec.id}: needs at least one turnover notch`, { id: spec.id });
	}
	for (const notch of spec.notches) {
		if (!Number.isInteger(notch) || notch < 0 || notch >= size) {
			throw new EnigmaConfigError(`rotor ${spec.id}: notch ${notch} is out of range 0..${size - 1}`, {
				id: spec.id,
				notch,
			});
		}
	}
}

/** Validates a reflector spec against a machine alphabet size. */
export function assertReflectorSpec(spec: ReflectorSpec, size: number): void {
	assertInvolution(spec.wiring, size, `reflector ${spec.id}`);
}
