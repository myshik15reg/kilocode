import { mcpHttpFetch } from "../mcp/oauth/mcpHttpFetch"

export interface WebSearchResultItem {
	title: string
	url: string
	snippet: string
	source: "online" | "offline"
}

export type WebSearchMode = "auto" | "explicit"
export type WebSearchTraceOutcome = "success" | "empty" | "error" | "skipped"

export interface WebSearchFallbackTraceEntry {
	provider: string
	outcome: WebSearchTraceOutcome
	detail?: string
}

export interface WebSearchResponse {
	query: string
	provider: string
	mode: WebSearchMode
	durationSeconds: number
	online: boolean
	summary: string
	results: WebSearchResultItem[]
	notice?: string
	fallbackTrace: WebSearchFallbackTraceEntry[]
}

export interface WebSearchProviderConfig {
	firecrawlApiKey?: string
	tavilyApiKey?: string
	exaApiKey?: string
}

export interface WebSearchRequestOptions {
	provider?: string
	config?: Partial<WebSearchProviderConfig> | null
}

export interface WebSearchProviderContext {
	query: string
	limit: number
	config: WebSearchProviderConfig
	fetchImpl: typeof fetch
	signal: AbortSignal
}

export interface WebSearchProviderResult {
	results: WebSearchResultItem[]
}

export interface WebSearchProvider {
	name: string
	auto?: boolean
	isConfigured?: (context: Pick<WebSearchProviderContext, "config">) => boolean
	search: (context: WebSearchProviderContext) => Promise<WebSearchProviderResult>
}

type SearchTopicLeaf = {
	Text?: string
	FirstURL?: string
}

type SearchTopicGroup = {
	Name?: string
	Topics?: SearchTopicLeaf[]
}

type DuckDuckGoSearchResponse = {
	AbstractText?: string
	AbstractURL?: string
	Heading?: string
	RelatedTopics?: Array<SearchTopicLeaf | SearchTopicGroup>
}

type FirecrawlSearchItem = {
	title?: string
	url?: string
	description?: string
	snippet?: string
	markdown?: string
}

type FirecrawlSearchResponse = {
	success?: boolean
	error?: string
	data?: {
		web?: FirecrawlSearchItem[]
	}
}

type TavilySearchItem = {
	title?: string
	url?: string
	content?: string
	raw_content?: string
}

type TavilySearchResponse = {
	results?: TavilySearchItem[]
}

type ExaSearchItem = {
	title?: string
	url?: string
	highlights?: string[]
	text?: string
}

type ExaSearchResponse = {
	results?: ExaSearchItem[]
}

export const WEB_SEARCH_TIMEOUT_MS = 3_500
export const WEB_SEARCH_RESULT_LIMIT = 5
export const WEB_SEARCH_AUTO_PROVIDER_ORDER = ["firecrawl", "tavily", "exa", "duckduckgo"] as const

export type BuiltInWebSearchProviderName = (typeof WEB_SEARCH_AUTO_PROVIDER_ORDER)[number]

interface WebSearchBrokerOptions {
	fetchImpl?: typeof fetch
	providers?: WebSearchProvider[]
	timeoutMs?: number
	env?: Record<string, string | undefined>
}

function coerceNonEmptyString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
}

function isTopicLeaf(topic: SearchTopicLeaf | SearchTopicGroup): topic is SearchTopicLeaf {
	return "Text" in topic || "FirstURL" in topic
}

function toDurationSeconds(startedAt: number): number {
	return Number(((Date.now() - startedAt) / 1_000).toFixed(3))
}

function isDefined<T>(value: T | undefined): value is T {
	return value !== undefined
}

function describeError(error: unknown): string {
	if (error instanceof Error) {
		return error.message
	}

	return typeof error === "string" ? error : "Unknown error"
}

function normalizeProviderName(provider: string | undefined): string | undefined {
	const normalized = coerceNonEmptyString(provider)?.toLowerCase()
	return normalized === "auto" ? undefined : normalized
}

