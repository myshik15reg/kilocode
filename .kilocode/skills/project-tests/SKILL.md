---
name: project-tests
description: Standardized workflow for running tests.
---

# Project Tests Skill

## Purpose
This skill provides a standardized workflow for running tests in the project, ensuring consistent test execution and reporting.

## Triggers
Use this skill when:
- User asks to run tests
- User asks to check if tests pass
- User asks to verify code changes don't break existing functionality
- A protocol requires test execution as a step

## Context
Before running tests, this skill reads:
- `.kilocode/memory-bank/tech.md` - To understand the project's testing framework and setup
- `package.json` - To identify test scripts and dependencies
- `README.md` - To check for specific testing instructions

## Workflow

### Step 1: Gather Test Information
1. Read `.kilocode/memory-bank/tech.md` to understand the testing framework
2. Read `package.json` to identify available test scripts:
   ```bash
   read_file files=[{path: "package.json"}]
   ```
3. Look for scripts like `test`, `test:watch`, `test:coverage`, `lint`

### Step 2: Verify Test Environment
1. Check if dependencies are installed:
   ```bash
   ls node_modules  # or check for other dependency folders
   ```
2. If dependencies are missing, install them:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

### Step 3: Run Tests
Execute the appropriate test command based on the project setup:

**For npm projects:**
```bash
npm test
```

**For specific test suites:**
```bash
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e       # End-to-end tests only
```

**For coverage reports:**
```bash
npm run test:coverage
```

### Step 4: Analyze Results
1. Review the test output for:
   - Total number of tests run
   - Number of passed tests
   - Number of failed tests
   - Error messages and stack traces
   - Coverage percentage (if available)

2. If tests fail:
   - Identify which tests failed
   - Read the error messages carefully
   - Note the files and line numbers involved
   - Report the issues to the user

### Step 5: Report Results
Provide a clear summary to the user:

**Success Example:**
```
✅ All tests passed!
- Total: 42 tests
- Passed: 42
- Failed: 0
- Coverage: 87.5%
```

**Failure Example:**
```
❌ Tests failed!
- Total: 42 tests
- Passed: 40
- Failed: 2

Failed tests:
1. UserService.createUser() - Expected user to be created
   File: src/services/user.test.js:45
   Error: Expected 'success' but got 'error'

2. APIHandler.processRequest() - Should handle timeout
   File: src/api/handler.test.js:78
   Error: Timeout exceeded
```

## Best Practices
- Always run tests from the project root directory
- Use the appropriate test command for the current task (unit, integration, e2e)
- If tests are flaky (sometimes pass, sometimes fail), run them multiple times
- Consider running tests in watch mode during development: `npm run test:watch`
- Always report test coverage if available

## Troubleshooting

### Tests won't run
- Check that dependencies are installed
- Verify the test script exists in package.json
- Ensure you're in the correct directory

### Tests are slow
- Consider running a subset of tests using flags
- Check for unnecessary test setup/teardown
- Review if tests are making real API calls instead of mocking

### Coverage is low
- Identify untested files by reviewing the coverage report
- Prioritize testing critical paths and business logic
- Consider adding integration tests for complex workflows

## Testing Strategies

### Эфемерная БД (Ephemeral Database)

**Концепция**: Использование временной базы данных в RAM для ускорения тестов.

**Применение**:
- Unit тесты с изоляцией
- Интеграционные тесты, требующие быстрой БД
- CI/CD пайплайны с ограничениями по времени

**Реализация с Docker**:
```bash
# Создание volume в RAM (tmpfs)
docker volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=1g \
  test-db-volume

# Запуск контейнера с БД в RAM
docker run -d \
  --name test-db \
  -v test-db-volume:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=test \
  postgres:15

# После тестов
docker stop test-db && docker rm test-db
docker volume rm test-db-volume
```

**Преимущества**:
- Быстродействие: RAM в 10-100x быстрее диска
- Изоляция: Каждый тест получает чистую БД
- Автоматическая очистка: Volume удаляется после тестов

**Ограничения**:
- Ограниченный объем RAM
- Не подходит для больших наборов данных
- Данные теряются после остановки контейнера

### World ID (Мягкое шардирование)

**Концепция**: Параллельное выполнение тестов с изоляцией через уникальные идентификаторы "миров".

