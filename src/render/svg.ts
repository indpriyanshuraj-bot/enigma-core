import { circlePath } from './geometry.js';
import type { MachineScene } from './scene.js';
import type { RenderTheme } from './theme.js';

/** Options for the SVG painter. Nothing here has a default. */
export interface SvgPaintOptions {
	readonly theme: RenderTheme;
	/** Draw the case outline. */
	readonly showCase: boolean;
	/** Draw the small rotor id / ring caption under each window. */
	readonly showCaption: boolean;
	/** Draw the notch marker. */
	readonly showNotch: boolean;
	/** `role="img"` label for assistive technology. */
	readonly title?: string | undefined;
	/** Extra classes, so a consumer can style the output with its own CSS. */
	readonly className?: string | undefined;
}

/**
 * Paints a {@link MachineScene} as an SVG string.
 *
 * String output keeps the painter usable in Node — snapshot tests, server-side
 * rendering, static exports — and in the browser, where the string can be handed
 * to `innerHTML` or parsed once with `DOMParser`. It writes no colours of its
 * own: every fill and stroke comes from the theme the caller passes in.
 */
export function renderMachineSvg(scene: MachineScene, options: SvgPaintOptions): string {
	const { theme } = options;
	const viewBox = `${round(scene.bounds.minX)} ${round(scene.bounds.minY)} ${round(
		Math.max(scene.bounds.maxX - scene.bounds.minX, 1),
	)} ${round(Math.max(scene.bounds.maxY - scene.bounds.minY, 1))}`;
	const out: string[] = [];
	const root = options.className ? ` class="${escapeAttribute(options.className)}"` : '';
	const a11y = options.title
		? ` role="img" aria-label="${escapeAttribute(options.title)}"`
		: ' aria-hidden="true" focusable="false"';

	out.push(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${scene.viewport.width}" height="${scene.viewport.height}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet"${root}${a11y}>`,
	);

	if (options.showCase) {
		out.push(
			`<rect class="case" x="${round(scene.case.x)}" y="${round(scene.case.y)}" width="${round(scene.case.width)}" height="${round(
				scene.case.height,
			)}" rx="${round(scene.case.radius)}" fill="${theme.caseBody}" stroke="${theme.stroke}" stroke-width="1.5"/>`,
			`<text class="reflector-label" x="${round(scene.case.x + 10)}" y="${round(scene.case.y + 18)}" fill="${theme.stroke}" font-family="${escapeAttribute(
				theme.fontFamily,
			)}" font-size="${round(theme.fontSize * 0.85)}">${escapeText(scene.reflector.label)}</text>`,
		);
	}

	// Reflector: a small disc at the far end of the stack.
	out.push(
		`<circle class="reflector" cx="${round(scene.reflector.center.x)}" cy="${round(
			scene.reflector.center.y,
		)}" r="${round(scene.reflector.radius)}" fill="${theme.rotorRing}" stroke="${theme.stroke}" stroke-width="1.5"/>`,
	);

	// Back to front: the last rotor in the array is the one nearest the viewer.
	for (let index = scene.rotors.length - 1; index >= 0; index -= 1) {
		const rotor = scene.rotors[index];
		if (!rotor) continue;
		const fill = rotor.atNotch ? theme.rotorAtNotch : theme.rotorBody;
		out.push(
			`<g class="rotor" data-rotor="${escapeAttribute(rotor.id)}" data-index="${rotor.index}">`,
			`<circle class="rotor-body" cx="${round(rotor.center.x)}" cy="${round(rotor.center.y)}" r="${round(
				rotor.slot.radius,
			)}" fill="${fill}" stroke="${theme.stroke}" stroke-width="1.5"/>`,
			`<circle class="rotor-ring" cx="${round(rotor.center.x)}" cy="${round(rotor.center.y)}" r="${round(
				rotor.slot.radius * 0.62,
			)}" fill="${theme.rotorRing}" stroke="${theme.wiring}" stroke-width="1"/>`,
			`<text class="rotor-window" x="${round(rotor.center.x)}" y="${round(rotor.center.y)}" fill="${theme.rotorLetter}" font-family="${escapeAttribute(
				theme.fontFamily,
			)}" font-size="${round(theme.fontSize * 1.7)}" text-anchor="middle" dominant-baseline="middle">${escapeText(
				rotor.window,
			)}</text>`,
		);
		if (options.showNotch) {
			out.push(
				`<circle class="rotor-notch" cx="${round(rotor.notch.x)}" cy="${round(rotor.notch.y)}" r="${round(
					theme.fontSize * 0.2,
				)}" fill="${theme.rotorLetter}"/>`,
			);
		}
		if (options.showCaption) {
			out.push(
				`<text class="rotor-caption" x="${round(rotor.caption.x)}" y="${round(rotor.caption.y)}" fill="${theme.rotorLetter}" font-family="${escapeAttribute(
					theme.fontFamily,
				)}" font-size="${round(theme.fontSize * 0.6)}" text-anchor="middle" dominant-baseline="middle">${escapeText(
					`${rotor.id}·${rotor.ring}`,
				)}</text>`,
			);
		}
		out.push('</g>');
	}

	out.push('</svg>');
	return out.join('');
}

/** Paints just the rotor faces, for consumers that draw their own case. */
export function renderRotorFacesSvg(scene: MachineScene, options: SvgPaintOptions): string {
	return renderMachineSvg(scene, { ...options, showCase: false, title: options.title ?? undefined });
}

/** Circular path for one rotor, useful for custom hit regions. */
export function rotorPath(scene: MachineScene, index: number): string | null {
	const rotor = scene.rotors.find((candidate) => candidate.index === index);
	if (!rotor) return null;
	return circlePath(rotor.slot.center, rotor.slot.radius, scene.camera);
}

function round(value: number): number {
	return Math.round(value * 100) / 100;
}

function escapeText(value: string): string {
	return value.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] ?? char);
}

function escapeAttribute(value: string): string {
	return escapeText(value).replace(/"/g, '&quot;');
}
