// kilocode_change - new file
import { mcpHttpFetch } from "../mcp/oauth/mcpHttpFetch"

export interface WebSearchResultItem {
	title: string
	url: string
	snippet: string
	source: "online" | "offline"
}

export interface WebSearchResponse {
	query: string
	online: boolean
	summary: string
	results: WebSearchResultItem[]
	notice?: string
}

type SearchTopicLeaf = {
	Text?: string
	FirstURL?: string
}

type SearchTopicGroup = {
	Name?: string
	Topics?: SearchTopicLeaf[]
}

type SearchProviderResponse = {
	AbstractText?: string
	AbstractURL?: string
	Heading?: string
	RelatedTopics?: Array<SearchTopicLeaf | SearchTopicGroup>
}

// kilocode_change start
const WEB_SEARCH_TIMEOUT_MS = 3_500
// kilocode_change end

function isTopicLeaf(topic: SearchTopicLeaf | SearchTopicGroup): topic is SearchTopicLeaf {
	return "Text" in topic || "FirstURL" in topic
}

export class WebSearchBroker {
	constructor(private readonly fetchImpl: typeof fetch = mcpHttpFetch) {}

	async search(query: string): Promise<WebSearchResponse> {
		const normalizedQuery = query.trim()
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), WEB_SEARCH_TIMEOUT_MS)
		try {
			const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(normalizedQuery)}&format=json&no_redirect=1&no_html=1&skip_disambig=0`
			const response = await this.fetchImpl(url, {
				headers: {
					Accept: "application/json",
					"User-Agent": "AlfaCode-WorkflowAI/1.0",
				},
				signal: controller.signal,
			})

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`)
			}

			const payload = (await response.json()) as SearchProviderResponse
			const results = this.extractResults(payload)
			if (results.length === 0) {
				return this.buildOfflineFallback(normalizedQuery, "No online search results were returned")
			}

			return {
				query: normalizedQuery,
				online: true,
				summary: this.buildSummary(normalizedQuery, results, true),
				results,
			}
		} catch (error) {
			return this.buildOfflineFallback(normalizedQuery, this.buildFallbackNotice(error))
		} finally {
			clearTimeout(timeoutId)
		}
	}

	private extractResults(payload: SearchProviderResponse): WebSearchResultItem[] {
		const flattened: WebSearchResultItem[] = []

		if (payload.AbstractText && payload.AbstractURL) {
			flattened.push({
				title: payload.Heading || "Abstract",
				url: payload.AbstractURL,
				snippet: payload.AbstractText,
				source: "online",
			})
		}

		for (const topic of payload.RelatedTopics || []) {
			if ("Topics" in topic && Array.isArray(topic.Topics)) {
				for (const nested of topic.Topics) {
					if (nested.Text && nested.FirstURL) {
						flattened.push({
							title: this.extractTitle(nested.Text),
							url: nested.FirstURL,
							snippet: nested.Text,
							source: "online",
						})
					}
				}
				continue
			}

			if (isTopicLeaf(topic) && topic.Text && topic.FirstURL) {
				flattened.push({
					title: this.extractTitle(topic.Text),
					url: topic.FirstURL,
					snippet: topic.Text,
					source: "online",
				})
			}
		}

		return flattened.slice(0, 5)
	}

	private buildFallbackNotice(error: unknown): string {
		if (error instanceof Error && error.name === "AbortError") {
			return "Web search timed out; using offline fallback"
		}

		return "No internet connection or the search provider is unavailable"
	}

	private buildOfflineFallback(query: string, notice: string): WebSearchResponse {
		const offlineResult: WebSearchResultItem = {
			title: "Offline fallback",
			url: "offline://search-unavailable",
			snippet: `Internet search is unavailable for "${query}". Fall back to local tools such as codebase_search, search_files, read_file, browser_action against already-open pages, or configured MCP resources.`,
			source: "offline",
		}

		return {
			query,
			online: false,
			notice,
			summary: this.buildSummary(query, [offlineResult], false),
			results: [offlineResult],
		}
	}

	private buildSummary(query: string, results: WebSearchResultItem[], online: boolean): string {
		const top = results.slice(0, 3)
		const prefix = online ? `Web search summary for "${query}":` : `Offline fallback summary for "${query}":`
		return `${prefix} ${top.map((item) => `${item.title} — ${item.snippet}`).join(" | ")}`.slice(0, 900)
	}

	private extractTitle(text: string): string {
		const separatorIndex = text.indexOf(" - ")
		return separatorIndex > 0 ? text.slice(0, separatorIndex) : text.slice(0, 80)
	}
}

export const webSearchBroker = new WebSearchBroker()
