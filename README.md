# Linear Kanban Server

A lightweight server running on Bun that exposes the Linear API for easy kanban board management - available as both a REST API (Hono) and an **MCP (Model Context Protocol) server** for direct Claude integration.

**🎯 Automatic Task Tracking**: Includes a hook that automatically syncs Claude's work to Linear in real-time!

## Features

- 🚀 Fast and lightweight Hono server
- 🔥 Powered by Bun runtime
- 📋 Full Linear API integration
- ✅ Comprehensive test suite
- 🎯 Simple REST API endpoints
- 🤖 **Automatic task tracking hook** - Syncs Claude's work to Linear in real-time!
- 🔌 **MCP Server** - Direct integration with Claude Desktop and Claude Code

## Installation

1. Install dependencies:
```bash
bun install
```

2. Configure your Linear API key in `src/server.ts` or use environment variables

3. Start the server:
```bash
bun run dev  # Development mode with auto-reload
# or
bun run start  # Production mode
```

The server will be available at `http://localhost:3456`

## API Endpoints

### Projects

- `GET /projects` - Get all projects
- `GET /projects/:projectId/issues` - Get issues for a specific project

### Issues

- `GET /issues` - Get all issues
- `POST /issues` - Create a new issue
  - Body: `{ title, teamId, description?, stateId?, priority?, projectId? }`
- `POST /issues/:issueId/update` - Update an issue
  - Body: `{ title?, description?, stateId?, priority? }`
- `POST /issues/:issueId/move` - Move issue to different state
  - Body: `{ stateId?, stateName? }`
- `POST /issues/:issueId/comment` - Add comment to issue
  - Body: `{ comment }`

### Project Updates

- `GET /projects/:projectId` - Get project details
- `GET /projects/:projectId/updates` - List project updates
- `POST /projects/:projectId/updates` - Create a project update
  - Body: `{ content, health? }`
  - health: `"onTrack"` | `"atRisk"` | `"offTrack"`

### Teams & States

- `GET /teams` - Get all teams
- `GET /states` - Get workflow states (Backlog, Todo, In Progress, Done, etc.)

### Health Check

- `GET /` - Server health check

## Usage Examples

### List all projects
```bash
curl http://localhost:3456/projects
```

### Create a new issue
```bash
curl -X POST http://localhost:3456/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix login bug",
    "description": "Users cannot authenticate",
    "teamId": "your-team-id"
  }'
```

### Move issue to "In Progress"
```bash
curl -X POST http://localhost:3456/issues/ISSUE_ID/move \
  -H "Content-Type: application/json" \
  -d '{"stateName": "In Progress"}'
```

### Add a comment
```bash
curl -X POST http://localhost:3456/issues/ISSUE_ID/comment \
  -H "Content-Type: application/json" \
  -d '{"comment": "Working on this now"}'
```

### Create a project update
```bash
curl -X POST http://localhost:3456/projects/PROJECT_ID/updates \
  -H "Content-Type: application/json" \
  -d '{
    "content": "## Progress\n- Completed feature X\n- Fixed bug Y\n\n## Next Steps\n- Working on feature Z",
    "health": "onTrack"
  }'
```

### List project updates
```bash
curl http://localhost:3456/projects/PROJECT_ID/updates
```

## Testing

Run the test suite:
```bash
bun test              # Run HTTP server integration tests (requires server running)
bun run test:mcp      # Run MCP server unit tests
bun run test:all      # Run all tests
```

All tests should pass and cover:
- Health checks
- Project listing
- Issue CRUD operations
- State management
- Comment creation
- Error handling
- MCP tool/resource/prompt handling

## MCP Server (Model Context Protocol)

The MCP server allows direct integration with Claude Desktop, Claude Code, and other MCP-compatible clients.

### MCP Tools

The MCP server exposes these tools for Claude to use:

| Tool | Description |
|------|-------------|
| `list_teams` | List all Linear teams |
| `list_projects` | List all projects |
| `list_issues` | List issues (optionally filter by project) |
| `get_issue` | Get detailed issue information |
| `list_workflow_states` | List kanban columns/states |
| `create_issue` | Create a new issue |
| `update_issue` | Update issue properties |
| `move_issue` | Move issue between kanban columns |
| `add_comment` | Add a comment to an issue |
| `search_issues` | Search issues by text |
| `list_users` | List workspace users |
| `create_project_update` | Create a project status update |
| `list_project_updates` | List updates for a project |
| `get_project` | Get detailed project info |

### MCP Resources

Read-only data sources:
- `linear://teams` - All teams
- `linear://projects` - All projects
- `linear://issues` - Recent issues
- `linear://workflow-states` - Kanban columns
- `linear://project-updates` - Recent project updates

### MCP Prompts

Pre-built prompts:
- `kanban_overview` - Get full kanban board view
- `create_task` - Guided task creation
- `daily_standup` - Generate standup summary
- `write_project_update` - Guided project update creation with progress analysis

### Setup with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

### Setup with Claude Code

Add to your Claude Code settings (`~/.claude/settings.json`):

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

Then in Claude, you can say things like:
- "Show me all issues in the Engineering team"
- "Create a new bug report for the login issue"
- "Move issue ENG-123 to In Progress"
- "Give me a kanban overview"
- "Write a project update summarizing our progress"
- "List recent updates for the Alpha project"

## 🤖 Automatic Task Tracking Hook (Recommended!)

The **Linear Sync Hook** automatically tracks Claude's work on your Linear kanban board:

- ✅ Task created → Creates Linear issue in "Todo"
- ✅ Task started → Moves to "In Progress" with comment
- ✅ Task completed → Moves to "Done" with comment

### Install the Hook

```bash
./install-hook.sh
```

Then just use Claude Code normally - your work syncs to Linear automatically!

See [HOOK_SETUP.md](HOOK_SETUP.md) for detailed setup and configuration.

## Claude Code Skill

This server comes with a Claude Code skill for easy integration.

### Quick Install

```bash
./install-skill.sh
```

This copies the skill to `~/.claude/skills/` and makes it available as `/linear-kanban` in Claude Code.

### Manual Install

1. Copy the skill file:
   ```bash
   cp linear-kanban.skill.md ~/.claude/skills/
   ```

2. Start the server:
   ```bash
   bun run dev
   ```

3. Use the skill in Claude Code (context-aware):
   ```
   User: Show me all my teams
   /linear-kanban

   User: Create a new issue called "Fix login bug"
   /linear-kanban

   User: Move issue ABC-123 to In Progress
   /linear-kanban
   ```

   Just describe what you want, then invoke `/linear-kanban` - Claude figures out the rest!

For detailed installation instructions, see [INSTALL_SKILL.md](INSTALL_SKILL.md)

## Configuration

The Linear API key is currently hardcoded in `src/server.ts`. For production use, consider:

1. Using environment variables
2. Creating a `.env` file
3. Using a configuration management system

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **API Client**: @linear/sdk
- **Testing**: Bun's built-in test runner

## License

MIT
