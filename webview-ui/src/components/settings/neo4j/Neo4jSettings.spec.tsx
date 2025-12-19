// npx vitest run src/components/settings/neo4j/Neo4jSettings.spec.tsx

import { render, screen, waitFor } from "@/utils/test-utils"
import userEvent from "@testing-library/user-event"

import { Neo4jSettings } from "./Neo4jSettings"

/**
 * Мок для vscode API
 */
const mockPostMessage = vi.fn()

vi.mock("@/utils/vscode", () => ({
	vscode: {
		postMessage: mockPostMessage,
	},
}))

/**
 * Мок для Translation Context
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
 */
vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeCheckbox: ({ children, onChange, checked, ...props }: any) => (
		<label>
			<input
				type="checkbox"
				role="checkbox"
				checked={checked || false}
				onChange={(e: any) => onChange?.({ target: { checked: e.target.checked } })}
				{...props}
			/>
			{children}
		</label>
	),
	VSCodeTextField: ({ value, onChange, placeholder, disabled, ...props }: any) => (
		<input
			type="text"
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			disabled={disabled}
			{...props}
		/>
	),
}))

/**
 * Мок для PasswordField компонента
 */
vi.mock("./PasswordField", () => ({
	PasswordField: ({ value, onChange, onSetPassword, hasPassword, disabled }: any) => (
		<div data-testid="password-field">
			<input
				type="password"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				data-testid="password-input"
			/>
			<button onClick={onSetPassword} disabled={disabled || !value.trim()}>
				Set Password
			</button>
			{hasPassword && <div>Password is set</div>}
		</div>
	),
}))

/**
 * Мок для ConnectionStatus компонента
 */
vi.mock("./ConnectionStatus", () => ({
	ConnectionStatus: ({ status, message, onTest, testing }: any) => (
		<div data-testid="connection-status">
			<div>Status: {status}</div>
			{message && <div>Message: {message}</div>}
			{onTest && (
				<button onClick={onTest} disabled={testing}>
					{testing ? "Testing..." : "Test Connection"}
				</button>
			)}
		</div>
	),
}))

