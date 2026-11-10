# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

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
