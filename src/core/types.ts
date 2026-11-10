/**
 * Shared type surface for the headless Enigma core.
 *
 * Everything here is plain data: no classes, no DOM, no I/O. A `MachineConfig`
 * is fully serialisable, so a simulation can be stored, diffed and replayed.
 */

/** A wiring table: `wiring[i]` is the contact that `i` is wired to. */
export type Wiring = readonly number[];

/** One rotor: wiring, turnover notch positions and a stable id. */
export interface RotorSpec {
	/** Stable identifier, e.g. `"I"` or `"Beta"`. */
	readonly id: string;
	/** Human readable name used by UIs. */
	readonly name: string;
	/** Permutation of `0..n-1` seen from the right-hand (entry) side. */
	readonly wiring: Wiring;
	/**
	 * Zero-based positions (in ring coordinates) at which this rotor triggers
	 * the next rotor to its left. Rotor I has a single notch at `Q` (16).
	 */
	readonly notches: readonly number[];
}

/** A reflector (Umkehrwalze). Its wiring must be an involution with no fixed points. */
export interface ReflectorSpec {
	readonly id: string;
	readonly name: string;
	readonly wiring: Wiring;
}

/** A plugboard cable, given as two symbols of the machine alphabet. */
export type PlugPair = readonly [string, string];

/** Mutable per-rotor state, kept separate from the immutable spec. */
export interface RotorState {
	/** Ringstellung, zero-based. Rotates the wiring relative to the window. */
	ring: number;
	/** Current window position, zero-based. */
	position: number;
}

/** A complete, serialisable machine description. */
export interface MachineConfig {
	/** Alphabet used by the machine. Defaults to `A..Z`. */
	readonly alphabet?: string | undefined;
	/**
	 * Rotors ordered **left to right**, exactly as a key sheet writes them
	 * (`I II III`). Index 0 is the leftmost, slowest rotor; the last rotor steps
	 * on every key press.
	 */
	readonly rotors: readonly RotorSpec[];
	readonly reflector: ReflectorSpec;
	/** Ring settings, left to right. Defaults to all zero (letter `A`). */
	readonly rings?: readonly number[] | undefined;
	/** Starting window positions, left to right. Defaults to all zero (letter `A`). */
	readonly positions?: readonly number[] | undefined;
	/** Plugboard cables. Defaults to an empty board. */
	readonly plugboard?: readonly PlugPair[] | undefined;
}

/** Snapshot of a machine at one instant, safe to serialise. */
export interface MachineState {
	readonly alphabet: string;
	readonly positions: readonly number[];
	readonly rings: readonly number[];
	readonly plugboard: readonly PlugPair[];
}

/** Result of one key press. */
export interface KeyPress {
	/** Symbol fed in by the operator. */
	readonly input: string;
	/** Symbol lit on the lampboard. */
	readonly output: string;
	/** Rotor positions *after* stepping. */
	readonly positions: readonly number[];
}