describe("Neo4jSettings", () => {
	const mockSetCachedStateField = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		// Очистка event listeners
		window.removeEventListener("message", () => {})
	})

	describe("Рендеринг компонента", () => {
		it("должен отрендерить все основные поля", () => {
			render(<Neo4jSettings setCachedStateField={mockSetCachedStateField} />)

			expect(screen.getByRole("checkbox")).toBeInTheDocument()
			expect(screen.getByText("Neo4j Graph Database")).toBeInTheDocument()
			expect(
				screen.getByText("Enable Neo4j as a vector store for codebase indexing"),
			).toBeInTheDocument()
		})

		it("должен отрендерить форму когда Neo4j включен", () => {
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			expect(screen.getByText("Neo4j URI")).toBeInTheDocument()
			expect(screen.getByText("Username")).toBeInTheDocument()
			expect(screen.getByText("Database")).toBeInTheDocument()
			expect(screen.getByTestId("password-field")).toBeInTheDocument()
			expect(screen.getByTestId("connection-status")).toBeInTheDocument()
		})

		it("не должен показывать форму когда Neo4j выключен", () => {
			render(<Neo4jSettings enabled={false} setCachedStateField={mockSetCachedStateField} />)

			expect(screen.queryByText("Neo4j URI")).not.toBeInTheDocument()
			expect(screen.queryByText("Username")).not.toBeInTheDocument()
			expect(screen.queryByTestId("password-field")).not.toBeInTheDocument()
		})

		it("должен показать предупреждение о переиндексации когда Neo4j включен", () => {
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			expect(
				screen.getByText(/Changing Neo4j settings will require reindexing your codebase/i),
			).toBeInTheDocument()
		})
	})

	describe("Включение/выключение Neo4j", () => {
		it("должен вызвать setCachedStateField при включении", async () => {
			const user = userEvent.setup()
			render(<Neo4jSettings enabled={false} setCachedStateField={mockSetCachedStateField} />)

			const checkbox = screen.getByRole("checkbox")
			await user.click(checkbox)

			expect(mockSetCachedStateField).toHaveBeenCalledWith("codebaseIndexConfig", {
				codebaseIndexNeo4jEnabled: true,
			})
		})

		it("должен вызвать setCachedStateField при выключении", async () => {
			const user = userEvent.setup()
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			const checkbox = screen.getByRole("checkbox")
			await user.click(checkbox)

			expect(mockSetCachedStateField).toHaveBeenCalledWith("codebaseIndexConfig", {
				codebaseIndexNeo4jEnabled: false,
			})
		})
	})

	describe("Изменение URI", () => {
		it("должен вызвать setCachedStateField при изменении URI", async () => {
			const user = userEvent.setup()
			render(
				<Neo4jSettings
					enabled={true}
					uri="bolt://localhost:7687"
					setCachedStateField={mockSetCachedStateField}
				/>,
			)

			const input = screen.getByPlaceholderText("bolt://localhost:7687")
			await user.clear(input)
			await user.type(input, "neo4j://newhost:7687")

			expect(mockSetCachedStateField).toHaveBeenCalledWith("codebaseIndexConfig", {
				codebaseIndexNeo4jUri: expect.stringContaining("neo4j://"),
			})
		})

		it("должен показать ошибку при невалидном URI", async () => {
			const user = userEvent.setup()
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			const input = screen.getByPlaceholderText("bolt://localhost:7687")
			await user.clear(input)
			await user.type(input, "http://invalid")

			await waitFor(() => {
				expect(
					screen.getByText("URI must start with bolt://, neo4j://, or neo4j+s://"),
				).toBeInTheDocument()
			})
		})

		it("должен показать ошибку при пустом URI", async () => {
			const user = userEvent.setup()
			render(
				<Neo4jSettings
					enabled={true}
					uri="bolt://localhost:7687"
					setCachedStateField={mockSetCachedStateField}
				/>,
			)

			const input = screen.getByPlaceholderText("bolt://localhost:7687")
			await user.clear(input)

			await waitFor(() => {
				expect(screen.getByText("URI cannot be empty")).toBeInTheDocument()
			})
		})

		it("не должен показывать ошибку для валидного bolt:// URI", async () => {
			const user = userEvent.setup()
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			const input = screen.getByPlaceholderText("bolt://localhost:7687")
			await user.clear(input)
			await user.type(input, "bolt://localhost:7687")

			await waitFor(() => {
				expect(
					screen.queryByText("URI must start with bolt://, neo4j://, or neo4j+s://"),
				).not.toBeInTheDocument()
			})
		})

		it("не должен показывать ошибку для валидного neo4j:// URI", async () => {
			const user = userEvent.setup()
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			const input = screen.getByPlaceholderText("bolt://localhost:7687")
			await user.clear(input)
			await user.type(input, "neo4j://localhost:7687")

			await waitFor(() => {
				expect(
					screen.queryByText("URI must start with bolt://, neo4j://, or neo4j+s://"),
				).not.toBeInTheDocument()
			})
		})

		it("не должен показывать ошибку для валидного neo4j+s:// URI", async () => {
			const user = userEvent.setup()
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			const input = screen.getByPlaceholderText("bolt://localhost:7687")
			await user.clear(input)
			await user.type(input, "neo4j+s://localhost:7687")

			await waitFor(() => {
				expect(
					screen.queryByText("URI must start with bolt://, neo4j://, or neo4j+s://"),
				).not.toBeInTheDocument()
			})
		})
	})

	describe("Изменение Username", () => {
		it("должен вызвать setCachedStateField при изменении username", async () => {
			const user = userEvent.setup()
			render(
				<Neo4jSettings
					enabled={true}
					username="neo4j"
					setCachedStateField={mockSetCachedStateField}
				/>,
			)

			const input = screen.getByPlaceholderText("neo4j")
			await user.clear(input)
			await user.type(input, "admin")

			expect(mockSetCachedStateField).toHaveBeenCalledWith("codebaseIndexConfig", {
				codebaseIndexNeo4jUsername: expect.stringContaining("a"),
			})
		})

		it("должен показать ошибку при пустом username", async () => {
			const user = userEvent.setup()
			render(
				<Neo4jSettings
					enabled={true}
					username="neo4j"
					setCachedStateField={mockSetCachedStateField}
				/>,
			)

			const input = screen.getByPlaceholderText("neo4j")
			await user.clear(input)

			await waitFor(() => {
				expect(screen.getByText("Username cannot be empty")).toBeInTheDocument()
			})
		})
	})

	describe("Изменение Database", () => {
		it("должен вызвать setCachedStateField при изменении database", async () => {
			const user = userEvent.setup()
			render(
				<Neo4jSettings
					enabled={true}
					database="neo4j"
					setCachedStateField={mockSetCachedStateField}
				/>,
			)

			const inputs = screen.getAllByPlaceholderText("neo4j")
			const databaseInput = inputs[1] // Второй input с placeholder "neo4j"
			await user.clear(databaseInput)
			await user.type(databaseInput, "mydb")

			expect(mockSetCachedStateField).toHaveBeenCalledWith("codebaseIndexConfig", {
				codebaseIndexNeo4jDatabase: expect.stringContaining("m"),
			})
		})

		it("должен показать ошибку при пустом database", async () => {
			const user = userEvent.setup()
			render(
				<Neo4jSettings
					enabled={true}
					database="neo4j"
					setCachedStateField={mockSetCachedStateField}
				/>,
			)

			const inputs = screen.getAllByPlaceholderText("neo4j")
			const databaseInput = inputs[1]
			await user.clear(databaseInput)

			await waitFor(() => {
				expect(screen.getByText("Database name cannot be empty")).toBeInTheDocument()
			})
		})
	})

	describe("Интеграция с PasswordField", () => {
		it("должен передать правильные props в PasswordField", () => {
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			expect(screen.getByTestId("password-field")).toBeInTheDocument()
			expect(screen.getByTestId("password-input")).toBeInTheDocument()
		})

		it("должен отправить setNeo4jPassword при установке пароля", async () => {
			const user = userEvent.setup()
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			const passwordInput = screen.getByTestId("password-input")
			const setButton = screen.getByText("Set Password")

			await user.type(passwordInput, "mypassword")
			await user.click(setButton)

			expect(mockPostMessage).toHaveBeenCalledWith({
				type: "setNeo4jPassword",
				neo4jPassword: "mypassword",
			})
		})

		it("не должен отправлять пустой пароль", async () => {
			const user = userEvent.setup()
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			const passwordInput = screen.getByTestId("password-input")
			const setButton = screen.getByText("Set Password")

			await user.type(passwordInput, "   ")

			expect(setButton).toBeDisabled()
		})
	})

	describe("Интеграция с ConnectionStatus", () => {
		it("должен передать правильные props в ConnectionStatus", () => {
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			const connectionStatus = screen.getByTestId("connection-status")
			expect(connectionStatus).toHaveTextContent("Status: disconnected")
		})

		it("должен отправить neo4jConnectionTest при клике на Test Connection", async () => {
			const user = userEvent.setup()
			render(
				<Neo4jSettings
					enabled={true}
					uri="bolt://localhost:7687"
					username="neo4j"
					database="neo4j"
					setCachedStateField={mockSetCachedStateField}
				/>,
			)

			const testButton = screen.getByText("Test Connection")
			await user.click(testButton)

			expect(mockPostMessage).toHaveBeenCalledWith({
				type: "neo4jConnectionTest",
				neo4jConfig: {
					uri: "bolt://localhost:7687",
					username: "neo4j",
					database: "neo4j",
				},
				neo4jPassword: undefined,
			})
		})

		it("не должен отправлять тест при наличии ошибок валидации", async () => {
			const user = userEvent.setup()
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			const uriInput = screen.getByPlaceholderText("bolt://localhost:7687")
			await user.clear(uriInput)
			await user.type(uriInput, "invalid")

			const testButton = screen.getByText("Test Connection")
			await user.click(testButton)

			// Должна быть показана ошибка валидации
			await waitFor(() => {
				expect(
					screen.getByText("URI must start with bolt://, neo4j://, or neo4j+s://"),
				).toBeInTheDocument()
			})

			// postMessage не должен вызываться для теста подключения
			expect(mockPostMessage).not.toHaveBeenCalledWith(
				expect.objectContaining({
					type: "neo4jConnectionTest",
				}),
			)
		})
	})

	describe("Обработка сообщений от extension", () => {
		it("должен обработать neo4jPasswordStatus", () => {
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			// Имитация сообщения от extension
			window.dispatchEvent(
				new MessageEvent("message", {
					data: {
						type: "neo4jPasswordStatus",
						hasNeo4jPassword: true,
					},
				}),
			)

			// Должен показать индикатор что пароль установлен
			waitFor(() => {
				expect(screen.getByText("Password is set")).toBeInTheDocument()
			})
		})

		it("должен обработать успешный результат теста подключения", async () => {
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			// Имитация успешного ответа
			window.dispatchEvent(
				new MessageEvent("message", {
					data: {
						type: "neo4jConnectionResult",
						neo4jConnectionResult: {
							success: true,
							message: "Connected successfully",
						},
					},
				}),
			)

			await waitFor(() => {
				const connectionStatus = screen.getByTestId("connection-status")
				expect(connectionStatus).toHaveTextContent("Status: connected")
				expect(connectionStatus).toHaveTextContent("Message: Connected successfully")
			})
		})

		it("должен обработать неудачный результат теста подключения", async () => {
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			// Имитация неудачного ответа
			window.dispatchEvent(
				new MessageEvent("message", {
					data: {
						type: "neo4jConnectionResult",
						neo4jConnectionResult: {
							success: false,
							message: "Connection timeout",
						},
					},
				}),
			)

			await waitFor(() => {
				const connectionStatus = screen.getByTestId("connection-status")
				expect(connectionStatus).toHaveTextContent("Status: error")
				expect(connectionStatus).toHaveTextContent("Message: Connection timeout")
			})
		})
	})

	describe("Запрос статуса пароля при монтировании", () => {
		it("должен отправить getNeo4jPasswordStatus при монтировании", () => {
			render(<Neo4jSettings setCachedStateField={mockSetCachedStateField} />)

			expect(mockPostMessage).toHaveBeenCalledWith({
				type: "getNeo4jPasswordStatus",
			})
		})
	})

	describe("Дефолтные значения", () => {
		it("должен использовать дефолтные значения если не переданы", () => {
			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			const uriInput = screen.getByPlaceholderText("bolt://localhost:7687")
			const usernameInput = screen.getByPlaceholderText("neo4j")
			const databaseInputs = screen.getAllByPlaceholderText("neo4j")

			expect(uriInput).toHaveValue("bolt://localhost:7687")
			expect(usernameInput).toHaveValue("neo4j")
			expect(databaseInputs[1]).toHaveValue("neo4j")
		})
	})

	describe("Локализация", () => {
		it("должен использовать русские переводы при language = 'ru'", () => {
			// Переопределяем мок для русского языка
			vi.doMock("@/i18n/TranslationContext", () => ({
				useAppTranslation: () => ({
					i18n: {
						language: "ru",
					},
				}),
			}))

			render(<Neo4jSettings enabled={true} setCachedStateField={mockSetCachedStateField} />)

			expect(screen.getByText("Графовая БД Neo4j")).toBeInTheDocument()
			expect(
				screen.getByText(
					"Использовать Neo4j как хранилище векторов для индексации кодовой базы",
				),
			).toBeInTheDocument()
		})
	})

	describe("Состояние testing во время теста подключения", () => {
		it("должен установить статус connecting при начале теста", async () => {
			const user = userEvent.setup()
			render(
				<Neo4jSettings
					enabled={true}
					uri="bolt://localhost:7687"
					username="neo4j"
					database="neo4j"
					setCachedStateField={mockSetCachedStateField}
				/>,
			)

			const testButton = screen.getByText("Test Connection")
			await user.click(testButton)

			await waitFor(() => {
				const connectionStatus = screen.getByTestId("connection-status")
				expect(connectionStatus).toHaveTextContent("Status: connecting")
			})
		})
	})

	describe("Валидация перед тестом подключения", () => {
		it("должен требовать пароль для теста подключения", async () => {
			const user = userEvent.setup()
			render(
				<Neo4jSettings
					enabled={true}
					uri="bolt://localhost:7687"
					username="neo4j"
					database="neo4j"
					setCachedStateField={mockSetCachedStateField}
				/>,
			)

			const testButton = screen.getByText("Test Connection")
			await user.click(testButton)

			await waitFor(() => {
				const connectionStatus = screen.getByTestId("connection-status")
				expect(connectionStatus).toHaveTextContent("Status: error")
				expect(connectionStatus).toHaveTextContent(
					"Message: Password is required for connection test",
				)
			})
		})
	})
})