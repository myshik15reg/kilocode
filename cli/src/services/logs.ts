import { appendFileSync } from "fs"
import * as fs from "fs-extra"
import * as path from "path"
import { KiloCodePaths } from "../utils/paths.js"

export type LogLevel = "info" | "debug" | "error" | "warn"

export interface LogEntry {
	id: string
	ts: number
	level: LogLevel
	message: string
	source?: string
	context?: Record<string, any>
}

export interface LogFilter {
	levels?: LogLevel[]
	source?: string
	since?: number
}

/**
 * Singleton service for managing application logs with enhanced metadata
 */
export class LogsService {
	private static instance: LogsService | null = null
	private logs: LogEntry[] = []
	private maxEntries: number = 1000
	private listeners: Array<(entry: LogEntry) => void> = []
	private originalConsole: {
		log: typeof console.log
		error: typeof console.error
		warn: typeof console.warn
		debug: typeof console.debug
		info: typeof console.info
	} | null = null
	private logFilePath: string
	private fileLoggingEnabled: boolean = true

	private constructor() {
		// Private constructor for singleton pattern
		// Store original console methods before any interception
		this.originalConsole = {
			log: console.log,
			error: console.error,
			warn: console.warn,
			debug: console.debug,
			info: console.info,
		}

		// Initialize file logging - use centralized logs directory
		this.logFilePath = path.join(KiloCodePaths.getLogsDir(), "cli.txt")
		// Initialize file logging asynchronously (don't await to avoid blocking constructor)
		this.initializeFileLogging().catch(() => {
			// Error handling is done within initializeFileLogging
		})
	}

	/**
	 * Get the singleton instance of LogsService
	 */
	public static getInstance(): LogsService {
		if (!LogsService.instance) {
			LogsService.instance = new LogsService()
		}
		return LogsService.instance
	}

	/**
	 * Add a log entry with the specified level
	 */
	private addLog(level: LogLevel, message: string, source?: string, context?: Record<string, any>): void {
		const entry: LogEntry = {
			id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			ts: Date.now(),
			level,
			message,
			...(source && { source }),
			...(context && { context }),
		}

		// Add to logs array
		this.logs.unshift(entry) // Add to beginning for newest-first order

		// Maintain max entries limit
		if (this.logs.length > this.maxEntries) {
			this.logs = this.logs.slice(0, this.maxEntries)
		}

		// Notify listeners
		this.listeners.forEach((listener) => listener(entry))

		// Write to file asynchronously (don't await to avoid blocking)
		this.writeToFile(entry).catch(() => {
			// Error handling is done within writeToFile
		})

		// Also output to console for development
		// this.outputToConsole(entry)
	}

	/**
	 * Output log entry to console with appropriate formatting
	 * Uses original console methods to avoid circular dependency
	 */
	private outputToConsole(entry: LogEntry): void {
		// GUARD: Prevent recursive logging by checking if we're already in a logging call
		if ((this as any)._isLogging) {
			return
		}

		// Use original console methods to prevent circular dependency
		if (!this.originalConsole) {
			// Fallback: if original console not available, skip console output
			return
		}

		// Set flag to prevent recursion
		;(this as any)._isLogging = true

		try {
			const ts = new Date(entry.ts).toISOString()
			const source = entry.source ? `[${entry.source}]` : ""
			const prefix = `${ts} ${source}`

			// DIAGNOSTIC: Check if our "original" console methods are actually original
			const isOriginalConsole = this.originalConsole.error.toString().includes("[native code]")
			if (!isOriginalConsole) {
				// Our "original" console is actually intercepted - skip to prevent loop
				return
			}

			switch (entry.level) {
				case "error":
					this.originalConsole.error(`${prefix} ERROR:`, entry.message, entry.context || "")
					break
				case "warn":
					this.originalConsole.warn(`${prefix} WARN:`, entry.message, entry.context || "")
					break
				case "debug":
					this.originalConsole.debug(`${prefix} DEBUG:`, entry.message, entry.context || "")
					break
				case "info":
				default:
					this.originalConsole.log(`${prefix} INFO:`, entry.message, entry.context || "")
					break
			}
		} finally {
			// Always clear the flag
			;(this as any)._isLogging = false
		}
	}

	/**
	 * Initialize file logging by ensuring the log directory exists
	 */
	private async initializeFileLogging(): Promise<void> {
		try {
			const logDir = path.dirname(this.logFilePath)
			await fs.ensureDir(logDir)
		} catch (error) {
			// Disable file logging if initialization fails
			this.fileLoggingEnabled = false
			// Use original console to avoid circular dependency
			if (this.originalConsole) {
				this.originalConsole.error("Failed to initialize file logging:", error)
			}
		}
	}