function createSearchSummary(query: string, provider: string, results: WebSearchResultItem[], online: boolean): string {
	const prefix = online
		? `Web search summary for "${query}" via ${provider}:`
		: `Offline fallback summary for "${query}":`
	const topResults = results
		.slice(0, 3)
		.map((item) => `${item.title} - ${item.snippet}`)
		.join(" | ")

	return `${prefix} ${topResults}`.slice(0, 900)
}

function createOfflineFallbackResult(query: string): WebSearchResultItem {
	return {
		title: "Offline fallback",
		url: "offline://search-unavailable",
		snippet: `Internet search is unavailable for "${query}". Fall back to local tools such as codebase_search, search_files, read_file, browser_action against already-open pages, or configured MCP resources.`,
		source: "offline",
	}
}

function extractTitle(text: string): string {
	const separatorIndex = text.indexOf(" - ")
	return separatorIndex > 0 ? text.slice(0, separatorIndex) : text.slice(0, 80)
}

function limitSnippet(text: string | undefined): string {
	const normalized = coerceNonEmptyString(text) ?? "No snippet available"
	return normalized.slice(0, 400)
}

function assertResponseOk(response: Response, provider: string): void {
	if (!response.ok) {
		throw new Error(`${provider} responded with HTTP ${response.status}`)
	}
}

async function searchWithFirecrawl(context: WebSearchProviderContext): Promise<WebSearchProviderResult> {
	const response = await context.fetchImpl("https://api.firecrawl.dev/v2/search", {
		method: "POST",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${context.config.firecrawlApiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			query: context.query,
			limit: context.limit,
		}),
		signal: context.signal,
	})

	assertResponseOk(response, "firecrawl")

	const payload = (await response.json()) as FirecrawlSearchResponse
	if (payload.success === false) {
		throw new Error(payload.error || "Firecrawl search failed")
	}

	const rawResults = Array.isArray(payload.data?.web) ? payload.data.web : []
	return {
		results: rawResults
			.map((item) => {
				const url = coerceNonEmptyString(item.url)
				if (!url) {
					return undefined
				}

				return {
					title: coerceNonEmptyString(item.title) || url,
					url,
					snippet: limitSnippet(item.description || item.snippet || item.markdown),
					source: "online" as const,
				}
			})
			.filter(isDefined)
			.slice(0, context.limit),
	}
}

async function searchWithTavily(context: WebSearchProviderContext): Promise<WebSearchProviderResult> {
	const response = await context.fetchImpl("https://api.tavily.com/search", {
		method: "POST",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${context.config.tavilyApiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			query: context.query,
			max_results: context.limit,
			search_depth: "basic",
		}),
		signal: context.signal,
	})

	assertResponseOk(response, "tavily")

	const payload = (await response.json()) as TavilySearchResponse
	const rawResults = Array.isArray(payload.results) ? payload.results : []
	return {
		results: rawResults
			.map((item) => {
				const url = coerceNonEmptyString(item.url)
				if (!url) {
					return undefined
				}

				return {
					title: coerceNonEmptyString(item.title) || url,
					url,
					snippet: limitSnippet(item.content || item.raw_content),
					source: "online" as const,
				}
			})
			.filter(isDefined)
			.slice(0, context.limit),
	}
}

async function searchWithExa(context: WebSearchProviderContext): Promise<WebSearchProviderResult> {
	const response = await context.fetchImpl("https://api.exa.ai/search", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			"x-api-key": context.config.exaApiKey || "",
		},
		body: JSON.stringify({
			query: context.query,
			type: "auto",
			numResults: context.limit,
			contents: {
				highlights: {
					maxCharacters: 400,
				},
			},
		}),
		signal: context.signal,
	})

	assertResponseOk(response, "exa")

	const payload = (await response.json()) as ExaSearchResponse
	const rawResults = Array.isArray(payload.results) ? payload.results : []
	return {
		results: rawResults
			.map((item) => {
				const url = coerceNonEmptyString(item.url)
				if (!url) {
					return undefined
				}

				const highlights = Array.isArray(item.highlights) ? item.highlights.join(" ") : undefined
				return {
					title: coerceNonEmptyString(item.title) || url,
					url,
					snippet: limitSnippet(highlights || item.text),
					source: "online" as const,
				}
			})
			.filter(isDefined)
			.slice(0, context.limit),
	}
}

