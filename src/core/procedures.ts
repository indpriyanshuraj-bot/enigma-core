import { EnigmaMachine } from './machine.js';
import type { PlugPair } from './types.js';

/**
 * Operating procedures, as the operators actually performed them.
 *
 * The Enigma was not broken because the arithmetic was weak. It was broken
 * because a message key had to be transmitted, and the way it was transmitted
 * leaked: the same three letters, twice, encrypted with the same start position,
 * six letters apart. Modelling that procedure is what makes a simulation
 * honest — and it is what makes an attack on a simulated message possible.
 */
export interface DailyKey {
	/** Rotor order, left to right, e.g. `['I', 'II', 'III']`. */
	readonly rotorOrder: readonly string[];
	/** Ring settings, left to right, e.g. `'AAA'`. */
	readonly rings: string;
	/** Grundstellung: the start position for the indicator, left to right. */
	readonly positions: string;
	readonly plugboard?: readonly PlugPair[];
}

/** A transmitted message: the six-letter indicator, then the body. */
export interface TransmittedMessage {
	/** The indicator as sent: the message key, encrypted twice. */
	readonly indicator: string;
	readonly body: string;
	/** Message key the operator chose, kept for tests and for teaching. */
	readonly messageKey: string;
}

export interface ProcedureOptions {
	/** Reset the machine to the daily key before sending. Default true. */
	readonly reset?: boolean;
}

/** Encrypts the three-letter message key twice, the way the procedure required. */
export function encodeIndicator(machine: EnigmaMachine, messageKey: string): string {
	const key = messageKey.toUpperCase().slice(0, 3);
	if (key.length !== 3) throw new Error('a message key is three letters');
	return machine.encrypt(key) + machine.encrypt(key);
}

/**
 * Recovers a message key from an indicator.
 *
 * Returns `null` when the two halves do not agree, which is exactly the check an
 * operator — or a cryptanalyst — would make. A single disagreement is evidence
 * that the daily key is wrong.
 */
export function decodeIndicator(machine: EnigmaMachine, indicator: string): string | null {
	const text = indicator.toUpperCase().replace(/[^A-Z]/g, '');
	if (text.length !== 6) return null;
	const first = machine.encrypt(text.slice(0, 3));
	const second = machine.encrypt(text.slice(3));
	return first === second ? first : null;
}

/** Sends a message the way the service did: indicator first, then the body. */
export function transmit(
	machine: EnigmaMachine,
	plaintext: string,
	daily: DailyKey,
	messageKey: string,
	options: ProcedureOptions = {},
): TransmittedMessage {
	const key = messageKey.toUpperCase().slice(0, 3);
	if (options.reset !== false) machine.setWindow(daily.positions);
	const indicator = encodeIndicator(machine, key);
	machine.setWindow(key);
	const body = machine.encrypt(plaintext.toUpperCase().replace(/[^A-Z]/g, ''));
	return { indicator, body, messageKey: key };
}

/** Receives a message: recover the key from the indicator, then read the body. */
export function receive(
	machine: EnigmaMachine,
	transmitted: Pick<TransmittedMessage, 'indicator' | 'body'>,
	daily: DailyKey,
): { messageKey: string | null; plaintext: string } {
	machine.setWindow(daily.positions);
	const messageKey = decodeIndicator(machine, transmitted.indicator);
	if (!messageKey) return { messageKey: null, plaintext: '' };
	machine.setWindow(messageKey);
	return { messageKey, plaintext: machine.encrypt(transmitted.body) };
}

/** Groups text in fives, the way a German signal was written out. */
export function groupText(text: string, size = 5): string {
	const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
	const groups: string[] = [];
	for (let index = 0; index < clean.length; index += size) {
		groups.push(clean.slice(index, index + size));
	}
	return groups.join(' ');
}
