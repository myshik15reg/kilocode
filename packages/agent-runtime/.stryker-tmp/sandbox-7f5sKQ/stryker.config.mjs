/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
// @ts-nocheck

export default {
	packageManager: 'pnpm',
	testRunner: 'vitest',
	reporters: ['clear-text', 'html', 'progress'],
	coverageAnalysis: 'off',
	mutate: ['src/utils/safe-stringify.ts'],
	vitest: {
		configFile: 'vitest.config.ts',
		enableFindRelatedTests: false,
	},
	thresholds: {
		high: 100,
		low: 100,
		break: 100,
	},
	tempDirName: '.stryker-tmp',
};
