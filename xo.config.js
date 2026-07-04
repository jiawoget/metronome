import xoReact from 'eslint-config-xo-react';

/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
	// Global ignores. Keep this object scoped only to ignores.
	{
		name: 'metronome/global-ignores',
		ignores: [
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

	// React support. XO handles TypeScript by default; this adds React/JSX rules.
	...xoReact(),

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
			// Existing project style uses double quotes. Avoid quote-only churn.
			quotes: ['error', 'double', {avoidEscape: true}],

			// TypeScript/React project conventions.
			'react/prop-types': 'off',
			'react/react-in-jsx-scope': 'off',

			// The project intentionally uses null in domain/result types.
			'unicorn/no-null': 'off',

			// Let TypeScript/Next resolver own path alias correctness.
			'import-x/no-unresolved': 'off',

			// Avoid massive noisy rename churn in an existing app.
			'unicorn/prevent-abbreviations': 'off',

			// General guardrails that overlap lightly with CodeScene.
			complexity: ['warn', 14],
			'max-depth': ['warn', 4],
			'max-lines-per-function': ['warn', {
				max: 90,
				skipBlankLines: true,
				skipComments: true,
				IIFEs: true,
			}],
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
			'max-lines-per-function': 'off',
			'max-depth': 'off',
		},
	},
];

export default xoConfig;
