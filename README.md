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
keyspaceForPreset('kriegsmarine-m4').bits; // 94.1 bits, 672 rotor orders
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
- **`procedures`** — `transmit`, `receive`, `encodeIndicator`, `decodeIndicator`,
  `groupText`: the indicator procedure, modelled.
- **`keygen`** — `generateKey`, `randomWiring`, `randomReflector`.
- **`@enigma-lab/core/render`** — `buildMachineScene`, `hitTestScene`,
  `renderMachineSvg`, `project`, `layoutRotors`, and a `RenderTheme` you must
  fill in yourself.

## Procedures, because that is how it was broken

```ts
import { buildMachine, transmit, receive, generateKey } from '@enigma-lab/core';

const daily = { rotorOrder: ['I', 'II', 'III'], rings: 'AAA', positions: 'MCK' };
const sent = transmit(buildMachine(daily), 'attack at dawn', daily, 'QWE');
// sent.indicator = the message key, encrypted twice — the leak that Welchman and
// Turing's bombes exploited. sent.body = ATTACKATDAWN, in cipher.

receive(buildMachine(daily), sent, daily).plaintext; // 'ATTACKATDAWN'
generateKey('kriegsmarine-m4', { seed: 5 });          // a repeatable key sheet
```

`generateKey` is seeded, so a "random key" can be put in a URL, replayed in a
test, or printed on a worksheet. `randomWiring` and `randomReflector` build
machines that never existed, with the same constraints the real ones obeyed: a
rotor wiring is a derangement, a reflector is an involution with no fixed point.

## Rendering is deliberately unopinionated

`RenderTheme` has no defaults. Every colour, size and arrangement is a required
input, so the library cannot impose a look on the machine you are building. It
ships geometry, not a model.

```ts
import { buildMachineScene, hitTestScene, renderMachineSvg } from '@enigma-lab/core/render';

const scene = buildMachineScene(
	{ rotors, reflectorLabel: 'UKW-B' },
	{ geometry: { radius: 40, thickness: 22, gap: 6, casePadding: 18, reflectorGap: 24 },
	  camera: { yaw: 0.34, pitch: 1.02, zoom: 1, origin: { x: 180, y: 130 } },
	  viewport: { width: 360, height: 260 } },
);

renderMachineSvg(scene, { theme: myTheme, showCase: true, showCaption: true, showNotch: true });
hitTestScene(scene, { x: 190, y: 140 }); // { kind: 'rotor', index: 0 }
```

A scene is projected once and read by every backend, and `hitTestScene` gives the
same answer whether the frame came from WebGPU, Canvas or SVG — so a tap means
one thing everywhere. Index 0 is the rotor nearest the viewer and wins a tap that
overlaps the stack.

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
