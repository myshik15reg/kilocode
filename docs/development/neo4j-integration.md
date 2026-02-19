# Neo4j Integration - Developer Documentation

## Обзор

Эта документация описывает техническую реализацию Neo4j интеграции в Kilocode VSCode Extension. Neo4j используется как графовая база данных для хранения и анализа структуры кодовой базы, обеспечивая мощные возможности поиска зависимостей и анализа влияния изменений.

## Содержание

- [Архитектура интеграции](#архитектура-интеграции)
- [API Endpoints (Message Handlers)](#api-endpoints-message-handlers)
- [Структура данных в Neo4j](#структура-данных-в-neo4j)
- [React компоненты](#react-компоненты)
- [SecretStorage интеграция](#secretstorage-интеграция)
- [Connection Testing](#connection-testing)
- [Расширение функциональности](#расширение-функциональности)
- [Testing Guidelines](#testing-guidelines)

---

## Архитектура интеграции

### Обзор архитектуры

Neo4j интеграция построена на трехуровневой архитектуре:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Neo4jSettings.tsx - главный компонент настроек   │  │
│  │ PasswordField.tsx - безопасный ввод пароля       │  │
│  │ ConnectionStatus.tsx - статус подключения        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↕
                   postMessage API
                            ↕
┌─────────────────────────────────────────────────────────┐
│              Backend (Extension Host)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ webviewMessageHandler.ts - обработчики сообщений │  │
│  │  - setNeo4jPassword                              │  │
│  │  - getNeo4jPasswordStatus                        │  │
│  │  - neo4jConnectionTest                           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↕
                    VSCode SecretStorage
                            ↕
┌─────────────────────────────────────────────────────────┐
│                  Neo4j Service Layer                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Neo4jConnectionManager - singleton подключений   │  │
│  │ Neo4jGraphService - CRUD операции с графом       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↕
                       Neo4j Database
```

### Взаимодействие Frontend и Backend

**Message Passing Flow:**

1. **Frontend → Backend**: React компоненты отправляют сообщения через `vscode.postMessage()`
2. **Backend Processing**: Extension обрабатывает сообщения в [`webviewMessageHandler.ts`](../../src/core/webview/webviewMessageHandler.ts)
3. **Backend → Frontend**: Результат отправляется обратно через `provider.postMessageToWebview()`

**Пример потока данных:**

```typescript
// 1. Frontend отправляет запрос
vscode.postMessage({
  type: "neo4jConnectionTest",
  uri: "bolt://localhost:7687",
  username: "neo4j",
  database: "neo4j"
})

// 2. Backend обрабатывает (webviewMessageHandler.ts)
case "neo4jConnectionTest":
  // Валидация, получение пароля, тестирование
  await provider.postMessageToWebview({
    type: "neo4jConnectionTestResult",
    success: true,
    version: "5.x"
  })

// 3. Frontend получает результат
useEffect(() => {
  const messageHandler = (event: MessageEvent) => {
    if (event.data.type === "neo4jConnectionTestResult") {
      // Обновление UI
    }
  }
}, [])
```

### Компоненты взаимодействия

**Key Components:**

- **[`Neo4jSettings.tsx`](../../webview-ui/src/components/settings/neo4j/Neo4jSettings.tsx)**: Главный компонент настроек
- **[`webviewMessageHandler.ts`](../../src/core/webview/webviewMessageHandler.ts)**: Backend обработчики сообщений
- **[`Neo4jConnectionManager`](../../src/services/neo4j/connection-manager.ts)**: Singleton для управления подключениями
- **[`Neo4jGraphService`](../../src/services/neo4j/graph-service.ts)**: Операции с графом данных

---

## API Endpoints (Message Handlers)

### 1. setNeo4jPassword

Сохраняет пароль Neo4j в VSCode SecretStorage.

**Location:** [`webviewMessageHandler.ts:3292-3307`](../../src/core/webview/webviewMessageHandler.ts:3292)

**Request:**

```typescript
{
  type: "setNeo4jPassword",
  neo4jPassword: string  // Пароль для сохранения
}
```

**Response:**

```typescript
// Нет явного ответа, UI обновляется через getNeo4jPasswordStatus
```

**Implementation:**

```typescript
case "setNeo4jPassword": {
  await provider.contextProxy.storeSecret(
    "codebaseIndexNeo4jPassword",
    message.neo4jPassword
  )
  break
}
```

**Error Handling:**

- Автоматически обрабатывается VSCode SecretStorage
- При ошибке пароль не сохраняется

---

### 2. getNeo4jPasswordStatus

Проверяет наличие сохраненного пароля.

**Location:** [`webviewMessageHandler.ts:3308-3327`](../../src/core/webview/webviewMessageHandler.ts:3308)

**Request:**

```typescript
{
	type: "getNeo4jPasswordStatus"
}
```

**Response:**

```typescript
{
  type: "neo4jPasswordStatus",
  hasNeo4jPassword: boolean  // true если пароль сохранен
}
```

**Implementation:**

```typescript
case "getNeo4jPasswordStatus": {
  const hasPassword = !!(await provider.context.secrets.get(
    "codebaseIndexNeo4jPassword"
  ))

  await provider.postMessageToWebview({
    type: "neo4jPasswordStatus",
    hasNeo4jPassword: hasPassword,
  })
  break
}
```

**Usage Example:**

```typescript
// Frontend проверяет статус при загрузке
useEffect(() => {
	vscode.postMessage({ type: "getNeo4jPasswordStatus" })
}, [])
```

---

### 3. neo4jConnectionTest

Тестирует подключение к Neo4j с предоставленными настройками.

**Location:** [`webviewMessageHandler.ts:3328-3416`](../../src/core/webview/webviewMessageHandler.ts:3328)

**Request:**

```typescript
{
  type: "neo4jConnectionTest",
  uri: string,        // Neo4j URI (bolt://, neo4j://, neo4j+s://)
  username: string,   // Имя пользователя
  database?: string   // База данных (default: "neo4j")
}
```

**Response (Success):**

```typescript
{
  type: "neo4jConnectionTestResult",
  success: true,
  version?: string    // Версия Neo4j (e.g., "5.15.0")
}
```

**Response (Error):**

```typescript
{
  type: "neo4jConnectionTestResult",
  success: false,
  error: string       // Сообщение об ошибке
}
```

**Implementation Details:**

```typescript
case "neo4jConnectionTest": {
  try {
    // 1. Валидация конфигурации
    if (!message.uri || !message.username) {
      throw new Error("Missing required configuration")
    }

    // 2. Получение пароля из SecretStorage
    const password = await provider.context.secrets.get(
      "codebaseIndexNeo4jPassword"
    )
    if (!password) {
      throw new Error("Password not configured")
    }

    // 3. Dynamic import Neo4jConnectionManager
    const { Neo4jConnectionManager } = await import(
      "../../services/neo4j/connection-manager"
    )

    // 4. Создание конфигурации с timeout 10s
    const config = {
      uri: message.uri,
      username: message.username,
      password: password,
      database: message.database || "neo4j",
      connectionTimeout: 10000
    }

    // 5. Подключение и test query
    const manager = Neo4jConnectionManager.getInstance()
    await manager.connect(config)

    // 6. Version detection
    const result = await manager.executeRead(
      "CALL dbms.components() YIELD versions RETURN versions[0] as version"
    )
    const version = result[0]?.version

    // 7. Disconnect cleanup
    await manager.disconnect()

    // 8. Success response
    await provider.postMessageToWebview({
      type: "neo4jConnectionTestResult",
      success: true,
      version: version,
    })
  } catch (error) {
    // 9. Error response
    await provider.postMessageToWebview({
      type: "neo4jConnectionTestResult",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
  break
}
```

**Timeout Handling:**

- Connection timeout: 10 секунд (10000ms)
- Автоматический disconnect в случае ошибки
- Retry логика отсутствует (single attempt)

**Common Errors:**

- `"Missing required configuration"` - отсутствуют обязательные поля
- `"Password not configured"` - пароль не сохранен
- `"Failed to connect to Neo4j: ..."` - ошибка подключения
- Connection timeout errors

---

## Структура данных в Neo4j

### Схема графа

Neo4j хранит кодовую базу как граф с узлами (entities) и связями (relationships).

#### Node Types (CodeEntity)

**Interface:** [`interfaces.ts:38-62`](../../src/services/neo4j/interfaces.ts:38)

```typescript
interface CodeEntity {
	id: string // "file:path:symbol" или "file:path"
	type: EntityType // Тип сущности
	name: string // Имя сущности
	filePath: string // Путь к файлу (относительно workspace)
	line: number // Номер строки
	column?: number // Номер колонки
	language: string // Язык программирования
	properties?: Record<string, any> // Дополнительные свойства
}
```

**Entity Types:** [`interfaces.ts:11-20`](../../src/services/neo4j/interfaces.ts:11)

```typescript
type EntityType =
	| "file" // Исходный файл
	| "function" // Функция или метод
	| "class" // Класс
	| "interface" // Интерфейс
	| "variable" // Переменная или константа
	| "import" // Import statement
	| "module" // Модуль или namespace
	| "type" // Type alias
```

#### Relationship Types (CodeRelationship)

**Interface:** [`interfaces.ts:67-88`](../../src/services/neo4j/interfaces.ts:67)

```typescript
interface CodeRelationship {
	fromId: string // ID исходной сущности
	toId: string // ID целевой сущности
	type: RelationshipType
	properties?: {
		line?: number // Строка, где определена связь
		strength?: number // Сила связи (0-1)
		[key: string]: any
	}
}
```

**Relationship Types:** [`interfaces.ts:24-33`](../../src/services/neo4j/interfaces.ts:24)

```typescript
type RelationshipType =
	| "imports" // A imports B
	| "calls" // A calls B
	| "inherits" // A inherits from B
	| "implements" // A implements B
	| "references" // A references B
	| "defines" // A defines B (file defines function)
	| "contains" // A contains B (class contains method)
	| "uses" // A uses B (generic)
	| "exports" // A exports B
```

### Индексы и Constraints

**Location:** [`graph-service.ts:30-75`](../../src/services/neo4j/graph-service.ts:30)

```cypher
-- Unique constraint на CodeEntity.id
CREATE CONSTRAINT entity_id_unique IF NOT EXISTS
FOR (e:CodeEntity) REQUIRE e.id IS UNIQUE

-- Index на type для быстрого поиска по типу
CREATE INDEX entity_type_idx IF NOT EXISTS
FOR (e:CodeEntity) ON (e.type)

-- Index на filePath для поиска по файлам
CREATE INDEX entity_filepath_idx IF NOT EXISTS
FOR (e:CodeEntity) ON (e.filePath)

-- Index на name для поиска по имени
CREATE INDEX entity_name_idx IF NOT EXISTS
FOR (e:CodeEntity) ON (e.name)
```

### Примеры Cypher запросов

#### 1. Создание entity

**Method:** [`graph-service.ts:80-104`](../../src/services/neo4j/graph-service.ts:80)

```cypher
MERGE (e:CodeEntity {id: $id})
SET e.type = $type,
    e.name = $name,
    e.filePath = $filePath,
    e.line = $line,
    e.column = $column,
    e.language = $language,
    e.properties = $properties,
    e.updatedAt = datetime()
RETURN e
```

#### 2. Создание relationship

**Method:** [`graph-service.ts:109-124`](../../src/services/neo4j/graph-service.ts:109)

```cypher
MATCH (from:CodeEntity {id: $fromId})
MATCH (to:CodeEntity {id: $toId})
MERGE (from)-[r:CALLS]->(to)
SET r.properties = $properties,
    r.updatedAt = datetime()
RETURN r
```

#### 3. Поиск зависимостей

**Method:** [`graph-service.ts:233-241`](../../src/services/neo4j/graph-service.ts:233)

```cypher
-- Найти все зависимости функции (глубина 1-3)
MATCH path = (e:CodeEntity {id: $entityId})-[*1..3]->(dep:CodeEntity)
RETURN DISTINCT dep
```

#### 4. Анализ влияния изменений

**Method:** [`graph-service.ts:246-256`](../../src/services/neo4j/graph-service.ts:246)

```cypher
-- Найти все сущности, которые зависят от данной
MATCH path = (dependent:CodeEntity)-[*1..3]->(e:CodeEntity {id: $entityId})
RETURN DISTINCT dependent
```

#### 5. Поиск путей между сущностями

**Method:** [`graph-service.ts:310-326`](../../src/services/neo4j/graph-service.ts:310)

```cypher
-- Кратчайший путь между двумя сущностями
MATCH path = shortestPath(
  (from:CodeEntity {id: $fromId})-[*1..5]-(to:CodeEntity {id: $toId})
)
RETURN [node in nodes(path) | node.id] AS pathIds
```

#### 6. Статистика графа

**Method:** [`graph-service.ts:424-466`](../../src/services/neo4j/graph-service.ts:424)

```cypher
-- Общее количество entities
MATCH (e:CodeEntity)
RETURN count(e) AS count

-- Количество relationships
MATCH ()-[r]->()
RETURN count(r) AS count

-- Entities по типам
MATCH (e:CodeEntity)
RETURN e.type AS type, count(e) AS count

-- Relationships по типам
MATCH ()-[r]->()
RETURN type(r) AS type, count(r) AS count
```

---

## React компоненты

### Neo4jSettings.tsx

**Location:** [`webview-ui/src/components/settings/neo4j/Neo4jSettings.tsx`](../../webview-ui/src/components/settings/neo4j/Neo4jSettings.tsx:1)

Главный компонент для управления настройками Neo4j.

**Props:**

```typescript
interface Neo4jSettingsProps {
	neo4jEnabled: boolean
	neo4jUri: string
	neo4jUsername: string
	neo4jDatabase: string
	onNeo4jEnabledChange: (enabled: boolean) => void
	onNeo4jUriChange: (uri: string) => void
	onNeo4jUsernameChange: (username: string) => void
	onNeo4jDatabaseChange: (database: string) => void
}
```

**State Management:**

```typescript
const [hasPassword, setHasPassword] = useState(false)
const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>("disconnected")
const [isTestingConnection, setIsTestingConnection] = useState(false)
const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
```

**Key Features:**

1. **URI Validation:**

```typescript
const validateUri = (uri: string): boolean => {
	const validProtocols = ["bolt://", "neo4j://", "neo4j+s://"]
	return validProtocols.some((protocol) => uri.startsWith(protocol))
}
```

2. **Password Status Check:**

```typescript
useEffect(() => {
	vscode.postMessage({ type: "getNeo4jPasswordStatus" })
}, [])
```

3. **Connection Testing:**

```typescript
const handleTestConnection = async () => {
	setIsTestingConnection(true)
	vscode.postMessage({
		type: "neo4jConnectionTest",
		uri: neo4jUri,
		username: neo4jUsername,
		database: neo4jDatabase,
	})
}
```

4. **Auto-reindex Trigger:**

```typescript
useEffect(() => {
	if (neo4jEnabled && hasPassword && connectionStatus === "connected") {
		// Trigger reindexing when configuration becomes valid
		vscode.postMessage({ type: "triggerReindex" })
	}
}, [neo4jEnabled, hasPassword, connectionStatus])
```

**Testing:** [`Neo4jSettings.spec.tsx`](../../webview-ui/src/components/settings/neo4j/Neo4jSettings.spec.tsx:1) - 25+ test cases

---

### PasswordField.tsx

**Location:** [`webview-ui/src/components/settings/neo4j/PasswordField.tsx`](../../webview-ui/src/components/settings/neo4j/PasswordField.tsx:1)

Компонент для безопасного ввода пароля с возможностью показа/скрытия.

**Props:**

```typescript
interface PasswordFieldProps {
	hasPassword: boolean // Пароль уже сохранен
	onPasswordChange: () => void // Callback при изменении пароля
}
```

**State:**

```typescript
const [password, setPassword] = useState("")
const [showPassword, setShowPassword] = useState(false)
const [isEditing, setIsEditing] = useState(false)
```

**Key Features:**

1. **Show/Hide Toggle:**

```typescript
<button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  className="absolute right-2 top-2"
>
  {showPassword ? <EyeOff /> : <Eye />}
</button>
```

2. **Edit Mode:**

```typescript
{hasPassword && !isEditing ? (
  <div>
    <span>••••••••</span>
    <button onClick={() => setIsEditing(true)}>Change</button>
  </div>
) : (
  <input type={showPassword ? 'text' : 'password'} />
)}
```

3. **Auto-save on Blur:**

```typescript
const handleBlur = () => {
	if (password) {
		vscode.postMessage({
			type: "setNeo4jPassword",
			neo4jPassword: password,
		})
		setPassword("")
		setIsEditing(false)
		onPasswordChange()
	}
}
```

**Security:**

- Password никогда не сохраняется в state после отправки
- Используется VSCode SecretStorage для хранения
- Input очищается после сохранения

**Testing:** [`PasswordField.spec.tsx`](../../webview-ui/src/components/settings/neo4j/PasswordField.spec.tsx:1) - 20+ test cases

---

### ConnectionStatus.tsx

**Location:** [`webview-ui/src/components/settings/neo4j/ConnectionStatus.tsx`](../../webview-ui/src/components/settings/neo4j/ConnectionStatus.tsx:1)

Индикатор статуса подключения с визуальной обратной связью.

**Props:**

```typescript
interface ConnectionStatusProps {
	status: "connected" | "disconnected" | "testing" | "error"
	error?: string
	version?: string
}
```

**Visual States:**

1. **Connected:**

```tsx
<div className="flex items-center text-green-500">
	<CheckCircle className="mr-2" />
	Connected {version && `(Neo4j ${version})`}
</div>
```

2. **Testing:**

```tsx
<div className="flex items-center text-blue-500">
	<Loader className="mr-2 animate-spin" />
	Testing connection...
</div>
```

3. **Error:**

```tsx
<div className="flex items-center text-red-500">
	<XCircle className="mr-2" />
	Connection failed: {error}
</div>
```

4. **Disconnected:**

```tsx
<div className="flex items-center text-gray-500">
	<Circle className="mr-2" />
	Not connected
</div>
```

**Error Handling:**

```typescript
const getErrorMessage = (error: string): string => {
	if (error.includes("authentication")) {
		return t("neo4j.errors.authentication")
	}
	if (error.includes("timeout")) {
		return t("neo4j.errors.timeout")
	}
	if (error.includes("ECONNREFUSED")) {
		return t("neo4j.errors.refused")
	}
	return error
}
```

**Testing:** [`ConnectionStatus.spec.tsx`](../../webview-ui/src/components/settings/neo4j/ConnectionStatus.spec.tsx:1) - 25+ test cases

---

## SecretStorage интеграция

### VSCode SecretStorage API

VSCode SecretStorage предоставляет безопасное хранилище для чувствительных данных с OS-level encryption.

**Key:** `codebaseIndexNeo4jPassword`

### API для сохранения/получения паролей

**Сохранение пароля:**

```typescript
// Backend (webviewMessageHandler.ts)
case "setNeo4jPassword": {
  await provider.contextProxy.storeSecret(
    "codebaseIndexNeo4jPassword",
    message.neo4jPassword
  )
  break
}
```

**Получение пароля:**

```typescript
// Backend (webviewMessageHandler.ts)
const password = await provider.context.secrets.get("codebaseIndexNeo4jPassword")
```

**Проверка наличия:**

```typescript
const hasPassword = !!(await provider.context.secrets.get("codebaseIndexNeo4jPassword"))
```

### Безопасность и Best Practices

✅ **DO:**

- Всегда используйте SecretStorage для паролей
- Очищайте password из state после отправки
- Проверяйте наличие пароля перед подключением
- Используйте type-safe message passing

❌ **DON'T:**

- Никогда не логируйте пароли
- Не сохраняйте пароли в localStorage
- Не передавайте пароли в URL параметрах
- Не храните пароли в конфигурационных файлах

**Security Features:**

1. **OS-level Encryption:** SecretStorage использует OS credential manager:

    - Windows: Credential Manager
    - macOS: Keychain
    - Linux: Secret Service API / libsecret

2. **Automatic Cleanup:** Пароли автоматически удаляются при удалении extension

3. **Per-workspace Isolation:** Secrets изолированы по workspace

---

## Connection Testing

### Workflow тестирования подключения

```
1. User clicks "Test Connection"
   ↓
2. Frontend validates input fields
   ↓
3. Frontend sends neo4jConnectionTest message
   ↓
4. Backend retrieves password from SecretStorage
   ↓
5. Backend creates Neo4jConnectionManager instance
   ↓
6. Connection attempt with 10s timeout
   ↓
7. Execute test query: CALL dbms.components()
   ↓
8. Extract Neo4j version
   ↓
9. Disconnect and cleanup
   ↓
10. Send result back to frontend
```

### Timeout и Retry логика

**Timeout Configuration:**

```typescript
const config = {
	uri: message.uri,
	username: message.username,
	password: password,
	database: message.database || "neo4j",
	connectionTimeout: 10000, // 10 секунд
}
```

**Connection Manager Timeout:** [`connection-manager.ts:64`](../../src/services/neo4j/connection-manager.ts:64)

```typescript
{
  maxConnectionLifetime: 3600000,  // 1 hour
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: config.connectionTimeout || 60000,
  disableLosslessIntegers: true
}
```

**Retry Logic:**

- **Single attempt** - нет автоматических retry
- При ошибке пользователь должен исправить настройки и повторить вручную
- Timeout ошибки показываются явно в UI

### Обработка различных типов ошибок

**1. Authentication Errors:**

```typescript
// Error: "Authentication failed"
// Причина: Неверный username или password
// Решение: Проверить credentials
```

**2. Connection Refused:**

```typescript
// Error: "ECONNREFUSED"
// Причина: Neo4j не запущен или неверный URI
// Решение: Запустить Neo4j, проверить URI
```

**3. Timeout Errors:**

```typescript
// Error: "Connection timeout"
// Причина: Neo4j не отвечает в течение 10s
// Решение: Проверить сеть, увеличить timeout
```

**4. Database Not Found:**

```typescript
// Error: "Database not found"
// Причина: Указана несуществующая база
// Решение: Создать базу или использовать "neo4j"
```

**5. Version Detection Failure:**

```typescript
// Error при dbms.components()
// Причина: Недостаточно прав или старая версия Neo4j
// Result: success=true, но version=undefined
```

**Error UI Display:**

```tsx
{
	connectionStatus === "error" && (
		<div className="text-red-500">
			<XCircle className="inline mr-2" />
			{t(`neo4j.errors.${getErrorKey(error)}`)}
			<button onClick={handleRetry}>Retry</button>
		</div>
	)
}
```

---

## Расширение функциональности

### Добавление новых полей настроек

**1. Добавьте поле в Settings State:**

```typescript
// src/core/config/ConfigManager.ts
export interface CodebaseIndexSettings {
	neo4jEnabled: boolean
	neo4jUri: string
	neo4jUsername: string
	neo4jDatabase: string
	neo4jNewField: string // ← Новое поле
}
```

**2. Добавьте props в Neo4jSettings:**

```typescript
interface Neo4jSettingsProps {
	// ... existing props
	neo4jNewField: string
	onNeo4jNewFieldChange: (value: string) => void
}
```

**3. Добавьте UI элемент:**

```tsx
<div className="mb-4">
	<label>{t("neo4j.newField")}</label>
	<input type="text" value={neo4jNewField} onChange={(e) => onNeo4jNewFieldChange(e.target.value)} />
</div>
```

**4. Добавьте локализацию:**

```typescript
// webview-ui/src/i18n/locales/en.json
{
  "neo4j": {
    "newField": "New Field",
    "newFieldPlaceholder": "Enter value..."
  }
}
```

**5. Обновите тесты:**

```typescript
// Neo4jSettings.spec.tsx
it('should update new field value', () => {
  const onNewFieldChange = vi.fn()
  render(<Neo4jSettings onNeo4jNewFieldChange={onNewFieldChange} />)

  const input = screen.getByLabelText('New Field')
  fireEvent.change(input, { target: { value: 'test' } })

  expect(onNewFieldChange).toHaveBeenCalledWith('test')
})
```

### Расширение валидации

**1. Добавьте validation rule:**

```typescript
const validateNewField = (value: string): string | null => {
	if (!value.trim()) {
		return t("neo4j.errors.newFieldRequired")
	}
	if (value.length < 3) {
		return t("neo4j.errors.newFieldTooShort")
	}
	return null
}
```

**2. Интегрируйте в форму:**

```typescript
const [validationErrors, setValidationErrors] = useState({
	uri: null,
	username: null,
	newField: null, // ← Добавить
})

const handleNewFieldChange = (value: string) => {
	const error = validateNewField(value)
	setValidationErrors((prev) => ({ ...prev, newField: error }))
	onNeo4jNewFieldChange(value)
}
```

**3. Покажите ошибку в UI:**

```tsx
;<input onChange={handleNewFieldChange} />
{
	validationErrors.newField && <div className="text-red-500 text-sm mt-1">{validationErrors.newField}</div>
}
```

### Добавление новых message handlers

**1. Определите message type:**

```typescript
// types.ts
interface NewActionMessage {
	type: "neo4jNewAction"
	param1: string
	param2: number
}
```

**2. Добавьте handler в webviewMessageHandler.ts:**

```typescript
case "neo4jNewAction": {
  try {
    // Валидация
    if (!message.param1 || !message.param2) {
      throw new Error("Missing parameters")
    }

    // Бизнес-логика
    const result = await performNewAction(message.param1, message.param2)

    // Ответ
    await provider.postMessageToWebview({
      type: "neo4jNewActionResult",
      success: true,
      data: result
    })
  } catch (error) {
    await provider.postMessageToWebview({
      type: "neo4jNewActionResult",
      success: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }
  break
}
```

**3. Добавьте frontend логику:**

```typescript
const handleNewAction = () => {
	vscode.postMessage({
		type: "neo4jNewAction",
		param1: "value1",
		param2: 42,
	})
}

useEffect(() => {
	const handler = (event: MessageEvent) => {
		if (event.data.type === "neo4jNewActionResult") {
			if (event.data.success) {
				// Handle success
			} else {
				// Handle error
			}
		}
	}
	window.addEventListener("message", handler)
	return () => window.removeEventListener("message", handler)
}, [])
```

### Testing новых фич

**1. Backend tests:**

```typescript
// webviewMessageHandler.spec.ts
describe("neo4jNewAction", () => {
	it("should handle new action successfully", async () => {
		const message = {
			type: "neo4jNewAction",
			param1: "test",
			param2: 123,
		}

		await handleMessage(message)

		expect(postMessageToWebview).toHaveBeenCalledWith({
			type: "neo4jNewActionResult",
			success: true,
			data: expect.any(Object),
		})
	})
})
```

**2. Frontend tests:**

```typescript
// Neo4jSettings.spec.tsx
it('should call new action handler', () => {
  const { getByText } = render(<Neo4jSettings />)

  fireEvent.click(getByText('New Action'))

  expect(vscode.postMessage).toHaveBeenCalledWith({
    type: 'neo4jNewAction',
    param1: expect.any(String),
    param2: expect.any(Number)
  })
})
```

---

## Testing Guidelines

### Структура тестов

**Total Coverage: 82 test cases**

```
webview-ui/src/components/settings/neo4j/
├── __tests__/
│   ├── Neo4jSettings.spec.tsx       (25+ tests)
│   ├── PasswordField.spec.tsx       (20+ tests)
│   └── ConnectionStatus.spec.tsx    (25+ tests)
└── __mocks__/
    └── vscode.ts
```

### Что покрывают unit тесты

#### Neo4jSettings Tests

**1. Rendering & Initialization:**

- ✅ Component renders without crashing
- ✅ All form fields are present
- ✅ Initial values are displayed correctly
- ✅ Password status is checked on mount

**2. Form Interactions:**

- ✅ URI input updates state
- ✅ Username input updates state
- ✅ Database input updates state
- ✅ Enable toggle works correctly

**3. Validation:**

- ✅ URI validation (bolt://, neo4j://, neo4j+s://)
- ✅ Required field validation
- ✅ Error messages display correctly

**4. Connection Testing:**

- ✅ Test button triggers connection test
- ✅ Loading state during test
- ✅ Success state handling
- ✅ Error state handling

**5. Message Passing:**

- ✅ Password status check message
- ✅ Connection test message with correct params
- ✅ Response handling

#### PasswordField Tests

**1. Rendering:**

- ✅ Shows placeholder when no password
- ✅ Shows masked password when set
- ✅ Edit button appears when password exists

**2. Show/Hide Toggle:**

- ✅ Password is hidden by default
- ✅ Click eye icon reveals password
- ✅ Click again hides password

**3. Edit Mode:**

- ✅ Click edit enables input
- ✅ Input is focused
- ✅ Cancel restores previous state

**4. Save Functionality:**

- ✅ Blur saves password
- ✅ Message sent to backend
- ✅ Input is cleared after save
- ✅ Callback is triggered

**5. Security:**

- ✅ Password never stored in component state after save
- ✅ Input type toggles between password/text

#### ConnectionStatus Tests

**1. Visual States:**

- ✅ Disconnected state renders correctly
- ✅ Testing state shows spinner
- ✅ Connected state shows checkmark
- ✅ Error state shows error icon

**2. Version Display:**

- ✅ Version shown when connected
- ✅ No version when not provided

**3. Error Handling:**

- ✅ Authentication errors formatted correctly
- ✅ Timeout errors formatted correctly
- ✅ Connection refused errors formatted correctly
- ✅ Generic errors displayed

**4. Localization:**

- ✅ All text is translatable
- ✅ Error messages use i18n keys

### Как писать новые тесты

**Test Structure:**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Neo4jSettings from './Neo4jSettings'

describe('Neo4jSettings', () => {
  // Setup
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test cases
  it('should do something', () => {
    // Arrange
    const mockCallback = vi.fn()

    // Act
    const { getByText } = render(
      <Neo4jSettings onNeo4jEnabledChange={mockCallback} />
    )
    fireEvent.click(getByText('Enable'))

    // Assert
    expect(mockCallback).toHaveBeenCalledWith(true)
  })
})
```

**Testing Message Passing:**

```typescript
it('should send message on action', () => {
  // Mock postMessage
  const postMessage = vi.fn()
  global.vscode = { postMessage }

  const { getByText } = render(<Neo4jSettings />)
  fireEvent.click(getByText('Test Connection'))

  expect(postMessage).toHaveBeenCalledWith({
    type: 'neo4jConnectionTest',
    uri: expect.any(String),
    username: expect.any(String),
    database: expect.any(String)
  })
})
```

**Testing Async Operations:**

```typescript
it('should handle async response', async () => {
  const { getByText } = render(<Neo4jSettings />)

  // Trigger action
  fireEvent.click(getByText('Test'))

  // Simulate message response
  act(() => {
    window.dispatchEvent(new MessageEvent('message', {
      data: {
        type: 'neo4jConnectionTestResult',
        success: true
      }
    }))
  })

  // Wait for UI update
  await waitFor(() => {
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })
})
```

### Mocking стратегии

**1. Mock VSCode API:**

```typescript
// __mocks__/vscode.ts
export const vscode = {
	postMessage: vi.fn(),
	getState: vi.fn(() => ({})),
	setState: vi.fn(),
}

global.acquireVsCodeApi = () => vscode
```

**2. Mock Message Event:**

```typescript
const mockMessageEvent = (data: any) => {
	window.dispatchEvent(new MessageEvent("message", { data }))
}

// Usage
mockMessageEvent({
	type: "neo4jPasswordStatus",
	hasNeo4jPassword: true,
})
```

**3. Mock Neo4jConnectionManager:**

```typescript
vi.mock("../../services/neo4j/connection-manager", () => ({
	Neo4jConnectionManager: {
		getInstance: () => ({
			connect: vi.fn().mockResolvedValue(undefined),
			disconnect: vi.fn().mockResolvedValue(undefined),
			executeRead: vi.fn().mockResolvedValue([{ version: "5.15.0" }]),
		}),
	},
}))
```

**Running Tests:**

```bash
# Frontend tests
cd webview-ui
pnpm test src/components/settings/neo4j/Neo4jSettings.spec.tsx

# Backend tests (when available)
cd src
pnpm test core/webview/webviewMessageHandler.spec.ts

# All tests with coverage
pnpm test --coverage
```

---

## Дополнительные ресурсы

### Связанные файлы

- [`neo4j-settings-ui.md`](../workflowai/neo4j-settings-ui.md) - Архитектурная спецификация
- [`neo4j-configuration.md`](../neo4j-configuration.md) - Пользовательская документация
- [`interfaces.ts`](../../src/services/neo4j/interfaces.ts) - TypeScript интерфейсы
- [`connection-manager.ts`](../../src/services/neo4j/connection-manager.ts) - Менеджер подключений
- [`graph-service.ts`](../../src/services/neo4j/graph-service.ts) - Сервис работы с графом

### Neo4j Documentation

- [Neo4j Driver Manual](https://neo4j.com/docs/javascript-manual/current/)
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/)
- [Neo4j Performance Tuning](https://neo4j.com/docs/operations-manual/current/performance/)

### VSCode Extension APIs

- [SecretStorage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)

---

## Changelog

### Version 4.136.0 (2025-12-13)

**Added:**

- Neo4j Settings UI with visual configuration interface
- Secure password storage using VSCode SecretStorage
- Connection testing with real-time status updates
- Full localization support (English/Russian)
- 82 unit tests covering all Neo4j settings functionality

**Features:**

- Toggle to enable/disable Neo4j integration
- URI validation for bolt://, neo4j://, neo4j+s:// protocols
- Username and database name configuration
- Secure password input with show/hide toggle
- Connection status indicator with detailed error messages
- Automatic reindexing trigger on configuration changes

**Technical Details:**

- React components: Neo4jSettings, PasswordField, ConnectionStatus
- Backend message handlers for settings and connection testing
- Integration with VSCode SecretStorage API
- Comprehensive validation and error handling
