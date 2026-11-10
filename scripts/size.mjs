#!/usr/bin/env node
// Fails the build when a bundle grows past its budget, so the library stays small.
import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';

const BUDGETS = {
	'dist/index.js': 32_000,
	'dist/render.js': 10_000,
	'dist/index.cjs': 33_000,
	'dist/render.cjs': 11_000,
	'dist/enigma-core.umd.js': 34_000,
	'dist/enigma-core-render.umd.js': 12_000,
};

let failed = false;
for (const [file, budget] of Object.entries(BUDGETS)) {
	let raw;
	try {
		raw = readFileSync(file);
	} catch {
		console.error(`missing build output: ${file}`);
		failed = true;
		continue;
	}
	const gzip = gzipSync(raw).length;
	const ok = raw.length <= budget;
	if (!ok) failed = true;
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${file}: ${statSync(file).size} B raw, ${gzip} B gzip (budget ${budget} B)`);
}
process.exit(failed ? 1 : 0);