	/**
	 * Format log entry for file output (same format as outputToConsole)
	 */
	private formatLogEntryForFile(entry: LogEntry): string {
		const ts = new Date(entry.ts).toISOString()
		const source = entry.source ? `[${entry.source}]` : ""
		const prefix = `${ts} ${source}`
		const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : ""

		switch (entry.level) {
			case "error":
				return `${prefix} ERROR: ${entry.message}${contextStr}`
			case "warn":
				return `${prefix} WARN: ${entry.message}${contextStr}`
			case "debug":
				return `${prefix} DEBUG: ${entry.message}${contextStr}`
			case "info":
			default:
				return `${prefix} INFO: ${entry.message}${contextStr}`
		}
	}

	/**
	 * Write log entry to file asynchronously
	 */
	private async writeToFile(entry: LogEntry): Promise<void> {
		if (!this.fileLoggingEnabled) {
			return
		}

		try {
			// Ensure directory exists before writing (synchronous to avoid race conditions)
			const logDir = path.dirname(this.logFilePath)
			fs.ensureDirSync(logDir)

			const logLine = this.formatLogEntryForFile(entry) + "\n"
			appendFileSync(this.logFilePath, logLine, "utf8")
		} catch (error) {
			// Disable file logging on write errors to prevent spam
			this.fileLoggingEnabled = false
			// Use original console to avoid circular dependency
			if (this.originalConsole) {
				this.originalConsole.error("Failed to write to log file:", error)
			}
		}
	}

	/**
	 * Log an info message
	 */
	public info(message: string, source?: string, context?: Record<string, any>): void {
		this.addLog("info", message, source, context)
	}

	/**
	 * Log a debug message
	 */
	public debug(message: string, source?: string, context?: Record<string, any>): void {
		this.addLog("debug", message, source, context)
	}

	/**
	 * Log an error message
	 */
	public error(message: string, source?: string, context?: Record<string, any>): void {
		this.addLog("error", message, source, context)
	}

	/**
	 * Log a warning message
	 */
	public warn(message: string, source?: string, context?: Record<string, any>): void {
		this.addLog("warn", message, source, context)
	}

	/**
	 * Get all logs with optional filtering
	 */
	public getLogs(filter?: LogFilter): LogEntry[] {
		let filteredLogs = [...this.logs]

		if (filter) {
			if (filter.levels && filter.levels.length > 0) {
				filteredLogs = filteredLogs.filter((log) => filter.levels!.includes(log.level))
			}

			if (filter.source) {
				filteredLogs = filteredLogs.filter((log) => log.source?.includes(filter.source!))
			}

			if (filter.since) {
				filteredLogs = filteredLogs.filter((log) => log.ts >= filter.since!)
			}
		}

		return filteredLogs
	}

	/**
	 * Get logs count by level
	 */
	public getLogCounts(): Record<LogLevel, number> {
		const counts: Record<LogLevel, number> = {
			info: 0,
			debug: 0,
			error: 0,
			warn: 0,
		}

		this.logs.forEach((log) => {
			counts[log.level]++
		})

		return counts
	}

	/**
	 * Subscribe to new log entries
	 */
	public subscribe(listener: (entry: LogEntry) => void): () => void {
		this.listeners.push(listener)

		// Return unsubscribe function
		return () => {
			const index = this.listeners.indexOf(listener)
			if (index > -1) {
				this.listeners.splice(index, 1)
			}
		}
	}

	/**
	 * Clear all logs
	 */
	public clear(): void {
		this.logs = []
	}

	/**
	 * Set maximum number of log entries to keep
	 */
	public setMaxEntries(max: number): void {
		this.maxEntries = max
		if (this.logs.length > max) {
			this.logs = this.logs.slice(0, max)
		}
	}

	/**
	 * Get current configuration
	 */
	public getConfig(): { maxEntries: number; totalLogs: number; fileLoggingEnabled: boolean; logFilePath: string } {
		return {
			maxEntries: this.maxEntries,
			totalLogs: this.logs.length,
			fileLoggingEnabled: this.fileLoggingEnabled,
			logFilePath: this.logFilePath,
		}
	}

	/**
	 * Get the log file path
	 */
	public getLogFilePath(): string {
		return this.logFilePath
	}

	/**
	 * Check if file logging is enabled
	 */
	public isFileLoggingEnabled(): boolean {
		return this.fileLoggingEnabled
	}
}

// Export singleton instance for easy access
export const logs = LogsService.getInstance()
