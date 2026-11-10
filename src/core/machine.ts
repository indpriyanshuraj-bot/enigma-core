import { indexToSymbol, mod, normaliseAlphabet, symbolToIndex } from './alphabet.js';
import { EnigmaConfigError, EnigmaSymbolError } from './errors.js';
import { Plugboard } from './plugboard.js';
import { Rotor } from './rotor.js';
import type { KeyPress, MachineConfig, MachineState, PlugPair, ReflectorSpec, RotorSpec } from './types.js';
import { assertReflectorSpec, assertRotorSpec } from './validate.js';

/** Options for {@link EnigmaMachine.encrypt}. */
export interface EncryptOptions {
	/** Pass non-alphabet characters through untouched instead of throwing. Default `true`. */
	readonly preserveUnknown?: boolean | undefined;
}

/**
 * A complete Enigma machine.
 *
 * Deterministic and DOM-free: given the same config and input it always yields
 * the same output, which is what makes it usable headless (Node, workers, tests,
 * a WebGPU renderer, a CLI, a lambda).
 */
export class EnigmaMachine {
	readonly alphabet: string;
	/** Rotors ordered left (slow) to right (fast), the way a key sheet lists them. */
	readonly rotors: readonly Rotor[];
	readonly reflector: ReflectorSpec;
	readonly plugboard: Plugboard;
	readonly #reflectorMap: readonly number[];

	constructor(config: MachineConfig) {
		const alphabet = normaliseAlphabet(config.alphabet);
		const size = alphabet.length;
		if (config.rotors.length === 0) {
			throw new EnigmaConfigError('a machine needs at least one rotor');
		}
		const rings = config.rings ?? [];
		const positions = config.positions ?? [];
		if (rings.length > config.rotors.length) {
			throw new EnigmaConfigError('more ring settings than rotors', { rings: rings.length, rotors: config.rotors.length });
		}
		if (positions.length > config.rotors.length) {
			throw new EnigmaConfigError('more starting positions than rotors', {
				positions: positions.length,
				rotors: config.rotors.length,
			});
		}

		assertReflectorSpec(config.reflector, size);
		this.alphabet = alphabet;
		this.reflector = config.reflector;
		this.#reflectorMap = config.reflector.wiring;

		this.rotors = config.rotors.map((spec: RotorSpec, index) => {
			assertRotorSpec(spec, size);
			return new Rotor(spec, size, { ring: rings[index] ?? 0, position: positions[index] ?? 0 });
		});
		this.plugboard = new Plugboard(config.plugboard ?? [], alphabet);
	}

	/** Number of rotors fitted. */
	get rotorCount(): number {
		return this.rotors.length;
	}

	/** Symbols currently showing in the windows, left to right. */
	get window(): string {
		return this.rotors.map((rotor) => indexToSymbol(this.alphabet, rotor.position)).join('');
	}

	/** Ring settings, left to right. */
	get rings(): number[] {
		return this.rotors.map((rotor) => rotor.ring);
	}

	/** Window positions, left to right. */
	get positions(): number[] {
		return this.rotors.map((rotor) => rotor.position);
	}

	/** Serialisable snapshot of the mutable part of the machine. */
	get state(): MachineState {
		return {
			alphabet: this.alphabet,
			positions: this.positions,
			rings: this.rings,
			plugboard: this.plugboard.pairs,
		};
	}

