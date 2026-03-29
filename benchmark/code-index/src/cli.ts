import { Command } from "commander"

import { loadConfigFromFile } from "./config.js"
import { createLogger } from "./logger.js"

import { runIndex } from "./commands/index.js"
import { runUpdate } from "./commands/update.js"
import { runEval } from "./commands/eval.js"
import { runReport } from "./commands/report.js"

const program = new Command()

program
	.name("code-index-benchmark")
	.description("Benchmark: chunking + embeddings (BGE) + Qdrant + Neo4j")
	.option("-c, --config <path>", "Path to pipeline config JSON")
	.option("--log-level <level>", "Log level", "info")
	.option("--no-pretty", "Disable pretty logs")
	.option("--out <dir>", "Output directory for artifacts", "benchmark/code-index/runs")

program
	.command("index")
	.description("Build index from scratch")
	.option("--reset", "Drop existing Qdrant collection and clear Neo4j")
	.option("--max-files <n>", "Limit number of files", (v) => Number(v))
	.action(async (opts) => {
		const { config: configPath, logLevel, pretty, out } = program.opts()
		if (!configPath) throw new Error("--config is required")
		const cfg = loadConfigFromFile(configPath)
		const logger = createLogger(logLevel, Boolean(pretty))
		await runIndex({ cfg, logger, outDir: out, reset: Boolean(opts.reset), maxFiles: opts.maxFiles })
	})

program
	.command("update")
	.description("Incremental update (add/delete/rename/modify)")
	.option("--state <path>", "State file path", "benchmark/code-index/state.json")
	.option("--max-files <n>", "Limit number of files", (v) => Number(v))
	.action(async (opts) => {
		const { config: configPath, logLevel, pretty, out } = program.opts()
		if (!configPath) throw new Error("--config is required")
		const cfg = loadConfigFromFile(configPath)
		const logger = createLogger(logLevel, Boolean(pretty))
		await runUpdate({ cfg, logger, outDir: out, statePath: opts.state, maxFiles: opts.maxFiles })
	})

program
	.command("eval")
	.description("Run query pack and compute Recall@k / nDCG@k / MRR")
	.requiredOption("--queries <path>", "Query pack JSON path")
	.action(async (opts) => {
		const { config: configPath, logLevel, pretty, out } = program.opts()
		if (!configPath) throw new Error("--config is required")
		const cfg = loadConfigFromFile(configPath)
		const logger = createLogger(logLevel, Boolean(pretty))
		await runEval({ cfg, logger, outDir: out, queryPackPath: opts.queries })
	})

program
	.command("report")
	.description("Aggregate run artifacts into report.md/report.json")
	.requiredOption("--runs <dir>", "Runs root directory")
	.option("--out <path>", "Report output markdown", "benchmark/code-index/report.md")
	.option("--json <path>", "Report output json", "benchmark/code-index/report.json")
	.action(async (opts) => {
		const { logLevel, pretty } = program.opts()
		const logger = createLogger(logLevel, Boolean(pretty))
		await runReport({ logger, runsDir: opts.runs, outMd: opts.out, outJson: opts.json })
	})

await program.parseAsync(process.argv)
