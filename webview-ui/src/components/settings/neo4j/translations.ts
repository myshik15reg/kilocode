export const neo4jTranslations = {
	en: {
		label: "Neo4j Graph Database",
		description: "Enable Neo4j as a vector store for codebase indexing",
		uri: {
			label: "Neo4j URI",
			placeholder: "bolt://localhost:7687",
			error: "URI must start with bolt://, neo4j://, or neo4j+s://",
			emptyError: "URI cannot be empty",
		},
		username: {
			label: "Username",
			placeholder: "neo4j",
			error: "Username cannot be empty",
		},
		database: {
			label: "Database",
			placeholder: "neo4j",
			error: "Database name cannot be empty",
		},
		password: {
			label: "Password",
			setButton: "Set Password",
			showButton: "Show",
			hideButton: "Hide",
			statusSet: "Password is set",
			statusNotSet: "No password set",
		},
		connection: {
			status: "Connection Status",
			testButton: "Test Connection",
			testing: "Testing...",
			connected: "Connected to Neo4j",
			disconnected: "Not connected",
			error: "Connection failed",
		},
		warning: "⚠️ Changing Neo4j settings will require reindexing your codebase.",
	},
	ru: {
		label: "Графовая БД Neo4j",
		description: "Использовать Neo4j как хранилище векторов для индексации кодовой базы",
		uri: {
			label: "URI Neo4j",
			placeholder: "bolt://localhost:7687",
			error: "URI должен начинаться с bolt://, neo4j:// или neo4j+s://",
			emptyError: "URI не может быть пустым",
		},
		username: {
			label: "Имя пользователя",
			placeholder: "neo4j",
			error: "Имя пользователя не может быть пустым",
		},
		database: {
			label: "База данных",
			placeholder: "neo4j",
			error: "Имя базы данных не может быть пустым",
		},
		password: {
			label: "Пароль",
			setButton: "Установить пароль",
			showButton: "Показать",
			hideButton: "Скрыть",
			statusSet: "Пароль установлен",
			statusNotSet: "Пароль не установлен",
		},
		connection: {
			status: "Статус подключения",
			testButton: "Проверить подключение",
			testing: "Проверка...",
			connected: "Подключено к Neo4j",
			disconnected: "Не подключено",
			error: "Ошибка подключения",
		},
		warning: "⚠️ Изменение настроек Neo4j потребует переиндексации кодовой базы.",
	},
}

// Hook для использования переводов с i18n
export const useNeo4jTranslations = (language: "en" | "ru" = "en") => {
	return neo4jTranslations[language]
}