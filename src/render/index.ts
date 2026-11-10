/**
 * Optional rendering helpers. Import from `@enigma-lab/core/render`.
 *
 * The point of this entry point is to remove the boring geometry work, not to
 * impose a look: every colour, size and arrangement is a required input, so a
 * consumer builds its own model and passes its own theme.
 */
export { circlePath, layoutRotors, project, round, type Camera, type LayoutOptions, type RotorSlot, type Vec2, type Vec3 } from './geometry.js';
export { renderSceneToSvg, type RotorView, type Scene, type SvgOptions } from './svg.js';
export type { RenderTheme } from './theme.js';
