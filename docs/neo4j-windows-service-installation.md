# Установка Neo4j как службы Windows на Windows Server 2019

## 📋 Требования

- **ОС:** Windows Server 2019 или выше
- **Java:** OpenJDK 17 или 21 (Neo4j 5.x)
- **RAM:** Минимум 2 GB, рекомендуется 4+ GB
- **Диск:** Минимум 10 GB свободного места
- **Права:** Администратор Windows

---

## 🔧 Шаг 1: Установка Java

Neo4j 5.x требует Java 17 или 21.

### Проверка наличия Java

```powershell
# Откройте PowerShell от имени администратора
java -version
```

### Если Java не установлена

```powershell
# Вариант 1: Скачать OpenJDK 21 от Microsoft
# https://learn.microsoft.com/en-us/java/openjdk/download

# Вариант 2: Через winget (если доступен)
winget install Microsoft.OpenJDK.21

# Вариант 3: Adoptium Temurin
# https://adoptium.net/temurin/releases/
```

### Настройка JAVA_HOME

```powershell
# Установить переменную окружения JAVA_HOME
setx JAVA_HOME "C:\Program Files\Microsoft\jdk-21.0.x" /M

# Добавить в PATH
setx PATH "%PATH%;%JAVA_HOME%\bin" /M

# Перезапустить PowerShell и проверить
java -version
```

---

## 📦 Шаг 2: Скачивание Neo4j Community Edition

### Вариант A: Через инсталлятор (.exe)

```powershell
# 1. Скачать Neo4j Community Edition
# https://neo4j.com/deployment-center/

# 2. Запустить neo4j-community-5.x.x-windows.exe

# 3. Следовать мастеру установки
# - Выбрать папку установки: C:\neo4j
# - Установить как Windows Service: ✅ ДА
# - Задать порты: 7474 (HTTP), 7687 (Bolt)
# - Задать пароль для пользователя neo4j
```

### Вариант B: Через ZIP (ручная установка)

```powershell
# 1. Скачать neo4j-community-5.x.x-windows.zip
# https://neo4j.com/deployment-center/

# 2. Распаковать в C:\neo4j
Expand-Archive -Path "neo4j-community-5.x.x-windows.zip" -DestinationPath "C:\"

# 3. Переименовать папку для удобства
Rename-Item "C:\neo4j-community-5.x.x" "C:\neo4j"
```

---

## ⚙️ Шаг 3: Настройка Neo4j

### Базовая конфигурация

```powershell
# Открыть файл конфигурации
notepad C:\neo4j\conf\neo4j.conf
```

### Ключевые настройки

```properties
# neo4j.conf

# ============= Network Settings =============
# Адрес для прослушивания (0.0.0.0 = все интерфейсы)
server.default_listen_address=0.0.0.0

# HTTP порт (Neo4j Browser)
server.http.enabled=true
server.http.listen_address=:7474

# Bolt порт (драйверы подключаются сюда)
server.bolt.enabled=true
server.bolt.listen_address=:7687

# ============= Security =============
# Включить аутентификацию
dbms.security.auth_enabled=true

# ============= Database =============
# База данных по умолчанию
initial.dbms.default_database=kilocode

# ============= Memory Settings =============
# Initial heap size (рекомендуется половина от доступной RAM)
server.memory.heap.initial_size=1G
server.memory.heap.max_size=2G

# Page cache (для графа)
server.memory.pagecache.size=512M

# ============= Logging =============
server.logs.gc.enabled=true
server.logs.debug.enabled=false
```

---

## 🔐 Шаг 4: Установка как Windows Service

### Через инсталлятор (.exe)

Если вы использовали .exe инсталлятор, служба уже установлена. Переходите к Шагу 5.

### Ручная установка службы (ZIP вариант)

```powershell
# Открыть PowerShell от имени администратора
cd C:\neo4j\bin

# Установить Neo4j как службу Windows
.\neo4j.bat install-service

# Вывод должен быть:
# Neo4j service installed
```

### Настройка службы

```powershell
# Открыть Services.msc
services.msc

# Найти службу "Neo4j"
# Свойства → Общие
# - Тип запуска: Автоматически
# - Запустить службу
```

### Через PowerShell

```powershell
# Настроить автозапуск
Set-Service -Name Neo4j -StartupType Automatic

# Запустить службу
Start-Service -Name Neo4j

# Проверить статус
Get-Service -Name Neo4j

# Должен показать: Status = Running
```

---

## 🔥 Шаг 5: Настройка Firewall

```powershell
# Открыть порты в Windows Firewall

# HTTP порт (Neo4j Browser)
New-NetFirewallRule -DisplayName "Neo4j HTTP" -Direction Inbound -LocalPort 7474 -Protocol TCP -Action Allow

# Bolt порт (драйверы)
New-NetFirewallRule -DisplayName "Neo4j Bolt" -Direction Inbound -LocalPort 7687 -Protocol TCP -Action Allow

# Проверить правила
Get-NetFirewallRule -DisplayName "Neo4j*"
```

---

## 🧪 Шаг 6: Проверка установки

### Проверка службы

```powershell
# Статус службы
sc query Neo4j

# Или через PowerShell
Get-Service -Name Neo4j | Format-List
```

