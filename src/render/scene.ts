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
	const count = Math.max(machine.rotors.length, 1);
	const slots = layoutRotors({
		rotorCount: count,
		radius: geometry.radius,
		thickness: geometry.thickness,
		gap: geometry.gap,
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
			center: project(slot.center, camera),
			notch: project({ x: slot.center.x, y: 0, z: slot.center.z - slot.radius * 0.92 }, camera),
			caption: project({ x: slot.center.x, y: 0, z: slot.center.z + slot.radius * 0.62 }, camera),
		};
	});

	const first = slots[0];
	const last = slots[slots.length - 1];
	// The reflector sits past the far end of the stack, beyond the leftmost rotor.
	const reflectorCenter = project(
		{ x: 0, y: 0, z: (last?.center.z ?? 0) + geometry.reflectorGap + geometry.radius },
		camera,
	);
	const corners = [...slots, null]
		.filter((slot): slot is RotorSlot => Boolean(slot))
		.flatMap((slot) => [
			project({ x: slot.center.x - slot.radius, y: 0, z: slot.center.z - slot.radius }, camera),
			project({ x: slot.center.x + slot.radius, y: 0, z: slot.center.z + slot.radius }, camera),
		])
		.concat([
			{ x: reflectorCenter.x - geometry.radius * 0.72, y: reflectorCenter.y - geometry.radius * 0.72 },
			{ x: reflectorCenter.x + geometry.radius * 0.72, y: reflectorCenter.y + geometry.radius * 0.72 },
		]);
	const pad = geometry.casePadding;
	const minX = Math.min(...corners.map((point) => point.x)) - pad;
	const maxX = Math.max(...corners.map((point) => point.x)) + pad;
	const minY = Math.min(...corners.map((point) => point.y)) - pad;
	const maxY = Math.max(...corners.map((point) => point.y)) + pad;

	return {
		camera,
		viewport: options.viewport,
		geometry,
		case: { x: minX, y: minY, width: maxX - minX, height: maxY - minY, radius: pad },
		rotors: placed,
		reflector: { label: machine.reflectorLabel, center: reflectorCenter, radius: geometry.radius * 0.72 },
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
