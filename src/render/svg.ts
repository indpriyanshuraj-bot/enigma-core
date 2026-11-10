import type { Camera } from './geometry.js';
import { circlePath, layoutRotors, project, round } from './geometry.js';
import type { RenderTheme } from './theme.js';

/** One rotor as the renderer sees it: display data only, no crypto. */
export interface RotorView {
	/** Stable key, e.g. `"III"`. */
	readonly id: string;
	/** Symbol shown in the window. */
	readonly letter: string;
	/** Symbol of the ring setting. */
	readonly ringLetter: string;
	/** True when the rotor sits on a turnover notch. */
	readonly atNotch: boolean;
}

/** Everything the SVG renderer needs. */
export interface Scene {
	readonly rotors: readonly RotorView[];
	readonly reflectorLabel: string;
}

/** Full control over the output; nothing here has a default. */
export interface SvgOptions {
	readonly width: number;
	readonly height: number;
	readonly theme: RenderTheme;
	readonly camera: Camera;
	readonly radius: number;
	readonly thickness: number;
	readonly gap: number;
	readonly arrangement?: 'stack' | 'row' | undefined;
	/** Accessible label; the SVG is `role="img"` when this is set. */
	readonly title?: string | undefined;
}

/**
 * Renders a scene to an SVG string.
 *
 * Text-only output keeps the renderer usable in Node (snapshot tests, SSR) and
 * in the browser (assign to `innerHTML` or parse with `DOMParser`).
 */
export function renderSceneToSvg(scene: Scene, options: SvgOptions): string {
	const { theme, camera, radius, thickness, gap, arrangement } = options;
	const slots = layoutRotors({ rotorCount: scene.rotors.length, radius, thickness, gap, arrangement });
	const parts: string[] = [];
	parts.push(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}"${options.title ? ` role="img" aria-label="${escapeAttribute(options.title)}"` : ' aria-hidden="true"'}>`,
	);
	parts.push(`<rect width="100%" height="100%" fill="${theme.background}"/>`);
	parts.push(`<g stroke="${theme.stroke}" stroke-width="1" fill="none">`);
	for (const slot of slots) {
		const rotor = scene.rotors[slot.index];
		if (!rotor) continue;
		const fill = rotor.atNotch ? theme.rotorAtNotch : theme.rotorBody;
		parts.push(`<path d="${circlePath(slot.center, slot.radius, camera)}" fill="${fill}"/>`);
		parts.push(`<path d="${circlePath(slot.center, slot.radius * 0.55, camera)}" fill="${theme.rotorRing}"/>`);
		const label = project({ x: slot.center.x, y: slot.center.y, z: slot.center.z }, camera);
		parts.push(
			`<text x="${round(label.x)}" y="${round(label.y)}" fill="${theme.rotorLetter}" font-family="${escapeAttribute(theme.fontFamily)}" font-size="${theme.fontSize}" text-anchor="middle" dominant-baseline="middle">${escapeText(rotor.letter)}</text>`,
		);
		parts.push(
			`<text x="${round(label.x)}" y="${round(label.y + theme.fontSize * 1.6)}" fill="${theme.rotorLetter}" font-family="${escapeAttribute(theme.fontFamily)}" font-size="${round(theme.fontSize * 0.6)}" text-anchor="middle" dominant-baseline="middle">${escapeText(rotor.ringLetter)}</text>`,
		);
	}
	parts.push('</g>');
	parts.push('</svg>');
	return parts.join('');
}

function escapeText(value: string): string {
	return value.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] ?? char);
}

function escapeAttribute(value: string): string {
	return escapeText(value).replace(/"/g, '&quot;');
}
