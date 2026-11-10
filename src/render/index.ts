/**
 * Optional rendering helpers. Import from `@enigma-lab/core/render`.
 *
 * The point of this entry point is to remove the boring geometry work, not to
 * impose a look: every colour, size and arrangement is a required input, so a
 * consumer builds its own model and passes its own theme. The same
 * {@link MachineScene} drives SVG, Canvas and WebGPU, and the same
 * {@link hitTestScene} decides what a tap meant in all three.
 */
export { circlePath, layoutRotors, project, round, type Camera, type LayoutOptions, type RotorSlot, type Vec2, type Vec3 } from './geometry.js';
export {
	buildMachineScene,
	hitTestScene,
	withCamera,
	type MachineGeometry,
	type MachineScene,
	type PlacedRotor,
	type SceneHit,
	type SceneMachine,
	type SceneOptions,
	type SceneRect,
	type SceneRotor,
} from './scene.js';
export { renderMachineSvg, renderRotorFacesSvg, rotorPath, type SvgPaintOptions } from './svg.js';
export type { RenderTheme } from './theme.js';