	/** Sets window positions from indices, left to right. */
	setPositions(positions: readonly number[]): this {
		this.#eachRotor(positions, (rotor, value) => {
			rotor.position = value;
		}, 'positions');
		return this;
	}

	/** Sets window positions from a string of window letters, left to right. */
	setWindow(letters: string): this {
		const indices = [...letters].map((letter) => {
			const index = symbolToIndex(this.alphabet, letter);
			if (index === -1) throw new EnigmaSymbolError(`"${letter}" is not part of the machine alphabet`);
			return index;
		});
		return this.setPositions(indices);
	}

	/** Sets ring settings from indices, left to right. */
	setRings(rings: readonly number[]): this {
		this.#eachRotor(rings, (rotor, value) => {
			rotor.ring = value;
		}, 'rings');
		return this;
	}

	/** Sets ring settings from letters, left to right. */
	setRingLetters(letters: string): this {
		const indices = [...letters].map((letter) => {
			const index = symbolToIndex(this.alphabet, letter);
			if (index === -1) throw new EnigmaSymbolError(`"${letter}" is not part of the machine alphabet`);
			return index;
		});
		return this.setRings(indices);
	}

	/**
	 * Steps the rotors exactly as the pawl-and-ratchet mechanism does, including
	 * the double step that falls out of checking the middle rotor *before* the
	 * right-hand rotor turns.
	 */
	stepRotors(): void {
		const last = this.rotors.length - 1;
		const right = this.rotors[last];
		const middle = this.rotors[last - 1];
		const left = this.rotors[last - 2];
		// The middle rotor steps when the right-hand rotor reaches its notch *and*
		// again when it reaches its own notch: the double step that no operator
		// wanted and every simulator has to reproduce.
		if (middle?.atNotch()) {
			middle.advance();
			left?.advance();
		} else if (right?.atNotch()) {
			middle?.advance();
		}
		right?.advance();
	}

	/** Presses one key: step first, then encrypt, then return the lamp letter. */
	press(symbol: string): KeyPress {
		const index = symbolToIndex(this.alphabet, symbol);
		if (index === -1) {
			throw new EnigmaSymbolError(`"${symbol}" is not part of the machine alphabet`);
		}
		this.stepRotors();
		return {
			input: symbol,
			output: indexToSymbol(this.alphabet, this.#encodeIndex(index)),
			positions: this.positions,
		};
	}

	/** Encrypts one symbol without allocating a result object. */
	encryptSymbol(symbol: string): string {
		const index = symbolToIndex(this.alphabet, symbol);
		if (index === -1) {
			throw new EnigmaSymbolError(`"${symbol}" is not part of the machine alphabet`);
		}
		this.stepRotors();
		return indexToSymbol(this.alphabet, this.#encodeIndex(index));
	}

	/** Encrypts a whole message, advancing the machine as it goes. */
	encrypt(text: string, options: EncryptOptions = {}): string {
		const preserveUnknown = options.preserveUnknown ?? true;
		let out = '';
		for (const symbol of text) {
			const index = symbolToIndex(this.alphabet, symbol);
			if (index === -1) {
				if (preserveUnknown) {
					out += symbol;
					continue;
				}
				throw new EnigmaSymbolError(`"${symbol}" is not part of the machine alphabet`);
			}
			this.stepRotors();
			out += indexToSymbol(this.alphabet, this.#encodeIndex(index));
		}
		return out;
	}

	/** The electrical path for one contact, after the rotors have been stepped. */
	#encodeIndex(contact: number): number {
		let signal = this.plugboard.swap(contact);
		// Right to left, through every rotor.
		for (let index = this.rotors.length - 1; index >= 0; index -= 1) {
			signal = (this.rotors[index] as Rotor).forward(signal);
		}
		signal = this.#reflectorMap[mod(signal, this.alphabet.length)] as number;
		// Left to right, back from the reflector.
		for (const rotor of this.rotors) signal = rotor.backward(signal);
		return this.plugboard.swap(signal);
	}

	#eachRotor(values: readonly number[], apply: (rotor: Rotor, value: number) => void, label: string): void {
		if (values.length > this.rotors.length) {
			throw new EnigmaConfigError(`more ${label} than rotors`, { [label]: values.length, rotors: this.rotors.length });
		}
		values.forEach((value, index) => {
			apply(this.rotors[index] as Rotor, value);
		});
	}
}

/** Convenience factory. */
export function createMachine(config: MachineConfig): EnigmaMachine {
	return new EnigmaMachine(config);
}
