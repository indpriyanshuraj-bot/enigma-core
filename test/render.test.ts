import { describe, expect, it } from 'vitest';
import { buildMachine } from '../src/index.js';
import {
	buildMachineScene,
	hitTestScene,
	layoutRotors,
	project,
	renderMachineSvg,
	renderRotorFacesSvg,
	rotorPath,
	withCamera,
	type MachineGeometry,
	type RenderTheme,
} from '../src/render/index.js';

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

const geometry: MachineGeometry = { radius: 40, thickness: 22, gap: 6, casePadding: 18, reflectorGap: 24 };
/** Small discs far apart: a top-down stack overlaps on screen, which makes hit tests ambiguous. */
const sparse: MachineGeometry = { radius: 10, thickness: 8, gap: 20, casePadding: 12, reflectorGap: 24 };
const camera = { yaw: 0.34, pitch: 1.02, zoom: 1, origin: { x: 180, y: 130 } };
const viewport = { width: 360, height: 260 };

const ORDERS = ['I', 'II', 'III', 'IV'];

function scene(rotors = 3, geom: MachineGeometry = geometry) {
	const machine = buildMachine({ positions: 'A'.repeat(rotors), rotorOrder: ORDERS.slice(0, rotors) });
	return buildMachineScene(
		{
			rotors: machine.rotors.map((rotor) => ({
				id: rotor.spec.id,
				window: 'A',
				ring: 'A',
				atNotch: rotor.atNotch(),
			})),
			reflectorLabel: machine.reflector.name,
		},
		{ geometry: geom, camera, viewport },
	);
}

describe('geometry', () => {
	it('projects points deterministically', () => {
		expect(project({ x: 10, y: 0, z: 0 }, { yaw: 0, pitch: 0, zoom: 1, origin: { x: 0, y: 0 } })).toEqual({ x: 10, y: 0 });
	});

	it('lays out a rotor stack centred on the origin', () => {
		const slots = layoutRotors({ rotorCount: 3, radius: 10, thickness: 4, gap: 2 });
		expect(slots).toHaveLength(3);
		expect(slots[1]?.center.z).toBe(0);
	});
});

describe('scene', () => {
	it('places every rotor and the reflector', () => {
		const built = scene(3);
		expect(built.rotors).toHaveLength(3);
		expect(built.rotors[0]?.id).toBe('I');
		expect(built.reflector.label).toBe('UKW-B');
		expect(built.case.width).toBeGreaterThan(0);
	});

	it('keeps the case around the stack', () => {
		const built = scene(4);
		for (const rotor of built.rotors) {
			expect(rotor.center.x).toBeGreaterThan(built.case.x);
			expect(rotor.center.x).toBeLessThan(built.case.x + built.case.width);
		}
	});

	it('reports a hit for each rotor centre', () => {
		const built = scene(3, sparse);
		built.rotors.forEach((rotor) => {
			expect(hitTestScene(built, rotor.center)).toEqual({ kind: 'rotor', index: rotor.index });
		});
	});

	it('puts the reflector past the left end of the row', () => {
		const built = scene(3);
		expect(built.reflector.center.x).toBeLessThan(built.rotors[0]?.center.x ?? 0);
		expect(built.rotors[2]?.center.x).toBeGreaterThan(built.rotors[0]?.center.x ?? 0);
	});

	it('resolves a tap near a rotor edge to that rotor, and the gap to the case', () => {
		const built = scene(3);
		const second = built.rotors[1];
		if (!second) throw new Error('expected three rotors');
		expect(hitTestScene(built, { x: second.center.x + second.slot.radius * 0.9, y: second.center.y })).toEqual({
			kind: 'rotor',
			index: 1,
		});
		const sparse = scene(3, { ...geometry, radius: 10, gap: 20, casePadding: 12 });
		const first = sparse.rotors[0];
		if (!first) throw new Error('expected three rotors');
		expect(hitTestScene(sparse, { x: first.center.x + 16, y: first.center.y }).kind).toBe('case');
	});

	it('hits the reflector and falls back to the case', () => {
		const built = scene(3, sparse);
		expect(hitTestScene(built, built.reflector.center)).toEqual({ kind: 'reflector' });
		expect(hitTestScene(built, { x: built.case.x + 2, y: built.case.y + 2 })).toEqual({ kind: 'case' });
	});

	it('zooms by narrowing the window, not by moving the machine', () => {
		const wide = buildMachineScene({ rotors: scene(3).rotors, reflectorLabel: 'UKW-B' }, { geometry, camera, viewport });
		const close = buildMachineScene(
			{ rotors: scene(3).rotors, reflectorLabel: 'UKW-B' },
			{ geometry, camera: { ...camera, zoom: 2 }, viewport },
		);
		expect(close.bounds.maxX - close.bounds.minX).toBeCloseTo((wide.bounds.maxX - wide.bounds.minX) / 2, 3);
	});

	it('re-projects for a new camera without rebuilding the machine', () => {
		const built = scene(3);
		const turned = withCamera({ rotors: built.rotors, reflectorLabel: 'UKW-B' }, { geometry, camera, viewport }, { ...camera, yaw: 0.9 });
		expect(turned.rotors[0]?.center).not.toEqual(built.rotors[0]?.center);
		expect(turned.rotors).toHaveLength(3);
	});
});

describe('svg painter', () => {
	it('paints a machine without NaN and with one group per rotor', () => {
		const svg = renderMachineSvg(scene(3), { theme, showCase: true, showCaption: true, showNotch: true, title: 'Enigma I' });
		expect(svg.startsWith('<svg')).toBe(true);
		expect(svg).toContain('role="img"');
		expect(svg.match(/<g class="rotor"/g)).toHaveLength(3);
		expect(svg).not.toContain('NaN');
		expect(svg).toContain('UKW-B');
	});

	it('can omit the case and the captions', () => {
		const svg = renderRotorFacesSvg(scene(2), { theme, showCase: false, showCaption: false, showNotch: false });
		expect(svg).not.toContain('class="case"');
		expect(svg).not.toContain('rotor-caption');
	});

	it('escapes text it did not author', () => {
		const svg = renderMachineSvg(
			{ ...scene(1), reflector: { label: '<script>', center: { x: 0, y: 0 }, radius: 4 } },
			{ theme, showCase: true, showCaption: false, showNotch: false, title: 'a "quoted" label' },
		);
		expect(svg).toContain('&lt;script&gt;');
		expect(svg).toContain('&quot;quoted&quot;');
	});

	it('returns a path per rotor and null for an unknown one', () => {
		const built = scene(3);
		expect(rotorPath(built, 0)).toMatch(/^M/);
		expect(rotorPath(built, 99)).toBeNull();
	});
});