**Применение**:
- Параллельное выполнение тестов
- Изоляция тестов без полной изоляции БД
- Масштабирование тестовой инфраструктуры

**Реализация**:
```javascript
// Генерация уникального World ID для каждого теста
const worldId = `world-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Использование в тестах
describe('User Service', () => {
  const world = worldId; // Уникальный "мир" для этого теста

  it('should create user', async () => {
    const user = await userService.create({
      username: `test-${world}`,
      email: `test-${world}@example.com`
    });
    expect(user.username).toBe(`test-${world}`);
  });

  it('should find user by world', async () => {
    const users = await userService.findByWorld(world);
    expect(users.length).toBeGreaterThan(0);
  });
});
```

**Принципы**:
- Каждый тест работает в своем "мире" (World ID)
- Данные из разных "миров" не пересекаются
- Можно запускать тесты параллельно без конфликтов

**Преимущества**:
- Параллельное выполнение без полной изоляции
- Простота реализации
- Масштабируемость

**Ограничения**:
- Требует поддержки в коде (добавление World ID)
- Не подходит для тестов, требующих глобального состояния

### Agent Runner (Запуск сложных e2e тестов)

**Концепция**: Использование агентов для выполнения сложных end-to-end тестов с распределенной архитектурой.

**Применение**:
- Сложные e2e сценарии
- Распределенные системы
- Тестирование интеграций между сервисами

**Архитектура**:
```
┌─────────────┐
│ Orchestrator │
└──────┬──────┘
       │
       ├─→ Agent 1 (Service A)
       ├─→ Agent 2 (Service B)
       ├─→ Agent 3 (Database)
       └─→ Agent 4 (External API)
```

**Реализация**:
```python
# Пример агента для тестирования сервиса
class TestAgent:
    def __init__(self, world_id, config):
        self.world_id = world_id
        self.config = config
        self.state = {}

    async def setup(self):
        """Инициализация агента"""
        await self.connect_service()
        await self.prepare_data()

    async def execute_action(self, action):
        """Выполнение действия"""
        result = await self.service.call(action)
        self.state[action] = result
        return result

    async def verify(self, expected):
        """Проверка результатов"""
        return self.state == expected

    async def cleanup(self):
        """Очистка после теста"""
        await self.reset_service()
```

**Пример использования**:
```python
async def test_user_flow():
    # Создание агентов
    user_agent = TestAgent(world_id, user_config)
    db_agent = TestAgent(world_id, db_config)
    api_agent = TestAgent(world_id, api_config)

    # Инициализация
    await asyncio.gather(
        user_agent.setup(),
        db_agent.setup(),
        api_agent.setup()
    )

    # Выполнение сценария
    user = await user_agent.execute_action("create_user")
    await db_agent.execute_action(f"save_user:{user.id}")
    response = await api_agent.execute_action(f"get_user:{user.id}")

    # Проверка
    assert response.status == 200
    assert response.data.id == user.id

    # Очистка
    await asyncio.gather(
        user_agent.cleanup(),
        db_agent.cleanup(),
        api_agent.cleanup()
    )
```

**Преимущества**:
- Распределенное выполнение тестов
- Изоляция между агентами
- Масштабируемость
- Реалистичное тестирование распределенных систем

**Ограничения**:
- Сложность настройки
- Требует инфраструктуры для агентов
- Долгое время выполнения сложных сценариев

### Выбор стратегии (Strategy Selection)

| Ситуация | Рекомендуемая стратегия | Причина |
|----------|------------------------|---------|
| Unit тесты | Эфемерная БД | Быстродействие, изоляция |
| Интеграционные тесты | World ID | Баланс скорости и изоляции |
| E2E тесты | Agent Runner | Реалистичность, распределенность |
| CI/CD пайплайны | Эфемерная БД + World ID | Скорость + параллелизм |
| Нагрузочное тестирование | Agent Runner | Масштабируемость |

## Integration with Protocols
When this skill is used as part of a protocol:
1. Update the protocol's `plan.md` to mark test execution as complete
2. Record test results in `execution.md`
3. If tests fail, document the issues and decide whether to:
   - Fix the issues immediately
   - Create a new protocol to address them
   - Note them as known issues in `progress.md`
