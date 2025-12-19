// npx vitest run src/components/settings/neo4j/ConnectionStatus.spec.tsx

import { render, screen } from "@/utils/test-utils"
import userEvent from "@testing-library/user-event"

import { ConnectionStatus } from "./ConnectionStatus"
import { Neo4jConnectionStatus } from "./types"

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
 * Мок для lucide-react иконок
 */
vi.mock("lucide-react", () => ({
	Circle: ({ className }: any) => <span data-testid="circle-icon" className={className}>Circle</span>,
	Loader: ({ className }: any) => <span data-testid="loader-icon" className={className}>Loader</span>,
	CheckCircle: ({ className }: any) => <span data-testid="check-circle-icon" className={className}>CheckCircle</span>,
	XCircle: ({ className }: any) => <span data-testid="x-circle-icon" className={className}>XCircle</span>,
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

describe("ConnectionStatus", () => {
	const mockOnTest = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("Рендеринг для каждого статуса", () => {
		it("должен отрендерить статус 'disconnected'", () => {
			render(<ConnectionStatus status="disconnected" onTest={mockOnTest} />)

			expect(screen.getByTestId("circle-icon")).toBeInTheDocument()
			expect(screen.getByText("Not connected")).toBeInTheDocument()
		})

		it("должен отрендерить статус 'connecting'", () => {
			render(<ConnectionStatus status="connecting" onTest={mockOnTest} />)

			expect(screen.getByTestId("loader-icon")).toBeInTheDocument()
			expect(screen.getByText("Connecting...")).toBeInTheDocument()
		})

		it("должен отрендерить статус 'connected'", () => {
			render(<ConnectionStatus status="connected" onTest={mockOnTest} />)

			expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument()
			expect(screen.getByText("Connected to Neo4j")).toBeInTheDocument()
		})

		it("должен отрендерить статус 'error'", () => {
			render(<ConnectionStatus status="error" onTest={mockOnTest} />)

			expect(screen.getByTestId("x-circle-icon")).toBeInTheDocument()
			expect(screen.getByText("Connection failed")).toBeInTheDocument()
		})
	})

	describe("Цвета для каждого статуса", () => {
		it("статус 'disconnected' должен иметь цвет text-vscode-descriptionForeground", () => {
			render(<ConnectionStatus status="disconnected" onTest={mockOnTest} />)

			const icon = screen.getByTestId("circle-icon")
			expect(icon.parentElement).toHaveClass("text-vscode-descriptionForeground")
		})

		it("статус 'connecting' должен иметь цвет text-vscode-charts-yellow", () => {
			render(<ConnectionStatus status="connecting" onTest={mockOnTest} />)

			const icon = screen.getByTestId("loader-icon")
			expect(icon.parentElement).toHaveClass("text-vscode-charts-yellow")
		})

		it("статус 'connected' должен иметь цвет text-vscode-charts-green", () => {
			render(<ConnectionStatus status="connected" onTest={mockOnTest} />)

			const icon = screen.getByTestId("check-circle-icon")
			expect(icon.parentElement).toHaveClass("text-vscode-charts-green")
		})

		it("статус 'error' должен иметь цвет text-vscode-charts-red", () => {
			render(<ConnectionStatus status="error" onTest={mockOnTest} />)

			const icon = screen.getByTestId("x-circle-icon")
			expect(icon.parentElement).toHaveClass("text-vscode-charts-red")
		})
	})

	describe("Правильные иконки для каждого статуса", () => {
		it("статус 'disconnected' должен показать иконку Circle", () => {
			render(<ConnectionStatus status="disconnected" onTest={mockOnTest} />)

			expect(screen.getByTestId("circle-icon")).toBeInTheDocument()
			expect(screen.queryByTestId("loader-icon")).not.toBeInTheDocument()
			expect(screen.queryByTestId("check-circle-icon")).not.toBeInTheDocument()
			expect(screen.queryByTestId("x-circle-icon")).not.toBeInTheDocument()
		})

		it("статус 'connecting' должен показать иконку Loader", () => {
			render(<ConnectionStatus status="connecting" onTest={mockOnTest} />)

			expect(screen.getByTestId("loader-icon")).toBeInTheDocument()
			expect(screen.queryByTestId("circle-icon")).not.toBeInTheDocument()
		})

		it("статус 'connected' должен показать иконку CheckCircle", () => {
			render(<ConnectionStatus status="connected" onTest={mockOnTest} />)

			expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument()
			expect(screen.queryByTestId("circle-icon")).not.toBeInTheDocument()
		})

		it("статус 'error' должен показать иконку XCircle", () => {
			render(<ConnectionStatus status="error" onTest={mockOnTest} />)

			expect(screen.getByTestId("x-circle-icon")).toBeInTheDocument()
			expect(screen.queryByTestId("circle-icon")).not.toBeInTheDocument()
		})
	})

	describe("Отображение кастомного сообщения", () => {
		it("должен показать кастомное сообщение вместо дефолтного", () => {
			render(
				<ConnectionStatus
					status="error"
					message="Custom error message"
					onTest={mockOnTest}
				/>,
			)

			expect(screen.getByText("Custom error message")).toBeInTheDocument()
			expect(screen.queryByText("Connection failed")).not.toBeInTheDocument()
		})

		it("должен показать дефолтное сообщение когда message не передан", () => {
			render(<ConnectionStatus status="connected" onTest={mockOnTest} />)

			expect(screen.getByText("Connected to Neo4j")).toBeInTheDocument()
		})

		it("должен показать дефолтное сообщение когда message пустой", () => {
			render(<ConnectionStatus status="connected" message="" onTest={mockOnTest} />)

			expect(screen.getByText("Connected to Neo4j")).toBeInTheDocument()
		})
	})

	describe("Кнопка 'Test Connection'", () => {
		it("должна отрендериться когда передан onTest", () => {
			render(<ConnectionStatus status="disconnected" onTest={mockOnTest} />)

			expect(screen.getByText("Test Connection")).toBeInTheDocument()
		})

		it("не должна рендериться когда onTest не передан", () => {
			render(<ConnectionStatus status="disconnected" />)

			expect(screen.queryByText("Test Connection")).not.toBeInTheDocument()
		})

		it("должна вызвать onTest при клике", async () => {
			const user = userEvent.setup()
			render(<ConnectionStatus status="disconnected" onTest={mockOnTest} />)

			const button = screen.getByText("Test Connection")
			await user.click(button)

			expect(mockOnTest).toHaveBeenCalledTimes(1)
		})

		it("должна быть disabled когда testing = true", () => {
			render(<ConnectionStatus status="disconnected" onTest={mockOnTest} testing={true} />)

			const button = screen.getByText("Testing...")
			expect(button).toBeDisabled()
		})

		it("должна быть enabled когда testing = false", () => {
			render(<ConnectionStatus status="disconnected" onTest={mockOnTest} testing={false} />)

			const button = screen.getByText("Test Connection")
			expect(button).not.toBeDisabled()
		})

		it("должна показать текст 'Testing...' когда testing = true", () => {
			render(<ConnectionStatus status="connecting" onTest={mockOnTest} testing={true} />)

			expect(screen.getByText("Testing...")).toBeInTheDocument()
			expect(screen.queryByText("Test Connection")).not.toBeInTheDocument()
		})
	})

	describe("Анимация при статусе 'connecting'", () => {
		it("иконка Loader должна иметь класс animate-spin", () => {
			render(<ConnectionStatus status="connecting" onTest={mockOnTest} />)

			const loader = screen.getByTestId("loader-icon")
			expect(loader).toHaveClass("animate-spin")
		})

		it("другие иконки не должны иметь класс animate-spin", () => {
			const statuses: Neo4jConnectionStatus[] = ["disconnected", "connected", "error"]

			statuses.forEach((status) => {
				const { container } = render(<ConnectionStatus status={status} onTest={mockOnTest} />)

				const icon = container.querySelector('[class*="animate-spin"]')
				expect(icon).not.toBeInTheDocument()
			})
		})
	})

	describe("Локализация", () => {
		it("должен показать label 'Connection Status'", () => {
			render(<ConnectionStatus status="disconnected" onTest={mockOnTest} />)

			expect(screen.getByText("Connection Status")).toBeInTheDocument()
		})

		it("должен использовать переводы для статусов (en)", () => {
			const statusTexts = {
				disconnected: "Not connected",
				connecting: "Connecting...",
				connected: "Connected to Neo4j",
				error: "Connection failed",
			}

			Object.entries(statusTexts).forEach(([status, text]) => {
				const { unmount } = render(
					<ConnectionStatus status={status as Neo4jConnectionStatus} onTest={mockOnTest} />,
				)

				expect(screen.getByText(text)).toBeInTheDocument()
				unmount()
			})
		})

		it("должен использовать русские переводы при language = 'ru'", () => {
			// Переопределяем мок для русского языка
			vi.doMock("@/i18n/TranslationContext", () => ({
				useAppTranslation: () => ({
					i18n: {
						language: "ru",
					},
				}),
			}))
	
			render(<ConnectionStatus status="disconnected" onTest={mockOnTest} />)
	
			expect(screen.getByText("Статус подключения")).toBeInTheDocument()
			expect(screen.getByText("Не подключено")).toBeInTheDocument()
			expect(screen.getByText("Проверить подключение")).toBeInTheDocument()
		})
	})

	describe("Дефолтные пропсы", () => {
		it("testing по умолчанию должен быть false", () => {
			render(<ConnectionStatus status="disconnected" onTest={mockOnTest} />)

			const button = screen.getByText("Test Connection")
			expect(button).not.toBeDisabled()
		})

		it("message по умолчанию не задан (используется дефолтное сообщение)", () => {
			render(<ConnectionStatus status="connected" onTest={mockOnTest} />)

			expect(screen.getByText("Connected to Neo4j")).toBeInTheDocument()
		})
	})

	describe("Комбинации статусов и состояний", () => {
		it("статус 'error' с кастомным сообщением и testing = true", () => {
			render(
				<ConnectionStatus
					status="error"
					message="Database not found"
					onTest={mockOnTest}
					testing={true}
				/>,
			)

			expect(screen.getByTestId("x-circle-icon")).toBeInTheDocument()
			expect(screen.getByText("Database not found")).toBeInTheDocument()
			expect(screen.getByText("Testing...")).toBeInTheDocument()
			expect(screen.getByText("Testing...")).toBeDisabled()
		})

		it("статус 'connected' без кнопки теста", () => {
			render(<ConnectionStatus status="connected" />)

			expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument()
			expect(screen.getByText("Connected to Neo4j")).toBeInTheDocument()
			expect(screen.queryByRole("button")).not.toBeInTheDocument()
		})

		it("статус 'connecting' с кнопкой в состоянии testing", () => {
			render(<ConnectionStatus status="connecting" onTest={mockOnTest} testing={true} />)

			expect(screen.getByTestId("loader-icon")).toBeInTheDocument()
			expect(screen.getByText("Connecting...")).toBeInTheDocument()
			expect(screen.getByText("Testing...")).toBeDisabled()
		})
	})
})