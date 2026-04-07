import { render } from "@/utils/test-utils"

import TranslationProvider, { useAppTranslation } from "../TranslationContext"
import { hasCorruptedTranslations, resolveTranslationBundle } from "../setup"
import enSettings from "../locales/en/settings.json"
import ruSettings from "../locales/ru/settings.json"
import enKiloCode from "../locales/en/kilocode.json"
import ruKiloCode from "../locales/ru/kilocode.json"

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		language: "en",
	}),
}))

vi.mock("react-i18next", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-i18next")>()

	return {
		...actual,
		useTranslation: () => ({
			i18n: {
				t: (key: string, options?: Record<string, any>) => {
					// Mock specific translations used in tests
					if (key === "settings.autoApprove.title") return "Auto-Approve"
					if (key === "notifications.error") {
						return options?.message ? `Operation failed: ${options.message}` : "Operation failed"
					}
					return key
				},
				changeLanguage: vi.fn(),
				language: "en", // kilocode_change
				dir: () => "ltr", // kilocode_change
			},
		}),
	}
})

vi.mock("../setup", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../setup")>()

	return {
		...actual,
		default: {
			t: (key: string, options?: Record<string, any>) => {
				// Mock specific translations used in tests
				if (key === "settings.autoApprove.title") return "Auto-Approve"
				if (key === "notifications.error") {
					return options?.message ? `Operation failed: ${options.message}` : "Operation failed"
				}
				return key
			},
			changeLanguage: vi.fn(),
			language: "en", // kilocode_change
			dir: () => "ltr", // kilocode_change
		},
		loadTranslations: vi.fn(),
	}
})

const collectLeafPaths = (value: unknown, prefix = ""): string[] => {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
			collectLeafPaths(child, prefix ? `${prefix}.${key}` : key),
		)
	}

	return prefix ? [prefix] : []
}

const TestComponent = () => {
	const { t } = useAppTranslation()
	return (
		<div>
			<h1 data-testid="translation-test">{t("settings.autoApprove.title")}</h1>
			<p data-testid="translation-interpolation">{t("notifications.error", { message: "Test error" })}</p>
		</div>
	)
}

describe("TranslationContext", () => {
	it("should provide translations via context", () => {
		const { getByTestId } = render(
			<TranslationProvider>
				<TestComponent />
			</TranslationProvider>,
		)

		// Check if translation is provided correctly
		expect(getByTestId("translation-test")).toHaveTextContent("Auto-Approve")
	})

	it("should handle interpolation correctly", () => {
		const { getByTestId } = render(
			<TranslationProvider>
				<TestComponent />
			</TranslationProvider>,
		)

		// Check if interpolation works
		expect(getByTestId("translation-interpolation")).toHaveTextContent("Operation failed: Test error")
	})
})

describe("translation bundle corruption guard", () => {
	it("detects mojibake bundles via replacement characters", () => {
		expect(hasCorruptedTranslations({ title: "Нормальный текст" })).toBe(false)
		expect(hasCorruptedTranslations({ title: "���-�� пошло не так" })).toBe(true)
	})

	it("falls back to English resources only for corrupted non-English entries", () => {
		const englishBundle = { title: "Something went wrong", subtitle: "Please retry" }
		const russianBundle = { title: "���-�� ����� �� ���", subtitle: "Повторите попытку" }
		const translations = {
			en: { common: englishBundle },
			ru: { common: russianBundle },
		}

		expect(resolveTranslationBundle("ru", "common", russianBundle, translations)).toEqual({
			title: "Something went wrong",
			subtitle: "Повторите попытку",
		})
	})

	it("preserves valid nested entries when only sibling values are corrupted", () => {
		const englishBundle = {
			autoApprove: {
				description: "Run these actions without asking for permission.",
				readOnly: {
					label: "Read",
					description: "Read files without approval.",
				},
			},
		}
		const russianBundle = {
			autoApprove: {
				description: "Выполнять эти действия без запроса разрешения.",
				readOnly: {
					label: "Чтение",
					description: "��� ����������",
				},
			},
		}
		const translations = {
			en: { settings: englishBundle },
			ru: { settings: russianBundle },
		}

		expect(resolveTranslationBundle("ru", "settings", russianBundle, translations)).toEqual({
			autoApprove: {
				description: "Выполнять эти действия без запроса разрешения.",
				readOnly: {
					label: "Чтение",
					description: "Read files without approval.",
				},
			},
		})
	})

	it("keeps valid non-English bundles intact", () => {
		const validRussianBundle = { title: "Что-то пошло не так" }
		const translations = {
			en: { common: { title: "Something went wrong" } },
			ru: { common: validRussianBundle },
		}

		expect(resolveTranslationBundle("ru", "common", validRussianBundle, translations)).toBe(validRussianBundle)
	})

	it("keeps repaired Russian settings strings instead of falling back to English", () => {
		const translations = {
			en: { settings: enSettings },
			ru: { settings: ruSettings },
		}

		const resolved = resolveTranslationBundle("ru", "settings", ruSettings, translations) as typeof ruSettings

		expect(resolved.sections.alfaCode).toBe("AlfaCode")
		expect(resolved.providers.apiKey).toBe("API-ключ")
		expect(resolved.providers.openAiBaseUrl).toBe("Базовый URL")
		expect(resolved.providers.reasoningEffort.label).toBe("Уровень рассуждений модели")
		expect(resolved.modelInfo.enableStreaming).toBe("Включить потоковую передачу")
		expect(resolved.modelPicker.label).toBe("Модель")
		expect(resolved.thinkingBudget.maxThinkingTokens).toBe("Макс. token для рассуждений")
		expect(resolved.providers.customModel.maxTokens.label).not.toBe(
			enSettings.providers.customModel.maxTokens.label,
		)
		expect(resolved.providers.customModel.maxTokens.label).not.toContain("?")
		expect(resolved.providers.customModel.contextWindow.label).not.toBe(
			enSettings.providers.customModel.contextWindow.label,
		)
		expect(resolved.providers.customModel.contextWindow.label).not.toContain("?")
		expect(resolved.providers.customModel.resetDefaults).not.toBe(enSettings.providers.customModel.resetDefaults)
		expect(resolved.providers.customModel.resetDefaults).not.toContain("?")
		expect(resolved.advancedSettings.title).not.toBe(enSettings.advancedSettings.title)
		expect(resolved.advancedSettings.title).not.toContain("?")
		expect(resolved.toolProtocol.label).not.toContain("?")
		expect(resolved.promptCaching.label).not.toContain("?")
		expect(resolved.ghost.showGutterAnimation.preview).not.toContain("?")
		expect(resolved.serviceTier.label).not.toContain("?")
		expect(resolved.includeMaxOutputTokens).toBe("Передавать максимум выходных token")
	})

	it("keeps repaired Russian kilocode strings instead of showing English section labels", () => {
		const translations = {
			en: { kilocode: enKiloCode },
			ru: { kilocode: ruKiloCode },
		}

		const resolved = resolveTranslationBundle("ru", "kilocode", ruKiloCode, translations) as typeof ruKiloCode

		expect(resolved.ghost.title).toBe("Автодополнение")
	})
	it("keeps Russian settings and kilocode bundles structurally in sync with English", () => {
		const settingsLeaves = collectLeafPaths(ruSettings)
		const kilocodeLeaves = collectLeafPaths(ruKiloCode)

		expect(collectLeafPaths(enSettings).filter((key) => !settingsLeaves.includes(key))).toEqual([])
		expect(collectLeafPaths(enKiloCode).filter((key) => !kilocodeLeaves.includes(key))).toEqual([])
	})
})
