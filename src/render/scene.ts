/**
 * A renderable machine, described once.
 *
 * The point of this module is that SVG, Canvas and WebGPU never disagree about
 * where a rotor is: they all read the same scene, and they all hit-test with the
 * same function. The scene carries geometry and labels, never colours — the
 * theme stays with the consumer.
 */
import type { Camera, RotorSlot, Vec2 } from './geometry.js';
import { layoutRotors, project } from './geometry.js';

/** Dimensions in user units. Every value is required: no house style. */
export interface MachineGeometry {
	/** Outer radius of a rotor. */
	readonly radius: number;
	/** Axial thickness of a rotor. */
	readonly thickness: number;
	/** Gap between rotor faces. */
	readonly gap: number;
	/** Padding between the rotor stack and the case wall. */
	readonly casePadding: number;
	/** Distance between the reflector and the first rotor. */
	readonly reflectorGap: number;
}

/** What a renderer needs to know about one rotor. */
export interface SceneRotor {
	readonly id: string;
	/** Symbol in the window. */
	readonly window: string;
	/** Symbol of the ring setting. */
	readonly ring: string;
	readonly atNotch: boolean;
}

/** The machine as the renderer sees it. */
export interface SceneMachine {
	readonly rotors: readonly SceneRotor[];
	readonly reflectorLabel: string;
}

export interface SceneOptions {
	readonly geometry: MachineGeometry;
	readonly camera: Camera;
	readonly viewport: { readonly width: number; readonly height: number };
}

/** A rotor plus everything already projected into screen space. */
export interface PlacedRotor extends SceneRotor {
	readonly index: number;
	readonly slot: RotorSlot;
	/** Projected centre of the rotor face. */
	readonly center: Vec2;
	/** Projected position of the notch marker. */
	readonly notch: Vec2;
	/** Projected anchor for the small id/ring caption. */
	readonly caption: Vec2;
}

export interface SceneRect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly radius: number;
}

/** A complete, renderer-agnostic drawing of a machine. */
export interface MachineScene {
	readonly camera: Camera;
	readonly viewport: { readonly width: number; readonly height: number };
	readonly geometry: MachineGeometry;
	readonly case: SceneRect;
	readonly rotors: readonly PlacedRotor[];
	readonly reflector: { readonly label: string; readonly center: Vec2; readonly radius: number };
	readonly bounds: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };
}

/**
 * Lays out a machine and projects it.
 *
 * Rotors are ordered left to right, matching the core, and drawn back to front
 * so a later rotor overlaps the one behind it, the way the real stack looks from
 * above and slightly in front.
 */
