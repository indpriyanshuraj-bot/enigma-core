# Plan

Four phases. Each one lands on a branch, through a pull request, with CI green
before the merge.

## Phase 1 — scaffolding (done)

Repository, toolchain, CI, tag-driven release, and a website that pins the release
by sha256.

## Phase 2 — the library learns to draw (done, v0.2.0)

- A projected `MachineScene` shared by every backend, with `hitTestScene` so a tap
  means the same thing in SVG, Canvas and WebGPU.
- A whole-machine SVG painter: case, reflector, rotor stack, windows, captions,
  notches — with no colours of its own.
- Key-sheet procedures (`transmit`, `receive`) and seeded key generation.
- The M4 key space corrected to 2·8·7·6 = 672 rotor orders.

## Phase 3 — the website becomes a machine (in progress)

- WebGPU renderer for the machine view, with the SVG painter as the fallback and
  the library's scene as the single source of geometry.
- The manual experience: lid opens, view rotates, rotors swap, cables drag, lamps
  flash.
- A builder for machines that never existed: 1 to 100 rotors, custom wiring,
  custom notches, custom alphabet.
- A key-space explorer with sliders, including the counter-intuitive result that
  thirteen cables is weaker than ten.

## Phase 4 — quality

- Playwright smoke test in CI: build once, screenshot at 360 px and 1280 px, fail
  on any console error.
- Accessibility pass: focus order, reduced motion, labels for the machine.
- A sourced history page.
- `CONTRIBUTING.md` and `ARCHITECTURE.md`.

## Not planned

- No backend, no accounts, no telemetry. The machine runs in the tab.
- No npm publication: releases are GitHub Release tarballs, pinned by sha256.
- No Netlify unless GitHub Pages stops being enough.
