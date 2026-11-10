import { describe, expect, it } from 'vitest';
import { buildMachine } from '../src/index.js';
import { layoutRotors, project, renderSceneToSvg, type RenderTheme } from '../src/render/index.js';

const theme: RenderTheme = {
	background: '#000',
	stroke: '#111',
	rotorBody: '#222',
	rotorRing: '#333',
	rotorLetter: '#fff',
	rotorAtNotch: '#444',
	caseBody: '#555',
	wiring: '#666',
	fontFamily: 'system-ui',
	fontSize: 12,
};

describe('render helpers', () => {
	it('projects points deterministically', () => {
		const camera = { yaw: 0, pitch: 0, zoom: 1, origin: { x: 0, y: 0 } };
		expect(project({ x: 10, y: 0, z: 0 }, camera)).toEqual({ x: 10, y: 0 });
	});

	it('lays out a rotor stack centred on the origin', () => {
		const slots = layoutRotors({ rotorCount: 3, radius: 10, thickness: 4, gap: 2 });
		expect(slots).toHaveLength(3);
		expect(slots[1]?.center.z).toBe(0);
	});

	it('renders an SVG without NaN and without a built-in theme', () => {
		const machine = buildMachine({ positions: 'ABC' });
		const svg = renderSceneToSvg(
			{ rotors: machine.rotors.map((rotor) => ({ id: rotor.spec.id, letter: 'A', ringLetter: 'A', atNotch: rotor.atNotch() })), reflectorLabel: 'UKW-B' },
			{
				width: 320,
				height: 240,
				theme,
				camera: { yaw: 0.4, pitch: 0.9, zoom: 3, origin: { x: 160, y: 120 } },
				radius: 24,
				thickness: 8,
				gap: 4,
			},
		);
		expect(svg.startsWith('<svg')).toBe(true);
		expect(svg).not.toContain('NaN');
		expect(svg.match(/<text/g)).toHaveLength(6);
	});
});