### Проверка через браузер

```
1. Открыть браузер
2. Перейти на http://localhost:7474
3. Должен открыться Neo4j Browser
4. Войти:
   - Username: neo4j
   - Password: neo4j
5. Система попросит сменить пароль
6. Задать новый пароль (например: YourSecurePassword123)
```

### Проверка через Cypher

```cypher
// В Neo4j Browser выполнить
:sysinfo

// Создать тестовую базу данных
CREATE DATABASE kilocode IF NOT EXISTS;

// Переключиться на неё
:use kilocode

// Создать тестовый узел
CREATE (n:Test {name: 'Hello from Kilocode'}) RETURN n;

// Удалить тестовый узел
MATCH (n:Test) DELETE n;
```

### Проверка через PowerShell

```powershell
# Проверка доступности через Bolt
Test-NetConnection -ComputerName localhost -Port 7687

# Должно показать: TcpTestSucceeded : True
```

---

## 🔧 Управление службой

### Запуск/остановка службы

```powershell
# Запустить
Start-Service -Name Neo4j

# Остановить
Stop-Service -Name Neo4j

# Перезапустить
Restart-Service -Name Neo4j

# Статус
Get-Service -Name Neo4j
```

### Просмотр логов

```powershell
# Логи находятся в:
# C:\neo4j\logs\

# Основной лог
notepad C:\neo4j\logs\neo4j.log

# Лог службы Windows
notepad C:\neo4j\logs\service-error.log

# Через PowerShell (последние 50 строк)
Get-Content C:\neo4j\logs\neo4j.log -Tail 50
```

### Удаление службы (если нужно переустановить)

```powershell
# Остановить службу
Stop-Service -Name Neo4j

# Удалить службу
cd C:\neo4j\bin
.\neo4j.bat uninstall-service

# Подтверждение
# Neo4j service uninstalled
```

---

## 📊 Настройка для Kilocode

### Конфигурация в Kilocode

После успешной установки настройте Kilocode:

```json
// settings.json в VSCode
{
  "kilocode.codebaseIndex.neo4j.enabled": true,
  "kilocode.codebaseIndex.neo4j.uri": "bolt://localhost:7687",
  "kilocode.codebaseIndex.neo4j.username": "neo4j",
  "kilocode.codebaseIndex.neo4j.database": "kilocode"
}
```

### Пароль через SecretStorage

Пароль НЕ должен храниться в settings.json. Kilocode будет запрашивать его при первом подключении и сохранять в VSCode SecretStorage.

---

## 🚨 Устранение неполадок

### Служба не запускается

```powershell
# Проверить логи
Get-Content C:\neo4j\logs\service-error.log -Tail 20

# Частые проблемы:
# 1. Java не найдена → проверить JAVA_HOME
java -version

# 2. Порт занят → проверить, что порты 7474/7687 свободны
netstat -ano | findstr "7474"
netstat -ano | findstr "7687"

# 3. Недостаточно прав → запустить PowerShell от администратора
```

### Java не найдена

```powershell
# Проверить JAVA_HOME
echo %JAVA_HOME%

# Если пустой, установить
setx JAVA_HOME "C:\Program Files\Microsoft\jdk-21.0.x" /M

# Перезапустить службу
Restart-Service -Name Neo4j
```

### Не могу подключиться к localhost:7474

```powershell
# 1. Проверить, что служба запущена
Get-Service -Name Neo4j

# 2. Проверить firewall
Get-NetFirewallRule -DisplayName "Neo4j*"

# 3. Проверить, слушает ли Neo4j на порту
netstat -ano | findstr "7474"

# 4. Проверить логи
Get-Content C:\neo4j\logs\neo4j.log -Tail 50
```

### Забыли пароль

```powershell
# Сбросить пароль
cd C:\neo4j\bin

# Остановить службу
Stop-Service -Name Neo4j

# Запустить сброс пароля
.\neo4j-admin.bat dbms set-initial-password YourNewPassword123

# Запустить службу
Start-Service -Name Neo4j
```

---

## 📚 Дополнительные ресурсы

- [Neo4j Windows Installation Guide](https://neo4j.com/docs/operations-manual/current/installation/windows/)
- [Neo4j Configuration Reference](https://neo4j.com/docs/operations-manual/current/configuration/)
- [Neo4j Windows Service](https://neo4j.com/docs/operations-manual/current/installation/windows/#windows-service)

---

## ✅ Чеклист готовности

- [ ] Java 17/21 установлена и настроена
- [ ] Neo4j Community Edition скачана
- [ ] Neo4j установлена в C:\neo4j
- [ ] neo4j.conf настроен
- [ ] Служба Neo4j установлена
- [ ] Тип запуска: Автоматически
- [ ] Служба запущена (Status = Running)
- [ ] Firewall правила созданы
- [ ] http://localhost:7474 доступен
- [ ] Пароль изменён с дефолтного
- [ ] База данных kilocode создана
- [ ] Тестовое подключение успешно

---

*Документ создан: 2025-12-13*  
*Версия: 1.0*  
*ОС: Windows Server 2019*  
*Neo4j версия: 5.x Community Edition*