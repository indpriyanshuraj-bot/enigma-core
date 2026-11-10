# enigma-core

Headless, deterministic Enigma machine in TypeScript, plus an optional renderer
that does the geometry but never the styling.

[![ci](https://github.com/indpriyanshuraj-bot/enigma-core/actions/workflows/ci.yml/badge.svg)](https://github.com/indpriyanshuraj-bot/enigma-core/actions/workflows/ci.yml)
[![release](https://img.shields.io/github/v/release/indpriyanshuraj-bot/enigma-core?include_prereleases)](https://github.com/indpriyanshuraj-bot/enigma-core/releases)

Two entry points, both ESM-first and tree-shakeable, with **zero runtime
dependencies**:

| Entry | What it is | Touches the DOM |
| --- | --- | --- |
| `@enigma-lab/core` | the machine: rotors, reflectors, plugboard, stepping, key space | no |
| `@enigma-lab/core/render` | projection and layout maths, optional SVG painter | only if you hand it a document |

The core is plain data in, plain data out. That is what makes it usable from a
test runner, a worker, a CLI, a server, or a WebGPU renderer.

```ts
import { buildMachine, keyspaceForPreset, formatKeyspace } from '@enigma-lab/core';

const machine = buildMachine({
	preset: 'enigma-1',        // Wehrmacht, three rotors from five, UKW-B
	rotorOrder: ['I', 'II', 'III'],
	rings: 'AAA',
	positions: 'AAA',
	plugboard: [['A', 'M'], ['F', 'I'], ['N', 'V'], ['P', 'S'], ['T', 'U'], ['W', 'Z']],
});

machine.encrypt('AAAAA');          // 'BDZGO'
keyspaceForPreset('enigma-1').bits; // 81.2 bits
formatKeyspace(keyspaceForPreset('enigma-1')); // '2.79 × 10^24'
```

## Why the numbers can be trusted

The test suite pins the implementation to published traces rather than to
itself:

- rotors `I II III`, reflector `B`, ring settings `BBB`, start `AAA`,
  typing `AAAAA` gives **`EWTYX`** (Crypto Museum / Wikipedia rotor tables);
- the same machine with ring settings `AAA` gives **`BDZGO`**;
- stepping is checked at the notch, including the **double step** of the middle
  rotor (`ADU → ADV → AEW → BFX`);
- key space is computed in `bigint`, because Enigma I is 2.79 × 10^24 and a
  `number` would quietly round it.

## API in one screen

```ts
import {
	buildConfig, buildMachine, createMachine, createRotorSpec, createReflectorSpec,
	PRESETS, ROTORS, REFLECTORS, keyspace, keyspaceForPreset, plugboardCount,
	createRng, EnigmaMachine, Rotor, Plugboard,
} from '@enigma-lab/core';
```

- **`buildMachine(options)`** — operator-facing options (rotor order left to
  right, ring and window letters, cables) to a running machine.
- **`MachineConfig`** — fully serialisable description, so a simulation can be
  stored, diffed and replayed.
- **`EnigmaMachine`** — `press`, `encrypt`, `encryptSymbol`, `stepRotors`,
  `setPositions`, `setWindow`, `setRings`, `state`, `window`.
- **`keyspace()`** — `bigint` breakdown (rotor orders, rings, positions,
  plugboard) plus entropy in bits.
- **`createRotorSpec` / `createReflectorSpec`** — build machines the Wehrmacht
  never had: 100 rotors, a 32-symbol alphabet, your own wiring.
- **`@enigma-lab/core/render`** — `project`, `layoutRotors`, `circlePath`,
  `renderSceneToSvg`, and a `RenderTheme` you must fill in yourself.

## Rendering is deliberately unopinionated

`RenderTheme` has no defaults. Every colour, size and arrangement is a required
input, so the library cannot impose a look on the machine you are building. It
ships geometry, not a model.

```ts
import { renderSceneToSvg } from '@enigma-lab/core/render';

const svg = renderSceneToSvg(
	{ rotors: [{ id: 'III', letter: 'A', ringLetter: 'B', atNotch: false }], reflectorLabel: 'UKW-B' },
	{
		width: 360, height: 260, radius: 28, thickness: 10, gap: 4,
		camera: { yaw: 0.45, pitch: 0.9, zoom: 3, origin: { x: 180, y: 130 } },
		theme: myTheme,
	},
);
```

## Install

The package is published as a GitHub Release tarball (and to npm when a token is
configured):

```bash
npm install https://github.com/indpriyanshuraj-bot/enigma-core/releases/download/v0.1.0/enigma-lab-core-0.1.0.tgz
```

## Development

```bash
pnpm install
pnpm run typecheck
pnpm test
pnpm run build   # rolldown → dist/*.js, tsc → dist/*.d.ts
pnpm run size    # fails when a bundle outgrows its budget
```

Requires Node 22+ for the toolchain; the published bundles target ES2022.

## Credits

Rotor, reflector and notch data follows the published measurements collected by
the Crypto Museum, Tony Sale's pages and the 1954 *Catalog of Enigma cipher
machine wirings*. The historical record of breaking the machine belongs to the
Polish Cipher Bureau (Rejewski, Różycki, Zygalski) and to Bletchley Park.

MIT © Priyanshu Raj
