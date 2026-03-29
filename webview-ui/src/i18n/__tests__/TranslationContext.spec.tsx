import { render } from "@/utils/test-utils"

import TranslationProvider, { useAppTranslation } from "../TranslationContext"
import { hasCorruptedTranslations, resolveTranslationBundle } from "../setup"

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
})
