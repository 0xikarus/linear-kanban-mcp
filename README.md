# Linear Kanban Server

A lightweight MCP server that exposes the Linear API for kanban board management, designed for integration with Claude Desktop and Claude Code.

## Quick Setup

```
claude mcp add linear-kanban -- bun run /path/to/linear-kanban-server/src/mcp-server.ts -e LINEAR_API_KEY=lin_api_YOUR_KEY
```

## Manual Setup

1. Install dependencies:
```bash
bun install
```

2. Add to your Claude Code settings (`~/.claude/settings.json`):
```json
{
  "mcpServers": {
    "linear-kanban": {
      "command": "bun",
      "args": ["run", "/path/to/linear-kanban-server/src/mcp-server.ts"],
      "env": {
        "LINEAR_API_KEY": "lin_api_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

3. Use in Claude:
- "Show me all issues in the Engineering team"
- "Create a new bug report for the login issue"
- "Move issue ENG-123 to In Progress"
