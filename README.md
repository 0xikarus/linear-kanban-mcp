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

## Available Tools

### Team & User Management
- `list_teams` - Get all teams in the workspace
- `list_users` - Get all users in the workspace

### Project Operations
- `list_projects` - List all projects
- `get_project` - Get detailed project info (status, lead, recent updates)
- `list_project_updates` - View project update history
- `create_project_update` - Post progress updates with health status (onTrack/atRisk/offTrack)

### Issue Management
- `list_issues` - List issues (optionally filtered by project)
- `get_issue` - Get detailed issue with full context (includes milestone info)
- `create_issue` - Create new issues (supports milestone assignment)
- `update_issue` - Update issue properties (supports milestone assignment)
- `move_issue` - Move issues to different workflow states
- `add_comment` - Add comments to issues
- `search_issues` - Full-text search

### Workflow Configuration
- `list_workflow_states` - Get kanban board columns for a team (with position and color)

### Milestone Management
- `list_milestones` - List all milestones, optionally filtered by project
- `get_milestone` - Get detailed milestone info including assigned issues
- `create_milestone` - Create a new milestone for a project
- `update_milestone` - Update milestone properties (name, description, target date)
- `delete_milestone` - Delete a milestone
- `assign_issue_to_milestone` - Assign an issue to a milestone or remove from current milestone
- `list_milestone_issues` - List all issues assigned to a specific milestone

## Resources

The server provides these MCP resources:
- `linear://teams` - All teams in JSON
- `linear://projects` - All projects in JSON
- `linear://issues` - Recent issues (first 50)
- `linear://workflow-states` - Available kanban columns
- `linear://project-updates` - Recent project updates across workspace
- `linear://milestones` - All milestones across projects

## Prompts

Guided workflows for common tasks:
- `kanban_overview` - Generate a kanban board overview organized by columns
- `create_task` - Guided task creation with automatic team and state selection
- `daily_standup` - Generate standup summaries with completed/in-progress/blocked items
- `write_project_update` - Guided project update writing with health status
- `milestone_overview` - Get milestone progress overview for a project

## Example Usage

### Issue Management
```
"Show me all issues in the Engineering team"
"Create a new bug report titled 'Login button broken'"
"Move issue ENG-123 to In Progress"
"Search for issues about authentication"
```

### Milestone Management
```
"List all milestones for project X"
"Create a milestone called 'v1.0 Release' for project X with target date 2024-06-01"
"Show me all issues in the 'Q1 Goals' milestone"
"Assign issue ENG-456 to the 'v1.0 Release' milestone"
"Update milestone to change target date to 2024-07-01"
"What's the progress on each milestone in project X?"
```

### Project Updates
```
"Write a project update for project X"
"Show me recent updates for the Mobile App project"
```

### Kanban Board
```
"Show me the kanban board overview"
"What's the daily standup summary?"
```
