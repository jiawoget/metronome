#!/usr/bin/env node
import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync, statSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const generatedDirectory = path.join(root, 'docs/generated');
const outputPath = path.join(generatedDirectory, 'primitive-index.json');
const sourceExtensions = new Set(['.ts', '.tsx']);

const exportPatterns = [
	/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/gv,
	/export\s+const\s+([A-Za-z0-9_]+)/gv,
	/export\s+class\s+([A-Za-z0-9_]+)/gv,
	/export\s+(?:type|interface)\s+([A-Za-z0-9_]+)/gv,
];

const browserDefaultPattern = /\b([A-Za-z0-9_]+)\s*=\s*(browser[A-Za-z0-9_]+|createBrowser[A-Za-z0-9_]+)/gv;
const localHelperPattern = /(?:function|const)\s+(normalize[A-Za-z0-9_]*|format[A-Za-z0-9_]*|validate[A-Za-z0-9_]*|resolve[A-Za-z0-9_]*|select[A-Za-z0-9_]*|parse[A-Za-z0-9_]*)\b/gv;

async function walk(directory) {
	if (!existsSync(directory)) {
		return [];
	}

	const entries = await readdir(directory, {withFileTypes: true});
	const files = [];

	for (const entry of entries) {
		if (entry.name === 'node_modules' || entry.name === '.next') {
			continue;
		}

		const absolutePath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...await walk(absolutePath));
			continue;
		}

		if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
			files.push(absolutePath);
		}
	}

	return files;
}

function toRepositoryPath(absolutePath) {
	return path.relative(root, absolutePath).split(path.sep).join('/');
}

function classifyPrimitive(name, filePath) {
	if (/^(validate|parse)/v.test(name)) {
		return 'validation';
	}

	if (/^format/v.test(name)) {
		return 'formatting';
	}

	if (/^(normalize|required)/v.test(name)) {
		return 'normalization';
	}

	if (/^(resolve|select|getHome|getLibrary|getContinue)/v.test(name)) {
		return 'read-model';
	}

	if (/Service|Repository|Gateway|Adapter/v.test(name) || /\/services\//v.test(filePath)) {
		return 'service-boundary';
	}

	if (/\/domain\//v.test(filePath)) {
		return 'domain';
	}

	return 'other';
}

function collectMatches(source, pattern) {
	const results = [];

	for (const match of source.matchAll(pattern)) {
		results.push(match);
	}

	return results;
}

async function main() {
	const files = await walk(sourceRoot);
	const exports = [];
	const localHelpers = [];
	const componentBrowserDefaults = [];

	for (const file of files) {
		if (!statSync(file).isFile()) {
			continue;
		}

		const repositoryPath = toRepositoryPath(file);
		const source = await readFile(file, 'utf8');

		for (const pattern of exportPatterns) {
			for (const match of collectMatches(source, pattern)) {
				const name = match[1];
				exports.push({
					name,
					path: repositoryPath,
					category: classifyPrimitive(name, repositoryPath),
				});
			}
		}

		for (const match of collectMatches(source, localHelperPattern)) {
			localHelpers.push({
				name: match[1],
				path: repositoryPath,
				category: classifyPrimitive(match[1], repositoryPath),
			});
		}

		if (/^src\/components\//v.test(repositoryPath) || /^src\/hooks\//v.test(repositoryPath)) {
			for (const match of collectMatches(source, browserDefaultPattern)) {
				componentBrowserDefaults.push({
					prop: match[1],
					defaultValue: match[2],
					path: repositoryPath,
				});
			}
		}
	}

	exports.sort((left, right) => left.path.localeCompare(right.path) || left.name.localeCompare(right.name));
	localHelpers.sort((left, right) => left.path.localeCompare(right.path) || left.name.localeCompare(right.name));
	componentBrowserDefaults.sort((left, right) => left.path.localeCompare(right.path) || left.prop.localeCompare(right.prop));

	const index = {
		generatedBy: 'scripts/generate-primitive-index.mjs',
		purpose: 'Machine-readable repo map for metronome agents. Use before adding helpers, services, controllers, adapters, or view-models.',
		counts: {
			filesScanned: files.length,
			exports: exports.length,
			localHelpers: localHelpers.length,
			componentBrowserDefaults: componentBrowserDefaults.length,
		},
		exports,
		localHelpers,
		componentBrowserDefaults,
	};

	await mkdir(generatedDirectory, {recursive: true});
	await writeFile(`${outputPath}\n`, JSON.stringify(index, null, 2));
	console.log(`Wrote ${toRepositoryPath(outputPath)} with ${exports.length} exports, ${localHelpers.length} local helper candidates, and ${componentBrowserDefaults.length} browser defaults.`);
}

await main();
