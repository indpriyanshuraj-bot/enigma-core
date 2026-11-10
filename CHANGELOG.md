# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-11-10

### Fixed

- `buildMachineScene` measured each rotor's extent from the corners of its bounding
  square, which under yaw sit inside the circle's silhouette — so the case clipped
  the rotor it was meant to enclose. The bounds now sample the circumference.

## [0.4.0] - 2026-11-10

### Added

- **Models.** A `MachineModel` describes a whole machine — its rotors, reflectors,
  defaults, alphabet and which physical parts it has — so a renderer can draw what
  the core can run. `defineModel` validates, `getModel`/`listModels` read the
  catalogue, `modelToConfig` produces a runnable config and `modelKeyspace` counts it.
- **Custom models.** `customModel({ rotorCount, seed, notches, alphabet, reflector })`
  generates a complete machine deterministically: derangement wirings, an involution
  reflector, up to a hundred rotors. `encodeModel`/`decodeModel` round-trip it through
  a short string, so an invented machine can be shared as a link.
- `scripts/release-notes.mjs`, so a release body carries one version's notes instead
  of the whole changelog.
- The CI workflow is now reusable (`workflow_call`) and the release calls it, so the
  checks a release is gated on are the same ones a pull request runs.

### Fixed

- `modelFromPreset` now includes the thin Beta and Gamma rotors, which the M4 can
  physically fit even though they are not part of its cipher pool.

## [0.3.0] - 2026-11-10

### Added

- Three build artefacts from one source, all smoke-tested against the same trace:
  - `dist/index.js` / `dist/render.js` — ESM for bundlers and browsers,
  - `dist/index.cjs` / `dist/render.cjs` — CommonJS for `require()`, Node servers and
    older toolchains,
  - `dist/enigma-core.umd.js` / `dist/enigma-core-render.umd.js` — UMD for a plain
    `<script>` tag, exposing the `EnigmaCore` and `EnigmaCoreRender` globals.
- `exports`, `main`, `module`, `browser`, `unpkg` and `jsdelivr` fields so every consumer
  resolves the right file without configuration.
- `pnpm run smoke` loads each artefact — ESM `import`, CJS `require`, UMD in a bare VM
  context — and asserts the published trace, so a broken `exports` map fails CI.
- Release assets now include both UMD bundles, each covered by the provenance attestation.

## [0.2.1] - 2026-11-10

### Fixed

- Rotors are laid out in a row with parallel axes, as they sit in a real
  machine, instead of as an overlapping stack. Every rotor is now separately
  visible and separately touchable, and the reflector sits past the left end of
  the row where the Umkehrwalze sat.
- The scene's bounds are grown to the viewport's aspect ratio, so a GPU canvas
  that stretches and an SVG that letterboxes no longer disagree about where a
  rotor is.
- `camera.zoom` narrowed the projection as well as the window and therefore
  cancelled itself out; it now changes only the window, so zooming works.
- The notch marker and the caption were projected on the wrong side of the disc.

## [0.2.0] - 2026-11-10

### Added

- `render/scene`: `buildMachineScene`, `withCamera`, `hitTestScene`. One scene,
  projected once, drives SVG, Canvas and WebGPU, and one hit test decides what a
  tap meant in all three.
- `render/svg`: `renderMachineSvg`, `renderRotorFacesSvg` and `rotorPath` paint a
  whole machine — case, reflector, rotor stack, windows, captions, notches — from
  a scene plus a caller-supplied theme.
- `procedures`: `encodeIndicator`, `decodeIndicator`, `transmit`, `receive` and
  `groupText`, modelling the indicator procedure that actually leaked the key.
- `keygen`: `generateKey`, `randomWiring` and `randomReflector` — seeded, so a
  generated key sheet can be shared, replayed and asserted on.
- `.npmrc` with `minimumReleaseAge=0`, so dependency tooling can resolve a
  freshly published package.

### Fixed

- The M4 key space counted 8·7·6·5 = 1680 rotor orders. The machine chose Beta
  *or* Gamma for the leftmost slot and three of eight for the rest, so the figure
  is 2·8·7·6 = 672, and the M4 is 94.1 bits rather than 95.4.
- The reflector was projected into the middle of the rotor stack instead of past
  its far end, and hit-testing preferred the rotor furthest from the viewer.

## [0.1.0] - 2026-11-10

### Added

- Headless machine core: `EnigmaMachine`, `Rotor`, `Plugboard`, `buildMachine`,
  `buildConfig`, serialisable `MachineConfig` / `MachineState`.
- Historical catalogue: rotors I–VIII plus thin Beta and Gamma, reflectors
  UKW-A/B/C plus the M4 thin pair, presets for Enigma I, M3 and M4.
- `keyspace()` with a `bigint` breakdown and entropy in bits.
- Optional `@enigma-lab/core/render` entry: projection, layout, SVG painter, and
  a `RenderTheme` with no defaults.
- Test suite pinned to published traces (`EWTYX`, `BDZGO`) including double-step
  behaviour, at 96% statement coverage.
- CI (typecheck, tests with coverage thresholds, rolldown build, bundle budget)
  and a tag-driven release workflow that attests provenance.
