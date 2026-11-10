/**
 * Rendering is deliberately unopinionated: this library ships **no** preset
 * colours, sizes or arrangements. Every visual decision is a required input, so
 * a consumer cannot accidentally inherit a look it did not ask for.
 */
export interface RenderTheme {
	/** Canvas background. `'transparent'` is allowed. */
	readonly background: string;
	/** Outline colour for bodies and cables. */
	readonly stroke: string;
	/** Fill of a rotor body. */
	readonly rotorBody: string;
	/** Fill of the index ring, where the window letter is printed. */
	readonly rotorRing: string;
	/** Colour of the letter in the window. */
	readonly rotorLetter: string;
	/** Fill of a rotor that sits on its turnover notch. */
	readonly rotorAtNotch: string;
	/** Fill of the machine box. */
	readonly caseBody: string;
	/** Colour of the wiring traces drawn between contacts. */
	readonly wiring: string;
	/** Font family for all text. */
	readonly fontFamily: string;
	/** Base font size in user units. */
	readonly fontSize: number;
}
