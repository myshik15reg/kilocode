/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
// @ts-nocheck

export default {
	packageManager: 'pnpm',
	testRunner: 'command',
	commandRunner: {
		command: 'pnpm exec vitest run src/utils/__tests__/safe-stringify.test.ts',
	},
	reporters: ['clear-text', 'html', 'progress'],
	coverageAnalysis: 'off',
	mutate: ['src/utils/safe-stringify.ts'],
	thresholds: {
		high: 100,
		low: 100,
		break: 100,
	},
	concurrency: 2,
	tempDirName: '.stryker-tmp',
};
