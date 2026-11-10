import { mod } from './alphabet.js';
import { EnigmaConfigError } from './errors.js';
import type { RotorSpec, RotorState } from './types.js';
import { invertWiring } from './validate.js';

/**
 * A single rotor: the physical wiring core plus its movable index ring.
 *
 * Two coordinates matter:
 * - **position** is the symbol shown in the window,
 * - **ring** (Ringstellung) is how far the alphabet ring is rotated against the core.
 *
 * The wiring sees `position - ring`, which is why changing the ring setting
 * moves the notch *and* the wiring relative to the window.
 */
export class Rotor {
	readonly spec: RotorSpec;
	readonly size: number;
	readonly #inverse: readonly number[];
	#position: number;
	#ring: number;

	constructor(spec: RotorSpec, size: number, state: Partial<RotorState> = {}) {
		if (spec.wiring.length !== size) {
			throw new EnigmaConfigError(`rotor ${spec.id}: wiring length ${spec.wiring.length} != alphabet size ${size}`);
		}
		this.spec = spec;
		this.size = size;
		this.#inverse = invertWiring(spec.wiring);
		this.#position = mod(state.position ?? 0, size);
		this.#ring = mod(state.ring ?? 0, size);
	}

	get position(): number {
		return this.#position;
	}

	set position(value: number) {
		this.#position = mod(value, this.size);
	}

	get ring(): number {
		return this.#ring;
	}

	set ring(value: number) {
		this.#ring = mod(value, this.size);
	}

	/** Rotor coordinate the wiring actually sees. */
	get coreOffset(): number {
		return mod(this.#position - this.#ring, this.size);
	}

	/** Advances the rotor by one contact, the way the ratchet does. */
	advance(): void {
		this.#position = mod(this.#position + 1, this.size);
	}

	/** True when the rotor sits on one of its turnover notches. */
	atNotch(): boolean {
		return this.spec.notches.includes(this.coreOffset);
	}

	/** Right-to-left traversal: entry contact in, exit contact out. */
	forward(contact: number): number {
		const offset = this.coreOffset;
		const wired = this.spec.wiring[mod(contact + offset, this.size)] as number;
		return mod(wired - offset, this.size);
	}

	/** Left-to-right traversal on the way back from the reflector. */
	backward(contact: number): number {
		const offset = this.coreOffset;
		const wired = this.#inverse[mod(contact + offset, this.size)] as number;
		return mod(wired - offset, this.size);
	}

	snapshot(): RotorState {
		return { ring: this.#ring, position: this.#position };
	}
}
