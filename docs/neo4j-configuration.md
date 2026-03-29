# Neo4j Configuration Guide

## Table of Contents

- [Introduction](#introduction)
- [Requirements](#requirements)
- [Installing Neo4j](#installing-neo4j)
- [Configuration via UI](#configuration-via-ui)
- [Validation and Errors](#validation-and-errors)
- [Security](#security)
- [Reindexing](#reindexing)
- [Troubleshooting](#troubleshooting)
- [Configuration Examples](#configuration-examples)
- [Glossary (EN/RU)](#glossary-enru)

---

## Introduction

### What is Neo4j?

Neo4j is a leading graph database that stores data as nodes and relationships, making it ideal for representing and querying complex, interconnected data structures. In AlfaCode assistant, Neo4j serves as an optional vector store provider for codebase indexing, working alongside Qdrant to provide enhanced code understanding capabilities.

### Why Use Neo4j in AlfaCode assistant?

**Benefits of Neo4j for Code Indexing:**

- 🔍 **Enhanced Code Relationships** - Graph structure naturally represents code dependencies, inheritance hierarchies, and call graphs
- ⚡ **Fast Traversal Queries** - Efficient navigation through related code entities (classes, functions, modules)
- 🎯 **Semantic Code Search** - Better understanding of code context through relationship-based queries
- 🔄 **Hybrid Approach** - Works together with Qdrant for optimal semantic and structural search

### How Neo4j Works with Qdrant

AlfaCode assistant uses a **hybrid indexing approach**:

- **Qdrant** - Primary vector database for semantic similarity search
- **Neo4j** - Optional graph database for relationship-based queries and code structure analysis
- Together they provide both semantic understanding (Qdrant) and structural context (Neo4j)

---

## Requirements

### Minimum Neo4j Version

- **Neo4j 5.x or higher** recommended
- Compatible with Neo4j 4.4+ (with limited features)

### Supported Protocols

AlfaCode assistant supports the following connection protocols:

| Protocol     | Description                       | Use Case               |
| ------------ | --------------------------------- | ---------------------- |
| `bolt://`    | Standard unencrypted connection   | Local development      |
| `neo4j://`   | Neo4j routing protocol            | Neo4j clusters         |
| `neo4j+s://` | Encrypted connection with SSL/TLS | Production, Neo4j Aura |

### System Requirements

- **Network Access** - Ability to connect to Neo4j server (default port: 7687)
- **VSCode Version** - VSCode 1.75.0 or higher
- **Storage** - Adequate disk space for indexed codebase (varies by project size)

---

## Installing Neo4j

### Option 1: Neo4j Desktop (Recommended for Local Development)

Neo4j Desktop provides the easiest way to run Neo4j locally with a graphical interface.

**Installation Steps:**

1. Download Neo4j Desktop from [neo4j.com/download](https://neo4j.com/download/)
2. Install and launch Neo4j Desktop
3. Create a new project
4. Add a new database (DBMS)
5. Set username (default: `neo4j`) and password
6. Start the database
7. Note the connection URI (typically `bolt://localhost:7687`)

📚 **Official Documentation:** [Neo4j Desktop Installation Guide](https://neo4j.com/docs/desktop-manual/current/installation/)

### Option 2: Neo4j Aura (Cloud Managed)

Neo4j Aura provides a fully managed cloud database solution.

**Setup Steps:**

1. Sign up at [neo4j.com/cloud/aura](https://neo4j.com/cloud/aura/)
2. Create a new Aura instance
3. Save the connection URI (format: `neo4j+s://xxxxxxxx.databases.neo4j.io`)
4. Save the generated password securely
5. Note the username (typically `neo4j`)

### Option 3: Docker Container

For containerized deployments:

```bash
docker run \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your-password \
  neo4j:latest
```

**Connection URI:** `bolt://localhost:7687`

---

## Configuration via UI

### Step 1: Open AlfaCode assistant Settings

1. Open VSCode Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "AlfaCode assistant: Settings"
3. Press Enter to open the Settings panel

### Step 2: Locate Neo4j Configuration Section

Scroll down to find the **"Neo4j Graph Database"** section within Context Management settings.

### Step 3: Enable Neo4j

Toggle the **"Enable Neo4j Graph Database"** checkbox to activate Neo4j indexing.

### Step 4: Configure Connection Fields

#### Neo4j URI

The connection address to your Neo4j server.

- **Label:** Neo4j URI
- **Required:** Yes
- **Format:** `protocol://host:port`

**Examples:**

- Local: `bolt://localhost:7687`
- Remote: `bolt://192.168.1.100:7687`
- Aura: `neo4j+s://xxxxxxxx.databases.neo4j.io`

#### Username

The Neo4j database username.

- **Label:** Username
- **Required:** Yes
- **Default:** `neo4j`

Most Neo4j installations use `neo4j` as the default username.

#### Database

The target database name within Neo4j.

- **Label:** Database
- **Required:** Yes
- **Default:** `neo4j`

Neo4j uses `neo4j` as the default database name. Custom database names are supported for enterprise deployments.

#### Password

Your Neo4j database password.

- **Label:** Password
- **Storage:** Secure (VSCode SecretStorage)
- **Required:** Yes for connection testing

**How to Set Password:**

1. Enter your password in the password field
2. Click **"Set Password"** button
3. Password is securely stored in VSCode SecretStorage
4. Field clears after successful save
5. Green indicator shows "Password is set"

**Password Visibility:**

- Click the 👁️ icon to toggle password visibility
- Use this to verify correct password entry before saving

### Step 5: Test Connection

Before completing setup, verify your connection:

1. Ensure all fields are filled correctly
2. Password must be set (green indicator visible)
3. Click **"Test Connection"** button
4. Wait for connection status to update

**Connection Statuses:**

| Status            | Indicator            | Meaning                         |
| ----------------- | -------------------- | ------------------------------- |
| Not connected     | ⚪ Gray              | No connection attempt made      |
| Connecting...     | 🟡 Yellow (spinning) | Testing connection in progress  |
| Connected         | 🟢 Green             | Successfully connected to Neo4j |
| Connection failed | 🔴 Red               | Connection error (see message)  |

### Step 6: Save Configuration

1. Review all settings
2. Note the warning: _"⚠️ Changing Neo4j settings will require reindexing your codebase."_
3. Settings are automatically saved as you type
4. Connection test is independent of saving

---

## Validation and Errors

### URI Validation Rules

The Neo4j URI must meet the following criteria:

✅ **Valid URI formats:**

- `bolt://localhost:7687`
- `neo4j://localhost:7687`
- `neo4j+s://xxxxx.databases.neo4j.io`

❌ **Invalid URI formats:**

- `http://localhost:7687` (wrong protocol)
- `localhost:7687` (missing protocol)
- Empty or whitespace-only

**Error Messages:**

- "URI must start with bolt://, neo4j://, or neo4j+s://"
- "URI cannot be empty"

### Username Validation Rules

✅ **Valid:** Any non-empty string
❌ **Invalid:** Empty or whitespace-only

**Error Message:** "Username cannot be empty"

### Database Validation Rules

✅ **Valid:** Any non-empty string
❌ **Invalid:** Empty or whitespace-only

**Error Message:** "Database name cannot be empty"

### Common Error Scenarios

#### Validation Errors

When validation fails:

- Error message appears in red below the field
- "Test Connection" button is disabled
- Settings can still be saved (but connection will fail)

#### Connection Test Errors

**"Password is required for connection test"**

- **Cause:** No password set and field is empty
- **Solution:** Enter password and click "Set Password"

**"Connection failed: Authentication failed"**

- **Cause:** Incorrect username or password
- **Solution:** Verify credentials and update password

**"Connection failed: Connection refused"**

- **Cause:** Neo4j server not running or wrong URI
- **Solution:** Check server status and URI

**"Connection failed: SSL required"**

- **Cause:** Server requires SSL but using `bolt://`
- **Solution:** Use `neo4j+s://` protocol

---

## Security

### How Passwords Are Stored

**VSCode SecretStorage** provides secure credential storage:

- Passwords are encrypted using OS-level security mechanisms
- Windows: Windows Credential Store
- macOS: Keychain
- Linux: Secret Service API / libsecret

**What is NOT stored:**

- Passwords are never saved in settings files
- Passwords are never committed to version control
- Passwords are never logged or transmitted insecurely

### Why SecretStorage?

Traditional VSCode settings are stored in plain text JSON files. For security, AlfaCode assistant uses VSCode's SecretStorage API:

✅ **Advantages:**

- Operating system encryption
- Isolated per-user storage
- No accidental exposure in settings
- Automatic cleanup on extension uninstall

### Removing Saved Password

To delete a stored password:

1. Uninstall AlfaCode assistant (or clear extension storage)
2. Reinstall or reconfigure

Alternatively, simply set a new password to overwrite the existing one.

### Security Best Practices

1. **Use Strong Passwords** - Minimum 12 characters with mixed case, numbers, symbols
2. **Enable SSL/TLS** - Use `neo4j+s://` for production environments
3. **Limit Network Access** - Use firewall rules to restrict database access
4. **Regular Updates** - Keep Neo4j server updated with security patches
5. **Monitor Access** - Review Neo4j logs for unauthorized access attempts

---

## Reindexing

### When Reindexing is Required

Changing any Neo4j configuration setting requires reindexing your codebase:

- ✏️ URI changes (switching databases)
- 👤 Username changes
- 🗄️ Database name changes
- 🔐 Password changes
- ✅ Enabling/disabling Neo4j

### How to Reindex

**Manual Reindexing:**

1. Open VSCode Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "AlfaCode assistant: Reindex Codebase"
3. Press Enter to start reindexing
4. Wait for completion (progress shown in status bar)

### What Happens During Reindexing

1. **Existing Data** - Previous Neo4j index data is cleared
2. **File Scanning** - Codebase files are scanned
3. **Graph Creation** - Code entities and relationships are indexed in Neo4j
4. **Vector Indexing** - Semantic embeddings are created (Qdrant)
5. **Completion** - Both indexes are synchronized

**Note:** Reindexing can take several minutes for large codebases.

### Performance Considerations

| Codebase Size            | Estimated Time | Notes                         |
| ------------------------ | -------------- | ----------------------------- |
| Small (<1000 files)      | 1-2 minutes    | Fast initial setup            |
| Medium (1000-5000 files) | 5-10 minutes   | Recommended coffee break ☕   |
| Large (5000+ files)      | 15+ minutes    | Consider incremental indexing |

---

## Troubleshooting

### Connection Issues

#### Problem: "Connection refused" or "Cannot connect"

**Possible Causes:**

1. Neo4j server not running
2. Incorrect URI or port
3. Firewall blocking connection

**Solutions:**

- Verify Neo4j server is running (check Neo4j Desktop or `docker ps`)
- Test connection with Neo4j Browser (`http://localhost:7474`)
- Check firewall rules allow port 7687
- Verify URI format and hostname/IP address

#### Problem: "Authentication failed"

**Possible Causes:**

1. Wrong username or password
2. User account doesn't exist
3. Account locked due to failed attempts

**Solutions:**

- Verify username (default is `neo4j`)
- Reset password via Neo4j Desktop or `neo4j-admin`
- Check Neo4j server logs for authentication errors
- Wait if account is temporarily locked

#### Problem: "Database does not exist"

**Possible Causes:**

1. Database name misspelled
2. Database not created in Neo4j

**Solutions:**

- Verify database name (default is `neo4j`)
- Create database via Neo4j Browser: `CREATE DATABASE yourdbname`
- Check available databases: `SHOW DATABASES`

### SSL/TLS Certificate Issues

#### Problem: "Certificate verification failed"

**Possible Causes:**

1. Self-signed certificate not trusted
2. Certificate expired
3. Hostname mismatch

**Solutions:**

- For development: Use `bolt://` instead of `neo4j+s://`
- For production: Ensure valid SSL certificate
- For Aura: Verify connection string is correct

### Performance Issues

#### Problem: Slow indexing or queries

**Possible Causes:**

1. Large codebase
2. Insufficient Neo4j memory
3. Network latency (remote connections)
4. Unoptimized Neo4j configuration

**Solutions:**

- Increase Neo4j heap size in `neo4j.conf`:
    ```
    dbms.memory.heap.initial_size=2G
    dbms.memory.heap.max_size=4G
    ```
- Use local Neo4j instance for development
- Optimize Neo4j with proper indexes
- Monitor Neo4j performance via Neo4j Browser

### General Troubleshooting Steps

1. **Check Neo4j Server Logs**

    - Desktop: Settings → Open Folder → logs
    - Docker: `docker logs neo4j`

2. **Verify Connection with Neo4j Browser**

    - Navigate to `http://localhost:7474`
    - Test same credentials manually

3. **Check AlfaCode assistant logs**

    - VSCode Output panel
    - Select "AlfaCode assistant" from dropdown

4. **Test Network Connectivity**
    ```bash
    # Test if port is open
    telnet localhost 7687
    # Or use nc (netcat)
    nc -zv localhost 7687
    ```

---

## Configuration Examples

### Local Development (Neo4j Desktop)

**Scenario:** Running Neo4j Desktop on your local machine for development.

```
URI:      bolt://localhost:7687
Username: neo4j
Database: neo4j
Password: your-dev-password
```

**Setup Steps:**

1. Install Neo4j Desktop
2. Create new database
3. Set password during creation
4. Start database
5. Use the settings above in AlfaCode assistant

**Pros:**

- ✅ Easy setup with GUI
- ✅ No network configuration needed
- ✅ Built-in Neo4j Browser

**Cons:**

- ❌ Manual startup required
- ❌ Local only (not accessible remotely)

### Production (Neo4j Aura Cloud)

**Scenario:** Using managed Neo4j Aura for production deployment.

```
URI:      neo4j+s://xxxxx.databases.neo4j.io
Username: neo4j
Database: neo4j
Password: your-aura-password
```

**Setup Steps:**

1. Create Neo4j Aura account
2. Create new AuraDB instance
3. Save generated password
4. Copy connection URI
5. Configure in AlfaCode assistant

**Pros:**

- ✅ Fully managed (no maintenance)
- ✅ Automatic backups
- ✅ SSL/TLS by default
- ✅ Scalable

**Cons:**

- ❌ Costs money (free tier available)
- ❌ Internet connection required
- ❌ Potential latency

### Docker Container (Local)

**Scenario:** Running Neo4j in Docker for isolated development environment.

```bash
# Start Neo4j container
docker run -d \
  --name neo4j-dev \
  -p 7474:7474 \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/devpassword \
  -v neo4j-data:/data \
  neo4j:latest
```

**AlfaCode assistant configuration:**

```
URI:      bolt://localhost:7687
Username: neo4j
Database: neo4j
Password: devpassword
```

**Pros:**

- ✅ Isolated environment
- ✅ Easy to reset/recreate
- ✅ Consistent across team
- ✅ Version control (via docker-compose)

**Cons:**

- ❌ Requires Docker knowledge
- ❌ Additional resource usage

### Docker Container (Remote Server)

**Scenario:** Neo4j running in Docker on a remote server.

```bash
# On remote server (192.168.1.100)
docker run -d \
  --name neo4j-server \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/serverpassword \
  neo4j:latest
```

**AlfaCode assistant configuration:**

```
URI:      bolt://192.168.1.100:7687
Username: neo4j
Database: neo4j
Password: serverpassword
```

**Security Note:** For production use, configure SSL/TLS and use `neo4j+s://`.

### Neo4j Cluster Configuration

**Scenario:** Connecting to Neo4j cluster with routing.

```
URI:      neo4j://cluster.example.com:7687
Username: neo4j
Database: production
Password: cluster-password
```

**Cluster Benefits:**

- High availability
- Load balancing
- Automatic failover

**Note:** Use `neo4j://` protocol for routing driver to work properly.

---

## Glossary (EN/RU)

| English Term    | Russian Term                      | Description                                     |
| --------------- | --------------------------------- | ----------------------------------------------- |
| Graph Database  | Графовая база данных              | Database that uses graph structures for queries |
| Node            | Узел                              | Entity in a graph (e.g., class, function)       |
| Relationship    | Связь, отношение                  | Connection between nodes                        |
| Vector Store    | Векторное хранилище               | Database optimized for embeddings               |
| Indexing        | Индексация                        | Process of analyzing and storing code           |
| Reindexing      | Переиндексация                    | Rebuilding the index from scratch               |
| URI             | URI (Uniform Resource Identifier) | Connection address                              |
| SSL/TLS         | SSL/TLS                           | Encryption protocol                             |
| SecretStorage   | Безопасное хранилище              | Encrypted credential storage                    |
| Bolt Protocol   | Протокол Bolt                     | Neo4j's binary protocol                         |
| Codebase        | Кодовая база                      | Collection of source code files                 |
| Semantic Search | Семантический поиск               | Search based on meaning                         |
| Traversal       | Обход графа                       | Following relationships in graph                |

---

## Additional Resources

- 📖 [Neo4j Official Documentation](https://neo4j.com/docs/)
- 🎓 [Neo4j GraphAcademy](https://neo4j.com/graphacademy/) - Free courses
- 💬 [Neo4j Community Forum](https://community.neo4j.com/)
- 🐛 [Report AlfaCode assistant issues](https://github.com/Alfa-Org/alfacode/issues)

---

**Last Updated:** December 2025  
**Version:** 1.0  
**AlfaCode assistant version:** Compatible with v1.0+
