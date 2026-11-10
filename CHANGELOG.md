# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

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
