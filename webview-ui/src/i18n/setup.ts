import i18next from "i18next"
import { initReactI18next } from "react-i18next"

// Build translations object
const translations: Record<string, Record<string, any>> = {}

const UNICODE_REPLACEMENT_CHARACTER = "\uFFFD"

export function hasCorruptedTranslations(value: unknown): boolean {
	if (typeof value === "string") {
		return value.includes(UNICODE_REPLACEMENT_CHARACTER)
	}

	if (Array.isArray(value)) {
		return value.some((item) => hasCorruptedTranslations(item))
	}

	if (value && typeof value === "object") {
		return Object.values(value).some((item) => hasCorruptedTranslations(item))
	}

	return false
}

function replaceCorruptedTranslations(value: unknown, fallbackValue: unknown): unknown {
	if (!hasCorruptedTranslations(value)) {
		return value
	}

	if (typeof value === "string") {
		return typeof fallbackValue === "string" ? fallbackValue : value
	}

	if (Array.isArray(value)) {
		const fallbackArray = Array.isArray(fallbackValue) ? fallbackValue : []
		return value.map((item, index) => replaceCorruptedTranslations(item, fallbackArray[index]))
	}

	if (value && typeof value === "object") {
		const fallbackObject =
			fallbackValue && typeof fallbackValue === "object" ? (fallbackValue as Record<string, unknown>) : {}

		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([key, item]) => [
				key,
				hasCorruptedTranslations(item) ? replaceCorruptedTranslations(item, fallbackObject[key]) : item,
			]),
		)
	}

	return value
}

export function resolveTranslationBundle(
	language: string,
	namespace: string,
	resources: unknown,
	allTranslations: Record<string, Record<string, any>>,
) {
	if (language === "en" || !hasCorruptedTranslations(resources)) {
		return resources
	}

	const fallbackResources = allTranslations.en?.[namespace]

	if (fallbackResources) {
		console.warn(
			`Detected corrupted translation entries in '${language}/${namespace}' and falling back to English only for affected values.`,
		)
		return replaceCorruptedTranslations(resources, fallbackResources)
	}

	console.warn(`Detected corrupted translation bundle '${language}/${namespace}', but no English fallback was found.`)
	return resources
}

// Dynamically load locale files
const localeFiles = import.meta.glob("./locales/**/*.json", { eager: true })

// Process all locale files
Object.entries(localeFiles).forEach(([path, module]) => {
	// Extract language and namespace from path
	// Example path: './locales/en/common.json' -> language: 'en', namespace: 'common'
	const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json/)

	if (match) {
		const [, language, namespace] = match

		// Initialize language object if it doesn't exist
		if (!translations[language]) {
			translations[language] = {}
		}

		// Add namespace resources to language
		translations[language][namespace] = (module as any).default || module
	}
})

console.log("Dynamically loaded translations:", Object.keys(translations))

// Initialize i18next for React
// This will be initialized with the VSCode language in TranslationProvider
i18next.use(initReactI18next).init({
	lng: "en", // Default language (will be overridden)
	fallbackLng: "en",
	debug: false,
	interpolation: {
		escapeValue: false, // React already escapes by default
	},
})

export function loadTranslations() {
	Object.entries(translations).forEach(([lang, namespaces]) => {
		try {
			Object.entries(namespaces).forEach(([namespace, resources]) => {
				const safeResources = resolveTranslationBundle(lang, namespace, resources, translations)
				i18next.addResourceBundle(lang, namespace, safeResources, true, true)
			})
		} catch (error) {
			console.warn(`Could not load ${lang} translations:`, error)
		}
	})
}

export default i18next