async function searchWithDuckDuckGo(context: WebSearchProviderContext): Promise<WebSearchProviderResult> {
	const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(context.query)}&format=json&no_redirect=1&no_html=1&skip_disambig=0`
	const response = await context.fetchImpl(url, {
		headers: {
			Accept: "application/json",
			"User-Agent": "AlfaCode-WorkflowAI/1.0",
		},
		signal: context.signal,
	})

	assertResponseOk(response, "duckduckgo")

	const payload = (await response.json()) as DuckDuckGoSearchResponse
	const flattened: WebSearchResultItem[] = []

	if (payload.AbstractText && payload.AbstractURL) {
		flattened.push({
			title: payload.Heading || "Abstract",
			url: payload.AbstractURL,
			snippet: limitSnippet(payload.AbstractText),
			source: "online",
		})
	}

	for (const topic of payload.RelatedTopics || []) {
		if ("Topics" in topic && Array.isArray(topic.Topics)) {
			for (const nested of topic.Topics) {
				if (nested.Text && nested.FirstURL) {
					flattened.push({
						title: extractTitle(nested.Text),
						url: nested.FirstURL,
						snippet: limitSnippet(nested.Text),
						source: "online",
					})
				}
			}
			continue
		}

		if (isTopicLeaf(topic) && topic.Text && topic.FirstURL) {
			flattened.push({
				title: extractTitle(topic.Text),
				url: topic.FirstURL,
				snippet: limitSnippet(topic.Text),
				source: "online",
			})
		}
	}

	return {
		results: flattened.slice(0, context.limit),
	}
}

function createDefaultProviders(): WebSearchProvider[] {
	return [
		{
			name: "firecrawl",
			isConfigured: ({ config }) => Boolean(coerceNonEmptyString(config.firecrawlApiKey)),
			search: searchWithFirecrawl,
		},
		{
			name: "tavily",
			isConfigured: ({ config }) => Boolean(coerceNonEmptyString(config.tavilyApiKey)),
			search: searchWithTavily,
		},
		{
			name: "exa",
			isConfigured: ({ config }) => Boolean(coerceNonEmptyString(config.exaApiKey)),
			search: searchWithExa,
		},
		{
			name: "duckduckgo",
			search: searchWithDuckDuckGo,
		},
	]
}

export class WebSearchBroker {
	private readonly fetchImpl: typeof fetch
	private readonly providers: WebSearchProvider[]
	private readonly timeoutMs: number
	private readonly env: Record<string, string | undefined>

	constructor(options: WebSearchBrokerOptions = {}) {
		this.fetchImpl = options.fetchImpl ?? mcpHttpFetch
		this.providers = options.providers ?? createDefaultProviders()
		this.timeoutMs = options.timeoutMs ?? WEB_SEARCH_TIMEOUT_MS
		this.env = options.env ?? (process.env as Record<string, string | undefined>)
	}

	async search(query: string, options: WebSearchRequestOptions = {}): Promise<WebSearchResponse> {
		const normalizedQuery = query.trim()
		const provider = normalizeProviderName(options.provider)
		const mode: WebSearchMode = provider ? "explicit" : "auto"
		const startedAt = Date.now()
		const trace: WebSearchFallbackTraceEntry[] = []
		const config = this.resolveConfig(options.config)

		if (provider) {
			return this.searchWithExplicitProvider(normalizedQuery, provider, config, mode, startedAt)
		}

		return this.searchWithAutoChain(normalizedQuery, config, mode, startedAt, trace)
	}

	private resolveConfig(overrides?: Partial<WebSearchProviderConfig> | null): WebSearchProviderConfig {
		return {
			firecrawlApiKey:
				coerceNonEmptyString(overrides?.firecrawlApiKey) ||
				coerceNonEmptyString(this.env.FIRECRAWL_API_KEY) ||
				coerceNonEmptyString(this.env.FIRECRAWL_KEY),
			tavilyApiKey:
				coerceNonEmptyString(overrides?.tavilyApiKey) ||
				coerceNonEmptyString(this.env.TAVILY_API_KEY) ||
				coerceNonEmptyString(this.env.TAVILY_KEY),
			exaApiKey:
				coerceNonEmptyString(overrides?.exaApiKey) ||
				coerceNonEmptyString(this.env.EXA_API_KEY) ||
				coerceNonEmptyString(this.env.EXA_KEY),
		}
	}

	private getProvider(name: string): WebSearchProvider | undefined {
		return this.providers.find((provider) => provider.name.toLowerCase() === name)
	}

	private async searchWithExplicitProvider(
		query: string,
		providerName: string,
		config: WebSearchProviderConfig,
		mode: WebSearchMode,
		startedAt: number,
	): Promise<WebSearchResponse> {
		const provider = this.getProvider(providerName)
		if (!provider) {
			throw new Error(`Unknown web search provider "${providerName}".`)
		}

		if (provider.isConfigured && !provider.isConfigured({ config })) {
			throw new Error(`Web search provider "${providerName}" is not configured.`)
		}

		let providerResult: WebSearchProviderResult
		try {
			providerResult = await this.executeProvider(provider, query, config)
		} catch (error) {
			throw new Error(`Web search provider "${providerName}" failed: ${describeError(error)}`)
		}

		if (providerResult.results.length === 0) {
			throw new Error(`Web search provider "${providerName}" returned no results.`)
		}

		return this.buildSuccessResponse(query, provider.name, mode, startedAt, providerResult.results, [
			{ provider: provider.name, outcome: "success" },
		])
	}

	private async searchWithAutoChain(
		query: string,
		config: WebSearchProviderConfig,
		mode: WebSearchMode,
		startedAt: number,
		trace: WebSearchFallbackTraceEntry[],
	): Promise<WebSearchResponse> {
		const providers = this.providers.filter((provider) => provider.auto !== false)

		for (const provider of providers) {
			if (provider.isConfigured && !provider.isConfigured({ config })) {
				trace.push({
					provider: provider.name,
					outcome: "skipped",
					detail: "not configured",
				})
				continue
			}

			try {
				const providerResult = await this.executeProvider(provider, query, config)
				if (providerResult.results.length === 0) {
					trace.push({ provider: provider.name, outcome: "empty" })
					continue
				}

				trace.push({ provider: provider.name, outcome: "success" })
				const notice =
					trace.length > 1
						? `Auto fallback used ${provider.name} after earlier providers failed or returned no results.`
						: undefined
				return this.buildSuccessResponse(
					query,
					provider.name,
					mode,
					startedAt,
					providerResult.results,
					trace,
					notice,
				)
			} catch (error) {
				trace.push({
					provider: provider.name,
					outcome: "error",
					detail: describeError(error),
				})
			}
		}

		return this.buildOfflineFallback(query, mode, startedAt, trace)
	}

	private async executeProvider(
		provider: WebSearchProvider,
		query: string,
		config: WebSearchProviderConfig,
	): Promise<WebSearchProviderResult> {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

		try {
			return await provider.search({
				query,
				limit: WEB_SEARCH_RESULT_LIMIT,
				config,
				fetchImpl: this.fetchImpl,
				signal: controller.signal,
			})
		} finally {
			clearTimeout(timeoutId)
		}
	}

	private buildSuccessResponse(
		query: string,
		provider: string,
		mode: WebSearchMode,
		startedAt: number,
		results: WebSearchResultItem[],
		fallbackTrace: WebSearchFallbackTraceEntry[],
		notice?: string,
	): WebSearchResponse {
		return {
			query,
			provider,
			mode,
			durationSeconds: toDurationSeconds(startedAt),
			online: true,
			notice,
			summary: createSearchSummary(query, provider, results, true),
			results,
			fallbackTrace,
		}
	}

	private buildOfflineFallback(
		query: string,
		mode: WebSearchMode,
		startedAt: number,
		fallbackTrace: WebSearchFallbackTraceEntry[],
	): WebSearchResponse {
		const offlineResult = createOfflineFallbackResult(query)
		return {
			query,
			provider: "offline",
			mode,
			durationSeconds: toDurationSeconds(startedAt),
			online: false,
			notice: "No configured web search provider returned results; using offline fallback.",
			summary: createSearchSummary(query, "offline", [offlineResult], false),
			results: [offlineResult],
			fallbackTrace,
		}
	}
}

export const webSearchBroker = new WebSearchBroker()
