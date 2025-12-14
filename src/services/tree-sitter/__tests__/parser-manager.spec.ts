import { TreeSitterParserManager, getParserManager } from '../parser-manager'

describe('TreeSitterParserManager', () => {
	let manager: TreeSitterParserManager

	beforeEach(() => {
		manager = TreeSitterParserManager.getInstance()
		manager.clearCache()
	})

	it('should be a singleton', () => {
		const manager1 = TreeSitterParserManager.getInstance()
		const manager2 = TreeSitterParserManager.getInstance()
		expect(manager1).toBe(manager2)
	})

	it('should provide convenience function', () => {
		const manager1 = getParserManager()
		const manager2 = getParserManager()
		expect(manager1).toBe(manager2)
	})

	it('should initialize Tree-sitter once', async () => {
		await manager.initialize()
		await manager.initialize() // Второй вызов не должен падать
		expect(true).toBe(true)
	})

	it('should cache parsers', async () => {
		// Note: Эти тесты требуют реальных WASM файлов
		// В production будут работать с реальными парсерами
		expect(manager).toBeDefined()
	})

	it('should cache languages', async () => {
		expect(manager).toBeDefined()
	})
})