// npx vitest run src/components/settings/neo4j/PasswordField.spec.tsx

import { render, screen } from "@/utils/test-utils"
import userEvent from "@testing-library/user-event"

import { PasswordField } from "./PasswordField"

/**
 * Мок для Translation Context
 * Возвращает переводы для тестов
 */
vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		i18n: {
			language: "en",
		},
	}),
}))

/**
 * Мок для VSCode компонентов
 * Преобразует VSCodeTextField в обычный HTML input для тестирования
 */
vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeTextField: ({ type, value, onChange, disabled, className }: any) => (
		<input
			type={type}
			value={value}
			onChange={onChange}
			disabled={disabled}
			className={className}
			data-testid="password-input"
		/>
	),
}))

/**
 * Мок для lucide-react иконок
 */
vi.mock("lucide-react", () => ({
	Eye: () => <span data-testid="eye-icon">Eye</span>,
	EyeOff: () => <span data-testid="eye-off-icon">EyeOff</span>,
}))

/**
 * Мок для Button компонента
 */
vi.mock("@/components/ui/button", () => ({
	Button: ({ children, onClick, disabled, variant, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
			{children}
		</button>
	),
}))

describe("PasswordField", () => {
	const mockOnChange = vi.fn()
	const mockOnSetPassword = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("Рендеринг компонента", () => {
		it("должен отрендерить поле ввода пароля", () => {
			render(
				<PasswordField
					value=""
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			expect(screen.getByTestId("password-input")).toBeInTheDocument()
			expect(screen.getByText("Password")).toBeInTheDocument()
		})

		it("должен отрендерить кнопку 'Set Password'", () => {
			render(
				<PasswordField
					value=""
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			expect(screen.getByText("Set Password")).toBeInTheDocument()
		})

		it("должен отрендерить кнопку показать/скрыть пароль", () => {
			render(
				<PasswordField
					value=""
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			const toggleButton = screen.getByLabelText("Show")
			expect(toggleButton).toBeInTheDocument()
		})
	})

	describe("Показать/скрыть пароль", () => {
		it("должен показать пароль при клике на иконку Eye", async () => {
			const user = userEvent.setup()
			render(
				<PasswordField
					value="test123"
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			const input = screen.getByTestId("password-input")
			expect(input).toHaveAttribute("type", "password")

			const toggleButton = screen.getByLabelText("Show")
			await user.click(toggleButton)

			expect(input).toHaveAttribute("type", "text")
			expect(screen.getByTestId("eye-off-icon")).toBeInTheDocument()
		})

		it("должен скрыть пароль при повторном клике на иконку", async () => {
			const user = userEvent.setup()
			render(
				<PasswordField
					value="test123"
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			const toggleButton = screen.getByLabelText("Show")
			await user.click(toggleButton)

			const hideButton = screen.getByLabelText("Hide")
			await user.click(hideButton)

			const input = screen.getByTestId("password-input")
			expect(input).toHaveAttribute("type", "password")
			expect(screen.getByTestId("eye-icon")).toBeInTheDocument()
		})

		it("кнопка показать/скрыть должна быть disabled когда поле disabled", () => {
			render(
				<PasswordField
					value="test123"
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
					disabled={true}
				/>,
			)

			const toggleButton = screen.getByLabelText("Show")
			expect(toggleButton).toBeDisabled()
		})
	})

	describe("Изменение значения пароля", () => {
		it("должен вызвать onChange при вводе текста", async () => {
			const user = userEvent.setup()
			render(
				<PasswordField
					value=""
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			const input = screen.getByTestId("password-input")
			await user.type(input, "newPassword123")

			expect(mockOnChange).toHaveBeenCalled()
		})

		it("должен обновить локальное значение при изменении", async () => {
			const user = userEvent.setup()
			render(
				<PasswordField
					value=""
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			const input = screen.getByTestId("password-input")
			await user.type(input, "test")

			expect(input).toHaveValue("test")
		})
	})

	describe("Кнопка 'Set Password'", () => {
		it("должна вызвать onSetPassword при клике", async () => {
			const user = userEvent.setup()
			render(
				<PasswordField
					value="password123"
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			const setButton = screen.getByText("Set Password")
			await user.click(setButton)

			expect(mockOnSetPassword).toHaveBeenCalledTimes(1)
		})

		it("должна быть disabled когда поле пустое", () => {
			render(
				<PasswordField
					value=""
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			const setButton = screen.getByText("Set Password")
			expect(setButton).toBeDisabled()
		})

		it("должна быть disabled когда значение только пробелы", () => {
			render(
				<PasswordField
					value="   "
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			const setButton = screen.getByText("Set Password")
			expect(setButton).toBeDisabled()
		})

		it("должна быть enabled когда есть непустое значение", () => {
			render(
				<PasswordField
					value="password"
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			const setButton = screen.getByText("Set Password")
			expect(setButton).not.toBeDisabled()
		})

		it("должна быть disabled когда компонент disabled", () => {
			render(
				<PasswordField
					value="password"
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
					disabled={true}
				/>,
			)

			const setButton = screen.getByText("Set Password")
			expect(setButton).toBeDisabled()
		})
	})

	describe("Disabled состояние", () => {
		it("поле ввода должно быть disabled", () => {
			render(
				<PasswordField
					value="password"
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
					disabled={true}
				/>,
			)

			const input = screen.getByTestId("password-input")
			expect(input).toBeDisabled()
		})

		it("все интерактивные элементы должны быть disabled", () => {
			render(
				<PasswordField
					value="password"
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
					disabled={true}
				/>,
			)

			const input = screen.getByTestId("password-input")
			const toggleButton = screen.getByLabelText("Show")
			const setButton = screen.getByText("Set Password")

			expect(input).toBeDisabled()
			expect(toggleButton).toBeDisabled()
			expect(setButton).toBeDisabled()
		})
	})

	describe("Индикатор сохраненного пароля", () => {
		it("должен показать статус 'Password is set' когда hasPassword = true", () => {
			render(
				<PasswordField
					value=""
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
					hasPassword={true}
				/>,
			)

			expect(screen.getByText("Password is set")).toBeInTheDocument()
		})

		it("не должен показывать статус когда hasPassword = false", () => {
			render(
				<PasswordField
					value=""
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
					hasPassword={false}
				/>,
			)

			expect(screen.queryByText("Password is set")).not.toBeInTheDocument()
		})

		it("не должен показывать статус когда hasPassword не передан", () => {
			render(
				<PasswordField
					value=""
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			expect(screen.queryByText("Password is set")).not.toBeInTheDocument()
		})
	})

	describe("Локализация", () => {
		it("должен использовать русские переводы при language = 'ru'", () => {
			vi.mocked(vi.importMock("@/i18n/TranslationContext")).useAppTranslation = () => ({
				i18n: {
					language: "ru",
				},
			})

			render(
				<PasswordField
					value=""
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
					hasPassword={true}
				/>,
			)

			expect(screen.getByText("Пароль")).toBeInTheDocument()
			expect(screen.getByText("Установить пароль")).toBeInTheDocument()
			expect(screen.getByText("Пароль установлен")).toBeInTheDocument()
		})
	})

	describe("Очистка поля после установки пароля", () => {
		it("должен очистить локальное значение после вызова onSetPassword", async () => {
			const user = userEvent.setup()
			render(
				<PasswordField
					value="password123"
					onChange={mockOnChange}
					onSetPassword={mockOnSetPassword}
				/>,
			)

			const setButton = screen.getByText("Set Password")
			await user.click(setButton)

			const input = screen.getByTestId("password-input")
			expect(input).toHaveValue("")
		})
	})
})