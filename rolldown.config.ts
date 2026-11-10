import { defineConfig } from 'rolldown';

/**
 * Three artefacts, one source.
 *
 * - `dist/*.js`    ESM, for bundlers and browsers. Tree-shakeable, side-effect free.
 * - `dist/*.cjs`   CommonJS, for `require()`, Node servers, Jest and older toolchains.
 * - `dist/*.umd.js` UMD, for a plain `<script>` tag and for CDNs. Exposes
 *                   `EnigmaCore` and `EnigmaCoreRender` globals.
 *
 * Nothing here is environment-specific: the core never touches the DOM, and the
 * renderer only does when a caller hands it a document.
 */
const shared = {
	sourcemap: true,
	comments: false,
	minify: false,
} as const;

const entries = [
	{ input: { index: 'src/index.ts' }, name: 'EnigmaCore' },
	{ input: { render: 'src/render/index.ts' }, name: 'EnigmaCoreRender' },
] as const;

export default defineConfig(
	entries.flatMap(({ input, name }) => [
		{
			input,
			output: { ...shared, dir: 'dist', format: 'esm' as const, entryFileNames: '[name].js' },
			platform: 'neutral' as const,
		},
		{
			input,
			output: { ...shared, dir: 'dist', format: 'cjs' as const, entryFileNames: '[name].cjs' },
			platform: 'node' as const,
		},
		{
			input,
			output: {
				...shared,
				dir: 'dist',
				format: 'umd' as const,
				entryFileNames: `${name === 'EnigmaCore' ? 'enigma-core' : 'enigma-core-render'}.umd.js`,
				name,
			},
			platform: 'browser' as const,
		},
	]),
);
