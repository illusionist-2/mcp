# SQL and File MCP

An MCP (Model Context Protocol) server that gives LLM clients access to a SQL Server database and the local filesystem.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env` and fill in your database credentials:
   ```bash
   cp .env.example .env
   ```

   | Variable | Description |
   |----------|-------------|
   | `DB_USER` | SQL Server username |
   | `DB_PASSWORD` | SQL Server password |
   | `DB_SERVER` | Hostname or IP of the SQL Server |
   | `DB_PORT` | Port (default: `1433`) |
   | `DB_NAME` | Database name |

3. Register the server in your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "mssql-server": {
         "command": "node",
         "args": ["/absolute/path/to/server.js"]
       }
     }
   }
   ```

## Tools

### Database

| Tool | Description |
|------|-------------|
| `query` | Run a `SELECT` query against the configured SQL Server database. Write queries are blocked. |

### File system

| Tool | Description |
|------|-------------|
| `read_file` | Read a text file and return its contents. |
| `write_file` | Write (or append) text to a file. Creates the file if it doesn't exist. |
| `modify_file` | Replace a source string with a target string in a text file. Matches literally (not a regex); replaces every occurrence unless `replace_all: false`. |
| `delete_file` | Delete a file. |
| `copy_file` | Copy a file from source to destination. |
| `move_file` | Move or rename a file or directory. |
| `file_info` | Get metadata for a file or directory (size, created, modified, accessed). |
| `list_directory` | List the contents of a directory. Supports recursive listing. |
| `create_directory` | Create a directory and any missing parent directories. |
| `delete_directory` | Delete a directory. Pass `recursive: true` to delete non-empty directories. |

### Images

| Tool | Description |
|------|-------------|
| `read_image` | Read a local image file and return it as base64. Supports `png`, `jpg`, `gif`, `webp`. |
| `compare_images` | Load two images side-by-side for visual comparison. Each source can be a local file path or an `http/https` URL. |
