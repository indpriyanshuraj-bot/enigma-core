/**
 * A small, renderer-agnostic geometry layer.
 *
 * The website can project the same points into SVG, Canvas or WebGPU; the maths
 * lives here once so all three backends agree on where things are.
 */
export interface Vec3 {
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

export interface Vec2 {
	readonly x: number;
	readonly y: number;
}

/** Camera for a top-down view with a configurable tilt. */
export interface Camera {
	/** Rotation around the vertical axis, in radians. */
	readonly yaw: number;
	/** Tilt away from straight-down, in radians. `0` is a pure plan view. */
	readonly pitch: number;
	/** Units per user unit. */
	readonly zoom: number;
	/** Screen position of the origin, in user units. */
	readonly origin: Vec2;
}

/** Projects a 3D point to 2D screen space. */
export function project(point: Vec3, camera: Camera): Vec2 {
	const cosYaw = Math.cos(camera.yaw);
	const sinYaw = Math.sin(camera.yaw);
	const x = point.x * cosYaw - point.z * sinYaw;
	const z = point.x * sinYaw + point.z * cosYaw;
	const cosPitch = Math.cos(camera.pitch);
	const sinPitch = Math.sin(camera.pitch);
	return {
		x: camera.origin.x + x * camera.zoom,
		y: camera.origin.y + (point.y * cosPitch - z * sinPitch) * camera.zoom,
	};
}

/** One rotor's placement in the machine, all in user units. */
export interface RotorSlot {
	readonly index: number;
	readonly id: string;
	readonly center: Vec3;
	readonly radius: number;
	readonly thickness: number;
}

export interface LayoutOptions {
	/** Number of rotors. */
	readonly rotorCount: number;
	/** Outer radius of a rotor. */
	readonly radius: number;
	/** Axial thickness of a rotor. */
	readonly thickness: number;
	/** Gap between rotors. */
	readonly gap: number;
	/** `stack` runs the rotors along Z (the real machine), `row` spreads them along X. */
	readonly arrangement?: 'stack' | 'row' | undefined;
}

/** Lays rotors out for the top-down view. */
export function layoutRotors(options: LayoutOptions): RotorSlot[] {
	const { rotorCount, radius, thickness, gap, arrangement = 'stack' } = options;
	const step = arrangement === 'stack' ? thickness + gap : radius * 2 + gap;
	const span = step * Math.max(rotorCount - 1, 0);
	const slots: RotorSlot[] = [];
	for (let index = 0; index < rotorCount; index += 1) {
		const offset = index * step - span / 2;
		slots.push({
			index,
			id: `rotor-${index}`,
			center: arrangement === 'stack' ? { x: 0, y: 0, z: offset } : { x: offset, y: 0, z: 0 },
			radius,
			thickness,
		});
	}
	return slots;
}

/** Polyline approximating a circle on the XZ plane, projected. */
export function circlePath(center: Vec3, radius: number, camera: Camera, segments = 48): string {
	const points: string[] = [];
	for (let i = 0; i <= segments; i += 1) {
		const angle = (i / segments) * Math.PI * 2;
		const p = project({ x: center.x + Math.cos(angle) * radius, y: center.y, z: center.z + Math.sin(angle) * radius }, camera);
		points.push(`${round(p.x)} ${round(p.y)}`);
	}
	return `M${points.join(' L')} Z`;
}

/** Rounds to two decimals, keeping SVG output small and diff-stable. */
export function round(value: number): number {
	return Math.round(value * 100) / 100;
}
