/**
 * Safe JSON stringification utility that handles circular references,
 * Error objects, and other special types.
 */
// @ts-nocheck

/**
 * Serialize an error object to a plain object with all relevant properties
 */ function stryNS_9fa48() {
	var g =
		(typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
		new Function("return this")()
	var ns = g.__stryker__ || (g.__stryker__ = {})
	if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
		ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__
	}
	function retrieveNS() {
		return ns
	}
	stryNS_9fa48 = retrieveNS
	return retrieveNS()
}
stryNS_9fa48()
function stryCov_9fa48() {
	var ns = stryNS_9fa48()
	var cov =
		ns.mutantCoverage ||
		(ns.mutantCoverage = {
			static: {},
			perTest: {},
		})
	function cover() {
		var c = cov.static
		if (ns.currentTestId) {
			c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {}
		}
		var a = arguments
		for (var i = 0; i < a.length; i++) {
			c[a[i]] = (c[a[i]] || 0) + 1
		}
	}
	stryCov_9fa48 = cover
	cover.apply(null, arguments)
}
function stryMutAct_9fa48(id) {
	var ns = stryNS_9fa48()
	function isActive(id) {
		if (ns.activeMutant === id) {
			if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
				throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")")
			}
			return true
		}
		return false
	}
	stryMutAct_9fa48 = isActive
	return isActive(id)
}
function serializeError(error: Error): Record<string, unknown> {
	if (stryMutAct_9fa48("0")) {
		{
		}
	} else {
		stryCov_9fa48("0")
		return stryMutAct_9fa48("1")
			? {}
			: (stryCov_9fa48("1"),
				{
					message: error.message,
					name: error.name,
					stack: error.stack,
					// Include any additional enumerable properties
					...(stryMutAct_9fa48("2")
						? Object.getOwnPropertyNames(error).reduce(
								(acc, key) => {
									acc[key] = (error as unknown as Record<string, unknown>)[key]
									return acc
								},
								{} as Record<string, unknown>,
							)
						: (stryCov_9fa48("2"),
							Object.getOwnPropertyNames(error)
								.filter(
									stryMutAct_9fa48("3")
										? () => undefined
										: (stryCov_9fa48("3"),
											(key) =>
												stryMutAct_9fa48("6")
													? (key !== "message" && key !== "name") || key !== "stack"
													: stryMutAct_9fa48("5")
														? false
														: stryMutAct_9fa48("4")
															? true
															: (stryCov_9fa48("4", "5", "6"),
																(stryMutAct_9fa48("8")
																	? key !== "message" || key !== "name"
																	: stryMutAct_9fa48("7")
																		? true
																		: (stryCov_9fa48("7", "8"),
																			(stryMutAct_9fa48("10")
																				? key === "message"
																				: stryMutAct_9fa48("9")
																					? true
																					: (stryCov_9fa48("9", "10"),
																						key !==
																							(stryMutAct_9fa48("11")
																								? ""
																								: (stryCov_9fa48("11"),
																									"message")))) &&
																				(stryMutAct_9fa48("13")
																					? key === "name"
																					: stryMutAct_9fa48("12")
																						? true
																						: (stryCov_9fa48("12", "13"),
																							key !==
																								(stryMutAct_9fa48("14")
																									? ""
																									: (stryCov_9fa48(
																											"14",
																										),
																										"name")))))) &&
																	(stryMutAct_9fa48("16")
																		? key === "stack"
																		: stryMutAct_9fa48("15")
																			? true
																			: (stryCov_9fa48("15", "16"),
																				key !==
																					(stryMutAct_9fa48("17")
																						? ""
																						: (stryCov_9fa48("17"),
																							"stack")))))),
								)
								.reduce(
									(acc, key) => {
										if (stryMutAct_9fa48("18")) {
											{
											}
										} else {
											stryCov_9fa48("18")
											acc[key] = (error as unknown as Record<string, unknown>)[key]
											return acc
										}
									},
									{} as Record<string, unknown>,
								))),
				})
	}
}

/**
 * Safe stringify that handles circular references, Error objects, Dates, RegExp, etc.
 * Returns a serializable version of the object.
 */