export function buildMachineScene(machine: SceneMachine, options: SceneOptions): MachineScene {
	const { geometry, camera } = options;
	// Zoom belongs to the view window, not to the projection: scaling the points
	// as well would cancel itself out against the bounds.
	const projection: Camera = { ...camera, zoom: 1 };
	const count = Math.max(machine.rotors.length, 1);
	// A real machine's rotors sit side by side with parallel axes, so a top-down
	// view shows a row of wheels — not a stack. That is also the only layout in
	// which every rotor is separately touchable.
	const slots = layoutRotors({
		rotorCount: count,
		radius: geometry.radius,
		thickness: geometry.thickness,
		gap: geometry.gap,
		arrangement: 'row',
	});

	const placed: PlacedRotor[] = slots.map((slot) => {
		const rotor = machine.rotors[slot.index];
		return {
			id: rotor?.id ?? '',
			window: rotor?.window ?? '',
			ring: rotor?.ring ?? '',
			atNotch: rotor?.atNotch ?? false,
			index: slot.index,
			slot,
			center: project(slot.center, projection),
			// The notch sits on the index ring at the top of the wheel; the caption
			// goes just below it, clear of the window letter.
			notch: project({ x: slot.center.x, y: 0, z: slot.center.z + slot.radius * 0.9 }, projection),
			caption: project({ x: slot.center.x, y: 0, z: slot.center.z - slot.radius * 1.16 }, projection),
		};
	});

	const first = slots[0];
	const last = slots[slots.length - 1];
	// The reflector is a thin wheel past the left end of the row, where the real
	// Umkehrwalze sat.
	const reflectorRadius = geometry.radius * 0.72;
	const reflectorCenter = project(
		{ x: (first?.center.x ?? 0) - reflectorRadius - geometry.reflectorGap, y: 0, z: 0 },
		projection,
	);
	const corners = [...slots, null]
		.filter((slot): slot is RotorSlot => Boolean(slot))
		.flatMap((slot) => [
			project({ x: slot.center.x - slot.radius, y: 0, z: slot.center.z - slot.radius }, projection),
			project({ x: slot.center.x + slot.radius, y: 0, z: slot.center.z + slot.radius }, projection),
		])
		.concat([
			{ x: reflectorCenter.x - reflectorRadius, y: reflectorCenter.y - reflectorRadius },
			{ x: reflectorCenter.x + reflectorRadius, y: reflectorCenter.y + reflectorRadius },
		]);
	const pad = geometry.casePadding;
	let minX = Math.min(...corners.map((point) => point.x)) - pad;
	let maxX = Math.max(...corners.map((point) => point.x)) + pad;
	let minY = Math.min(...corners.map((point) => point.y)) - pad;
	let maxY = Math.max(...corners.map((point) => point.y)) + pad;

	// Grow the shorter axis to the viewport's aspect ratio, centred. Without this
	// the SVG letterboxes while a GPU canvas stretches, and the two backends
	// disagree about where every rotor is.
	const aspect = options.viewport.width / Math.max(options.viewport.height, 1);
	const width = maxX - minX;
	const height = maxY - minY;
	if (width / height < aspect) {
		const wanted = height * aspect;
		minX -= (wanted - width) / 2;
		maxX += (wanted - width) / 2;
	} else {
		const wanted = width / aspect;
		minY -= (wanted - height) / 2;
		maxY += (wanted - height) / 2;
	}

	// Zoom shrinks the window onto the machine. It has to be applied to the
	// bounds, not to the projected points, because the points define the bounds.
	const zoom = Math.max(camera.zoom, 0.05);
	const centreX = (minX + maxX) / 2;
	const centreY = (minY + maxY) / 2;
	const halfW = (maxX - minX) / 2 / zoom;
	const halfH = (maxY - minY) / 2 / zoom;
	minX = centreX - halfW;
	maxX = centreX + halfW;
	minY = centreY - halfH;
	maxY = centreY + halfH;

	return {
		camera,
		viewport: options.viewport,
		geometry,
		case: { x: minX, y: minY, width: maxX - minX, height: maxY - minY, radius: pad },
		rotors: placed,
		reflector: { label: machine.reflectorLabel, center: reflectorCenter, radius: reflectorRadius },
		bounds: { minX, minY, maxX, maxY },
	};
}

/** What the pointer is over. */
export type SceneHit =
	| { readonly kind: 'rotor'; readonly index: number }
	| { readonly kind: 'reflector' }
	| { readonly kind: 'case' };

/**
 * Hit-tests a projected point against the scene.
 *
 * Front rotors win, because the last drawn rotor is the one you can actually
 * touch. The maths is identical for every renderer, so a tap means the same
 * thing whether the frame came from WebGPU or SVG.
 */
export function hitTestScene(scene: MachineScene, point: Vec2): SceneHit {
	// Index 0 is drawn last and sits nearest the viewer, so it wins the tap.
	for (let index = 0; index < scene.rotors.length; index += 1) {
		const rotor = scene.rotors[index];
		if (!rotor) continue;
		const dx = point.x - rotor.center.x;
		const dy = point.y - rotor.center.y;
		if (dx * dx + dy * dy <= rotor.slot.radius * rotor.slot.radius) {
			return { kind: 'rotor', index: rotor.index };
		}
	}
	const dx = point.x - scene.reflector.center.x;
	const dy = point.y - scene.reflector.center.y;
	if (dx * dx + dy * dy <= scene.reflector.radius * scene.reflector.radius) {
		return { kind: 'reflector' };
	}
	return { kind: 'case' };
}

/** Re-projects a scene for a new camera, keeping the machine as it is. */
export function withCamera(machine: SceneMachine, options: SceneOptions, camera: Camera): MachineScene {
	return buildMachineScene(machine, { ...options, camera });
}
