import eslintReact from '@eslint-react/eslint-plugin';

/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
	// Global ignores. Keep this object scoped only to ignores.
	{
		name: 'metronome/global-ignores',
		ignores: [
			'.audit/**',
			'.next/**',
			'.tools/**',
			'coverage/**',
			'node_modules/**',
			'playwright-report/**',
			'test-results/**',
			'semgrep-inventory.json',
			'*.config.js',
			'*.config.mjs',
			'*.config.ts',
		],
	},

	// React 19 support using rules that natively target ESLint 10.
	{
		...eslintReact.configs['recommended-typescript'],
		name: 'metronome/react',
		files: [
			'src/**/*.{jsx,tsx}',
			'tests/**/*.{jsx,tsx}',
		],
		rules: {
			...eslintReact.configs['recommended-typescript'].rules,
			// XO treats recommended React findings as warnings; this gate accounts
			// for the existing occurrences and rejects every new occurrence.
			'@eslint-react/naming-convention-id-name': 'error',
			'@eslint-react/no-array-index-key': 'error',
			'@eslint-react/no-unnecessary-use-prefix': 'error',
			'@eslint-react/use-state': 'error',
		},
	},

	{
		name: 'metronome/source',
		files: [
			'src/**/*.{ts,tsx}',
			'tests/**/*.{ts,tsx}',
			'scripts/**/*.{js,mjs,ts}',
		],
		space: true,
		semicolon: true,
		prettier: 'compat',
		rules: {
			// The project intentionally uses null in domain/result types.
			'unicorn/no-null': 'off',
			'@typescript-eslint/no-restricted-types': ['error', {
				types: {
					object: {
						message: 'The `object` type is hard to use. Use `Record<string, unknown>` instead.',
						fixWith: 'Record<string, unknown>',
					},
					Buffer: {
						message: 'Use Uint8Array instead of the Node.js-specific Buffer type.',
						suggest: ['Uint8Array'],
					},
					'[]': 'The empty array type only permits empty arrays. Use SomeType[] instead.',
					'[[]]': 'This only permits one empty array. Use SomeType[][] instead.',
					'[[[]]]': 'Use SomeType[][][] instead.',
					'[[[[]]]]': 'Do not use deeply nested empty tuple types.',
					'[[[[[]]]]]': 'Do not use deeply nested empty tuple types.',
				},
			}],

			// Let TypeScript/Next resolver own path alias correctness.
			'import-x/no-unresolved': 'off',

			// Avoid massive noisy rename churn in an existing app.
			'unicorn/prevent-abbreviations': 'off',

			// General guardrails that overlap lightly with CodeScene.
			complexity: ['error', 14],
			'max-depth': ['error', 4],
			'max-lines': ['error', {
				max: 1500,
				skipComments: true,
			}],
			'max-lines-per-function': ['error', {
				max: 90,
				skipBlankLines: true,
				skipComments: true,
				IIFEs: true,
			}],
			'max-nested-callbacks': ['error', 4],
			'max-params': ['error', {max: 4}],
		},
	},

	{
		name: 'metronome/typescript-target',
		files: [
			'**/*.{ts,tsx,mts,cts}',
		],
		rules: {
			// XO 4 defaults to the ES2024-only `v` flag; TypeScript targets ES2022.
			'require-unicode-regexp': ['error', {requireFlag: 'u'}],
		},
	},

	{
		name: 'metronome/ui-architecture-boundaries',
		files: [
			'src/components/**/*.{ts,tsx}',
			'src/hooks/**/*.{ts,tsx}',
		],
		rules: {
			'no-restricted-imports': ['error', {
				patterns: [
					{
						group: ['@/infrastructure/db/*', '@/infrastructure/db/**'],
						message: 'UI/hooks must not import infrastructure DB directly. Use a service/controller/hook boundary.',
					},
					{
						group: ['tone', 'tone/*'],
						message: 'UI/hooks must not import Tone.js directly. Use metronome/audio adapter boundary.',
					},
					{
						group: ['wavesurfer.js', 'wavesurfer.js/*'],
						message: 'UI/hooks must not import wavesurfer directly. Use WaveSurfer adapter/components.',
					},
				],
			}],
			'no-restricted-globals': ['error',
				{
					name: 'MediaRecorder',
					message: 'UI/hooks must not instantiate MediaRecorder directly. Use MediaRecorderAdapter / recording service.',
				},
			],
		},
	},

	{
		name: 'metronome/domain-service-boundaries',
		files: [
			'src/domain/**/*.ts',
			'src/services/**/*.ts',
		],
		rules: {
			'no-restricted-imports': ['error', {
				paths: [
					{
						name: 'react',
						message: 'Domain/services must not import React.',
					},
				],
			}],
		},
	},

	{
		name: 'metronome/known-debt-patterns',
		files: [
			'src/**/*.{ts,tsx}',
		],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: 'BinaryExpression[left.callee.object.name="JSON"][left.callee.property.name="stringify"][right.callee.object.name="JSON"][right.callee.property.name="stringify"]',
					message: 'Do not use JSON.stringify for semantic equality. Move equality into a domain comparator.',
				},
				{
					selector: 'MemberExpression[object.name="window"][property.name=/^__/]',
					message: 'Production code must not depend on window.__* test harness globals.',
				},
				{
					selector: 'NewExpression[callee.name="MediaRecorder"]',
					message: 'Do not instantiate MediaRecorder in UI/hooks. Use adapter/service.',
				},
				{
					selector: 'NewExpression[callee.name=/^(AudioContext|webkitAudioContext)$/]',
					message: 'Do not create AudioContext directly in UI/hooks. Use audio adapter.',
				},
			],
		},
	},

	{
		name: 'metronome/recordings-review-controller-boundary',
		files: [
			'src/components/recordings-review/**/*.{ts,tsx}',
		],
		ignores: [
			'src/components/recordings-review/use-recordings-review-controller.ts',
		],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: 'CallExpression[callee.property.name=/^(setBestTake|setActiveTake|setRecordingFavorite|setRecordingArchived|addRecordingTag|removeRecordingTag)$/]',
					message: 'Recording review mutations must go through the controller/action boundary.',
				},
			],
		},
	},

	{
		name: 'metronome/tests',
		files: [
			'src/**/*.test.{ts,tsx}',
			'tests/**/*.{ts,tsx}',
		],
		rules: {
			'max-lines': ['error', 1500],
			'max-lines-per-function': 'off',
			'max-depth': 'off',
		},
	},

	{
		name: 'metronome/repo-style-final',
		files: [
			'src/**/*.{ts,tsx}',
			'tests/**/*.{ts,tsx}',
			'scripts/**/*.{js,mjs,ts}',
		],
		rules: {
			// Keep this after prettier: compat, which otherwise restores single quotes.
			'@stylistic/quotes': ['error', 'double', {avoidEscape: true}],
		},
	},
];

export default xoConfig;
