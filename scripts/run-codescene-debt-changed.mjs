#!/usr/bin/env node

import {spawnSync} from 'node:child_process';
import process from 'node:process';

const baseRef = process.env.BASE_REF;
const headRef = process.env.HEAD_REF;
const accessToken = [
    'CS_ACCESS_TOKEN',
    'CODESCENE_ACCESS_TOKEN',
].reduce((found, name) => found || process.env[name], '');

if (!accessToken || accessToken.trim() === '') {
    console.error('Missing CS_ACCESS_TOKEN environment variable (or alias).');
    console.error('Set one of: CS_ACCESS_TOKEN, CODESCENE_ACCESS_TOKEN in repository secrets and rerun.');
    process.exit(1);
}

process.env.CS_ACCESS_TOKEN = accessToken;

if (!baseRef || !headRef) {
    console.error('Missing BASE_REF or HEAD_REF environment variable.');
    process.exit(1);
}

const onPremUrl = [
    'CS_ONPREM_URL',
    'CODESCENE_ONPREM_URL',
    'CS_ONPREM_URL_OVERRIDE',
].reduce((found, name) => found || process.env[name], '');

if (onPremUrl && onPremUrl.trim() !== '') {
    process.env.CS_ONPREM_URL = onPremUrl;
}

if (!process.env.CS_ACCESS_TOKEN) {
    console.error('Failed to map provided token to CS_ACCESS_TOKEN.');
    process.exit(1);
}

const command = 'cs';
const args = ['delta', baseRef, headRef, '--output-format', 'json'];

const child = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Keep environment in case workflow sets platform URL or certs.
    env: process.env,
});

if (child.error) {
    console.error('Failed to execute CodeScene CLI (`cs`).');
    console.error(child.error instanceof Error ? child.error.message : String(child.error));
    process.exit(1);
}

const output = (child.stdout || '').trim();
const errorOutput = (child.stderr || '').trim();

if (!output) {
    if (errorOutput) {
        console.error(errorOutput);
    }

    console.error('CodeScene delta produced no JSON output.');
    process.exit(1);
}


let parsed;
try {
    parsed = JSON.parse(output);
} catch (error) {
    console.error('Failed to parse CodeScene JSON output.');
    console.error(error instanceof Error ? error.message : String(error));
    console.error(output);
    process.exit(1);
}

const result = parsed.result || {};
const qualityGates = result['quality-gates'] || {};
const failedGates = Object.entries(qualityGates).filter(([, value]) => value === true);

if (parsed.view) {
    console.log(`CodeScene delta view: ${parsed.view}`);
}

if (failedGates.length > 0) {
    console.error('CodeScene quality gates failed:');
    for (const [name] of failedGates) {
        console.error(`- ${name}`);
    }

    if (Array.isArray(result.warnings)) {
        console.error('Warnings:');
        for (const warning of result.warnings) {
            const details = warning.details || [];
            console.error(`- ${warning.category}: ${Array.isArray(details) ? details.join(', ') : details}`);
        }
    }

    process.exit(1);
}

console.log('CodeScene debt gates passed.');
if (child.status && child.status !== 0) {
    console.log(`cs delta exited with code ${child.status} but quality gates passed.`);
}

if (errorOutput) {
    console.warn(errorOutput);
}