export function safeStringify(obj: unknown, seen = new WeakSet()): unknown {
	if (stryMutAct_9fa48("19")) {
		{
		}
	} else {
		stryCov_9fa48("19")
		// Handle primitives
		if (
			stryMutAct_9fa48("22")
				? obj === null && typeof obj !== "object"
				: stryMutAct_9fa48("21")
					? false
					: stryMutAct_9fa48("20")
						? true
						: (stryCov_9fa48("20", "21", "22"),
							(stryMutAct_9fa48("24")
								? obj !== null
								: stryMutAct_9fa48("23")
									? false
									: (stryCov_9fa48("23", "24"), obj === null)) ||
								(stryMutAct_9fa48("26")
									? typeof obj === "object"
									: stryMutAct_9fa48("25")
										? false
										: (stryCov_9fa48("25", "26"),
											typeof obj !==
												(stryMutAct_9fa48("27") ? "" : (stryCov_9fa48("27"), "object")))))
		) {
			if (stryMutAct_9fa48("28")) {
				{
				}
			} else {
				stryCov_9fa48("28")
				return obj
			}
		}

		// Handle circular references
		if (
			stryMutAct_9fa48("30")
				? false
				: stryMutAct_9fa48("29")
					? true
					: (stryCov_9fa48("29", "30"), seen.has(obj as object))
		) {
			if (stryMutAct_9fa48("31")) {
				{
				}
			} else {
				stryCov_9fa48("31")
				return stryMutAct_9fa48("32") ? "" : (stryCov_9fa48("32"), "[Circular]")
			}
		}

		// Handle Error objects
		if (
			stryMutAct_9fa48("34")
				? false
				: stryMutAct_9fa48("33")
					? true
					: (stryCov_9fa48("33", "34"), obj instanceof Error)
		) {
			if (stryMutAct_9fa48("35")) {
				{
				}
			} else {
				stryCov_9fa48("35")
				return serializeError(obj)
			}
		}

		// Handle arrays
		if (
			stryMutAct_9fa48("37")
				? false
				: stryMutAct_9fa48("36")
					? true
					: (stryCov_9fa48("36", "37"), Array.isArray(obj))
		) {
			if (stryMutAct_9fa48("38")) {
				{
				}
			} else {
				stryCov_9fa48("38")
				seen.add(obj)
				const result = obj.map(
					stryMutAct_9fa48("39")
						? () => undefined
						: (stryCov_9fa48("39"), (item) => safeStringify(item, seen)),
				)
				seen.delete(obj)
				return result
			}
		}

		// Handle Date objects
		if (
			stryMutAct_9fa48("41")
				? false
				: stryMutAct_9fa48("40")
					? true
					: (stryCov_9fa48("40", "41"), obj instanceof Date)
		) {
			if (stryMutAct_9fa48("42")) {
				{
				}
			} else {
				stryCov_9fa48("42")
				return obj.toISOString()
			}
		}

		// Handle RegExp objects
		if (
			stryMutAct_9fa48("44")
				? false
				: stryMutAct_9fa48("43")
					? true
					: (stryCov_9fa48("43", "44"), obj instanceof RegExp)
		) {
			if (stryMutAct_9fa48("45")) {
				{
				}
			} else {
				stryCov_9fa48("45")
				return obj.toString()
			}
		}

		// Handle plain objects
		seen.add(obj)
		const result: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(obj)) {
			if (stryMutAct_9fa48("46")) {
				{
				}
			} else {
				stryCov_9fa48("46")
				try {
					if (stryMutAct_9fa48("47")) {
						{
						}
					} else {
						stryCov_9fa48("47")
						result[key] = safeStringify(value, seen)
					}
				} catch (_error) {
					if (stryMutAct_9fa48("48")) {
						{
						}
					} else {
						stryCov_9fa48("48")
						// If serialization fails for a property, mark it
						result[key] = stryMutAct_9fa48("49") ? "" : (stryCov_9fa48("49"), "[Serialization Error]")
					}
				}
			}
		}
		seen.delete(obj)
		return result
	}
}

/**
 * Convert an argument to a string representation, handling circular references
 * and special types. This is specifically designed for console logging.
 */
export function argToString(arg: unknown): string {
	if (stryMutAct_9fa48("50")) {
		{
		}
	} else {
		stryCov_9fa48("50")
		if (
			stryMutAct_9fa48("53")
				? typeof arg !== "string"
				: stryMutAct_9fa48("52")
					? false
					: stryMutAct_9fa48("51")
						? true
						: (stryCov_9fa48("51", "52", "53"),
							typeof arg === (stryMutAct_9fa48("54") ? "" : (stryCov_9fa48("54"), "string")))
		) {
			if (stryMutAct_9fa48("55")) {
				{
				}
			} else {
				stryCov_9fa48("55")
				return arg
			}
		}
		try {
			if (stryMutAct_9fa48("56")) {
				{
				}
			} else {
				stryCov_9fa48("56")
				const safe = safeStringify(arg)
				return JSON.stringify(safe)
			}
		} catch (_error) {
			if (stryMutAct_9fa48("57")) {
				{
				}
			} else {
				stryCov_9fa48("57")
				// Fallback if even safe stringify fails
				return stryMutAct_9fa48("58") ? "" : (stryCov_9fa48("58"), "[Unable to stringify]")
			}
		}
	}
}

/**
 * Convert multiple arguments to a single string message, handling circular references
 */
export function argsToMessage(args: unknown[]): string {
	if (stryMutAct_9fa48("59")) {
		{
		}
	} else {
		stryCov_9fa48("59")
		return args.map(argToString).join(stryMutAct_9fa48("60") ? "" : (stryCov_9fa48("60"), " "))
	}
}
