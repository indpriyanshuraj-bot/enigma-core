#!/usr/bin/env node
// Fails the build when a bundle grows past its budget, so the library stays small.
import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';

const BUDGETS = {
	'dist/index.js': 20_000,
	'dist/render.js': 8_000,
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
