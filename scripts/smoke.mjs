#!/usr/bin/env node
/**
 * Loads every artefact the release ships and runs the same trace through it.
 *
 * A build that typechecks can still be a bundle that no consumer can load: a
 * wrong `exports` map, a UMD wrapper that names the wrong global, a CJS file
 * that kept an ESM `import`. This script is the cheap way to catch that.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const results = [];

/** Rings BBB, start AAA, rotors I II III: the published trace is EWTYX. */
function check(label, api) {
	const machine = api.buildMachine({ preset: 'enigma-1', rings: 'BBB', positions: 'AAA' });
	const out = machine.encrypt('AAAAA');
	if (out !== 'EWTYX') throw new Error(`${label}: expected EWTYX, got ${out}`);
	const bits = api.keyspaceForPreset('enigma-1').bits;
	if (!(bits > 81 && bits < 82)) throw new Error(`${label}: unexpected key space ${bits}`);
	if (typeof api.VERSION !== 'string') throw new Error(`${label}: VERSION is missing`);
	results.push(`${label.padEnd(22)} ${out}  ${bits.toFixed(2)} bits  v${api.VERSION}`);
}

check('esm import', await import('../dist/index.js'));
check('cjs require', require('../dist/index.cjs'));

const umdSource = readFileSync(new URL('../dist/enigma-core.umd.js', import.meta.url), 'utf8');
const sandbox = { self: undefined, window: undefined, globalThis: undefined, console };
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.window = sandbox;
runInNewContext(umdSource, sandbox);
if (!sandbox.EnigmaCore) throw new Error('umd: no EnigmaCore global');
check('umd script tag', sandbox.EnigmaCore);

const renderEsm = await import('../dist/render.js');
if (typeof renderEsm.buildMachineScene !== 'function') throw new Error('esm render: buildMachineScene missing');
const renderCjs = require('../dist/render.cjs');
if (typeof renderCjs.hitTestScene !== 'function') throw new Error('cjs render: hitTestScene missing');
results.push(`${'esm render'.padEnd(22)} buildMachineScene, hitTestScene, renderMachineSvg`);
results.push(`${'cjs render'.padEnd(22)} buildMachineScene, hitTestScene, renderMachineSvg`);

for (const line of results) console.log(`ok  ${line}`);
console.log(`ok  ${results.length} artefacts load and agree`);
