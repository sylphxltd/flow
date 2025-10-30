#!/usr/bin/env bun
/**
 * Build script for @sylphxltd/flow
 * Handles native module dependencies properly
 */

import { chmodSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { type BuildOutput, build } from 'bun';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';

const startTime = Date.now();

// Native dependencies that should not be bundled
const externalDeps = [
	'@huggingface/transformers',
	'onnxruntime-node',
	'onnxruntime-web',
	'onnxruntime-common',
	'sharp',
	'@lancedb/lancedb',
	'fsevents',
];

console.log(chalk.bold.cyan('\n⚡ Sylphx Flow Build\n'));

// Clean dist folder
const cleanSpinner = ora('Cleaning dist folder').start();
try {
	if (existsSync('./dist')) {
		rmSync('./dist', { recursive: true, force: true });
	}
	cleanSpinner.succeed('Cleaned dist folder');
} catch (error) {
	cleanSpinner.fail('Failed to clean dist folder');
	throw error;
}

// Build with Bun
const buildSpinner = ora('Building with Bun').start();
try {
	buildSpinner.text = `Building with Bun (${externalDeps.length} external deps)`;

	const result: BuildOutput = await build({
		entrypoints: ['./src/index.ts'],
		outdir: './dist',
		target: 'node',
		minify: true,
		splitting: true,
		external: externalDeps,
		sourcemap: 'external',
	});

	if (!result.success) {
		buildSpinner.fail('Build failed');
		process.exit(1);
	}

	buildSpinner.succeed(
		`Built ${chalk.cyan(result.outputs.length)} output files`,
	);
} catch (error) {
	buildSpinner.fail('Build error');
	console.error(chalk.red('\n'), error);
	process.exit(1);
}

// Make executable
const execSpinner = ora('Making index.js executable').start();
try {
	const indexPath = join('./dist', 'index.js');
	if (existsSync(indexPath)) {
		chmodSync(indexPath, '755');
		execSpinner.succeed('Made index.js executable');
	} else {
		execSpinner.warn('index.js not found');
	}
} catch (error) {
	execSpinner.fail('Failed to make executable');
	throw error;
}

// Success summary
const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(
	'\n' +
		boxen(
			chalk.green.bold('✓ Build complete!') +
				'\n\n' +
				chalk.dim(`Time: ${buildTime}s`) +
				'\n' +
				chalk.dim(`Target: node`) +
				'\n' +
				chalk.dim(`External deps: ${externalDeps.length}`),
			{
				padding: 1,
				margin: 0,
				borderStyle: 'round',
				borderColor: 'green',
			},
		) +
		'\n',
);

console.log(
	chalk.dim(
		'ℹ Native dependencies will be resolved from node_modules at runtime.\n',
	),
);
