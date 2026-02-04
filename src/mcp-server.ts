#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { LinearClient } from "@linear/sdk";

// Initialize Linear client - API key should be provided via environment variable
const LINEAR_API_KEY = process.env.LINEAR_API_KEY || "";
const linear = new LinearClient({ apiKey: LINEAR_API_KEY });

// Create MCP server
const server = new Server(
  {
    name: "linear-kanban-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Define all available tools
const TOOLS = [
  {
    name: "list_teams",
    description: "List all Linear teams available to the authenticated user",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "list_projects",
    description: "List all projects in the Linear workspace",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "list_issues",
    description:
      "List issues, optionally filtered by project. Returns issue details including state, priority, and URL.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Optional project ID to filter issues by",
        },
        limit: {
          type: "number",
          description: "Maximum number of issues to return (default: 50)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_issue",
    description: "Get detailed information about a specific issue by its ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueId: {
          type: "string",
          description: "The ID of the issue to retrieve",
        },
      },
      required: ["issueId"],
    },
  },
  {
    name: "list_workflow_states",
    description:
      "List all workflow states (columns) available for a team's kanban board",
    inputSchema: {
      type: "object" as const,
      properties: {
        teamId: {
          type: "string",
          description:
            "Optional team ID. If not provided, uses the first team.",
        },
      },
      required: [],
    },
  },
  {
    name: "create_issue",
    description: "Create a new issue in Linear",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "The title of the issue",
        },
        description: {
          type: "string",
          description: "The description of the issue (supports markdown)",
        },
        teamId: {
          type: "string",
          description: "The ID of the team to create the issue in",
        },
        projectId: {
          type: "string",
          description: "Optional project ID to associate the issue with",
        },
        stateId: {
          type: "string",
          description: "Optional workflow state ID for the issue",
        },
        priority: {
          type: "number",
          description:
            "Priority level: 0 (no priority), 1 (urgent), 2 (high), 3 (medium), 4 (low)",
        },
        assigneeId: {
          type: "string",
          description: "Optional user ID to assign the issue to",
        },
        milestoneId: {
          type: "string",
          description: "Optional milestone ID to assign the issue to",
        },
      },
      required: ["title", "teamId"],
    },
  },
  {
    name: "update_issue",
    description: "Update an existing issue's properties",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueId: {
          type: "string",
          description: "The ID of the issue to update",
        },
        title: {
          type: "string",
          description: "New title for the issue",
        },
        description: {
          type: "string",
          description: "New description for the issue",
        },
        stateId: {
          type: "string",
          description: "New workflow state ID",
        },
        priority: {
          type: "number",
          description: "New priority level (0-4)",
        },
        assigneeId: {
          type: "string",
          description: "User ID to assign the issue to",
        },
        milestoneId: {
          type: "string",
          description: "Milestone ID to assign the issue to (use null to remove)",
        },
      },
      required: ["issueId"],
    },
  },
  {
    name: "move_issue",
    description:
      "Move an issue to a different workflow state (kanban column) by state name or ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueId: {
          type: "string",
          description: "The ID of the issue to move",
        },
        stateId: {
          type: "string",
          description:
            "The ID of the target workflow state (use this OR stateName)",
        },
        stateName: {
          type: "string",
          description:
            "The name of the target workflow state (use this OR stateId)",
        },
      },
      required: ["issueId"],
    },
  },
  {
    name: "add_comment",
    description: "Add a comment to an issue",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueId: {
          type: "string",
          description: "The ID of the issue to comment on",
        },
        body: {
          type: "string",
          description: "The comment text (supports markdown)",
        },
      },
      required: ["issueId", "body"],
    },
  },
  {
    name: "search_issues",
    description: "Search for issues by title or description text",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query to match against issue titles and descriptions",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 20)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_users",
    description: "List all users in the Linear workspace",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "create_project_update",
    description:
      "Create a project update to share progress, summarize development steps, or communicate status. Supports markdown formatting.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The ID of the project to add the update to",
        },
        body: {
          type: "string",
          description:
            "The content of the update (supports markdown). Can include development summaries, progress notes, blockers, etc.",
        },
        health: {
          type: "string",
          enum: ["onTrack", "atRisk", "offTrack"],
          description:
            "Optional health status of the project: 'onTrack' (green), 'atRisk' (yellow), 'offTrack' (red)",
        },
      },
      required: ["projectId", "body"],
    },
  },
  {
    name: "list_project_updates",
    description:
      "List all updates for a specific project, showing progress history and status changes",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The ID of the project to list updates for",
        },
        limit: {
          type: "number",
          description: "Maximum number of updates to return (default: 10)",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "get_project",
    description:
      "Get detailed information about a specific project including its current status and recent updates",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The ID of the project to retrieve",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "list_milestones",
    description:
      "List all milestones (project milestones) in the workspace, optionally filtered by project",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "Optional project ID to filter milestones by",
        },
        limit: {
          type: "number",
          description: "Maximum number of milestones to return (default: 50)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_milestone",
    description: "Get detailed information about a specific milestone by its ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        milestoneId: {
          type: "string",
          description: "The ID of the milestone to retrieve",
        },
      },
      required: ["milestoneId"],
    },
  },
  {
    name: "create_milestone",
    description: "Create a new milestone for a project",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "The name of the milestone",
        },
        projectId: {
          type: "string",
          description: "The ID of the project this milestone belongs to",
        },
        description: {
          type: "string",
          description: "Optional description of the milestone",
        },
        targetDate: {
          type: "string",
          description: "Optional target date for the milestone (ISO 8601 format, e.g., '2024-12-31')",
        },
        sortOrder: {
          type: "number",
          description: "Optional sort order for the milestone",
        },
      },
      required: ["name", "projectId"],
    },
  },
  {
    name: "update_milestone",
    description: "Update an existing milestone's properties",
    inputSchema: {
      type: "object" as const,
      properties: {
        milestoneId: {
          type: "string",
          description: "The ID of the milestone to update",
        },
        name: {
          type: "string",
          description: "New name for the milestone",
        },
        description: {
          type: "string",
          description: "New description for the milestone",
        },
        targetDate: {
          type: "string",
          description: "New target date for the milestone (ISO 8601 format)",
        },
        sortOrder: {
          type: "number",
          description: "New sort order for the milestone",
        },
      },
      required: ["milestoneId"],
    },
  },
  {
    name: "delete_milestone",
    description: "Delete a milestone",
    inputSchema: {
      type: "object" as const,
      properties: {
        milestoneId: {
          type: "string",
          description: "The ID of the milestone to delete",
        },
      },
      required: ["milestoneId"],
    },
  },
  {
    name: "delete_issue",
    description: "Permanently delete an issue from Linear",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueId: {
          type: "string",
          description: "The ID of the issue to delete",
        },
      },
      required: ["issueId"],
    },
  },
  {
    name: "assign_issue_to_milestone",
    description: "Assign an issue to a milestone or remove it from its current milestone",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueId: {
          type: "string",
          description: "The ID of the issue to assign",
        },
        milestoneId: {
          type: "string",
          description: "The ID of the milestone to assign the issue to. Pass null or omit to remove from milestone.",
        },
      },
      required: ["issueId"],
    },
  },
  {
    name: "list_milestone_issues",
    description: "List all issues assigned to a specific milestone",
    inputSchema: {
      type: "object" as const,
      properties: {
        milestoneId: {
          type: "string",
          description: "The ID of the milestone to list issues for",
        },
        limit: {
          type: "number",
          description: "Maximum number of issues to return (default: 50)",
        },
      },
      required: ["milestoneId"],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_teams": {
        const teams = await linear.teams();
        const teamList = teams.nodes.map((team) => ({
          id: team.id,
          name: team.name,
          key: team.key,
          description: team.description,
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, teams: teamList }, null, 2),
            },
          ],
        };
      }

      case "list_projects": {
        const projects = await linear.projects();
        const projectList = projects.nodes.map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          state: project.state,
          progress: project.progress,
          url: project.url,
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: true, projects: projectList },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_issues": {
        const { projectId, limit = 50 } = args as {
          projectId?: string;
          limit?: number;
        };
        let issues;

        if (projectId) {
          const project = await linear.project(projectId);
          issues = await project.issues({ first: limit });
        } else {
          issues = await linear.issues({ first: limit });
        }

        const issueList = await Promise.all(
          issues.nodes.map(async (issue) => {
            const state = await issue.state;
            const assignee = await issue.assignee;
            return {
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              description: issue.description?.substring(0, 300) || "",
              state: state?.name || "Unknown",
              stateId: state?.id,
              priority: issue.priority,
              priorityLabel: issue.priorityLabel,
              assignee: assignee?.name,
              url: issue.url,
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: true, issues: issueList },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_issue": {
        const { issueId } = args as { issueId: string };
        const issue = await linear.issue(issueId);
        const state = await issue.state;
        const assignee = await issue.assignee;
        const project = await issue.project;
        const team = await issue.team;
        const milestone = await issue.projectMilestone;
        const comments = await issue.comments();

        const issueDetails = {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          state: state?.name,
          stateId: state?.id,
          priority: issue.priority,
          priorityLabel: issue.priorityLabel,
          assignee: assignee
            ? { id: assignee.id, name: assignee.name }
            : null,
          project: project ? { id: project.id, name: project.name } : null,
          team: team ? { id: team.id, name: team.name } : null,
          milestone: milestone
            ? { id: milestone.id, name: milestone.name }
            : null,
          url: issue.url,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          comments: comments.nodes.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt,
          })),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: true, issue: issueDetails },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_workflow_states": {
        const { teamId } = args as { teamId?: string };
        let team;

        if (teamId) {
          team = await linear.team(teamId);
        } else {
          const teams = await linear.teams();
          team = teams.nodes[0];
        }

        if (!team) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ success: false, error: "No team found" }),
              },
            ],
            isError: true,
          };
        }

        const states = await team.states();
        const stateList = states.nodes
          .sort((a, b) => a.position - b.position)
          .map((state) => ({
            id: state.id,
            name: state.name,
            type: state.type,
            position: state.position,
            color: state.color,
          }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: true, states: stateList },
                null,
                2
              ),
            },
          ],
        };
      }

      case "create_issue": {
        const {
          title,
          description,
          teamId,
          projectId,
          stateId,
          priority,
          assigneeId,
          milestoneId,
        } = args as {
          title: string;
          description?: string;
          teamId: string;
          projectId?: string;
          stateId?: string;
          priority?: number;
          assigneeId?: string;
          milestoneId?: string;
        };

        const issuePayload: any = { title, teamId };
        if (description) issuePayload.description = description;
        if (projectId) issuePayload.projectId = projectId;
        if (stateId) issuePayload.stateId = stateId;
        if (priority !== undefined) issuePayload.priority = priority;
        if (assigneeId) issuePayload.assigneeId = assigneeId;
        if (milestoneId) issuePayload.projectMilestoneId = milestoneId;

        const result = await linear.createIssue(issuePayload);
        const issue = await result.issue;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  issue: {
                    id: issue?.id,
                    identifier: issue?.identifier,
                    title: issue?.title,
                    url: issue?.url,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "update_issue": {
        const { issueId, title, description, stateId, priority, assigneeId, milestoneId } =
          args as {
            issueId: string;
            title?: string;
            description?: string;
            stateId?: string;
            priority?: number;
            assigneeId?: string;
            milestoneId?: string | null;
          };

        const updatePayload: any = {};
        if (title) updatePayload.title = title;
        if (description !== undefined) updatePayload.description = description;
        if (stateId) updatePayload.stateId = stateId;
        if (priority !== undefined) updatePayload.priority = priority;
        if (assigneeId) updatePayload.assigneeId = assigneeId;
        if (milestoneId !== undefined) updatePayload.projectMilestoneId = milestoneId;

        await linear.updateIssue(issueId, updatePayload);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Issue updated successfully",
              }),
            },
          ],
        };
      }

      case "move_issue": {
        const { issueId, stateId, stateName } = args as {
          issueId: string;
          stateId?: string;
          stateName?: string;
        };

        let targetStateId = stateId;

        if (stateName && !stateId) {
          const issue = await linear.issue(issueId);
          const team = await issue.team;
          if (!team) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    error: "Could not find team for issue",
                  }),
                },
              ],
              isError: true,
            };
          }

          const states = await team.states();
          const state = states.nodes.find(
            (s) => s.name.toLowerCase() === stateName.toLowerCase()
          );

          if (!state) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: false,
                    error: `State '${stateName}' not found`,
                    availableStates: states.nodes.map((s) => s.name),
                  }),
                },
              ],
              isError: true,
            };
          }

          targetStateId = state.id;
        }

        if (!targetStateId) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: "Either stateId or stateName is required",
                }),
              },
            ],
            isError: true,
          };
        }

        await linear.updateIssue(issueId, { stateId: targetStateId });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Issue moved successfully",
              }),
            },
          ],
        };
      }

      case "add_comment": {
        const { issueId, body } = args as { issueId: string; body: string };

        const result = await linear.createComment({ issueId, body });
        const comment = await result.comment;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  comment: {
                    id: comment?.id,
                    body: comment?.body,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "search_issues": {
        const { query, limit = 20 } = args as { query: string; limit?: number };

        const issues = await linear.searchIssues(query, { first: limit });

        const issueList = await Promise.all(
          issues.nodes.map(async (issue) => {
            const state = await issue.state;
            return {
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              description: issue.description?.substring(0, 200) || "",
              state: state?.name || "Unknown",
              priority: issue.priority,
              priorityLabel: issue.priorityLabel,
              url: issue.url,
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: true, issues: issueList },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_users": {
        const users = await linear.users();
        const userList = users.nodes.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          displayName: user.displayName,
          active: user.active,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, users: userList }, null, 2),
            },
          ],
        };
      }

      case "create_project_update": {
        const { projectId, body, health } = args as {
          projectId: string;
          body: string;
          health?: "onTrack" | "atRisk" | "offTrack";
        };

        const updatePayload: any = { projectId, body };
        if (health) updatePayload.health = health;

        const result = await linear.createProjectUpdate(updatePayload);
        const update = await result.projectUpdate;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  projectUpdate: {
                    id: update?.id,
                    body: update?.body,
                    health: update?.health,
                    createdAt: update?.createdAt,
                    url: update?.url,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_project_updates": {
        const { projectId, limit = 10 } = args as {
          projectId: string;
          limit?: number;
        };

        const project = await linear.project(projectId);
        const updates = await project.projectUpdates({ first: limit });

        const updateList = await Promise.all(
          updates.nodes.map(async (update) => {
            const user = await update.user;
            return {
              id: update.id,
              body: update.body,
              health: update.health,
              createdAt: update.createdAt,
              url: update.url,
              user: user ? { id: user.id, name: user.name } : null,
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: true, projectUpdates: updateList },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_project": {
        const { projectId } = args as { projectId: string };
        const project = await linear.project(projectId);
        const lead = await project.lead;
        const updates = await project.projectUpdates({ first: 5 });

        const recentUpdates = await Promise.all(
          updates.nodes.map(async (update) => {
            const user = await update.user;
            return {
              id: update.id,
              body: update.body?.substring(0, 300) || "",
              health: update.health,
              createdAt: update.createdAt,
              user: user?.name,
            };
          })
        );

        const projectDetails = {
          id: project.id,
          name: project.name,
          description: project.description,
          state: project.state,
          progress: project.progress,
          health: project.health,
          targetDate: project.targetDate,
          startDate: project.startDate,
          lead: lead ? { id: lead.id, name: lead.name } : null,
          url: project.url,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          recentUpdates,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: true, project: projectDetails },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_milestones": {
        const { projectId, limit = 50 } = args as {
          projectId?: string;
          limit?: number;
        };

        let milestones;
        if (projectId) {
          const project = await linear.project(projectId);
          milestones = await project.projectMilestones({ first: limit });
        } else {
          milestones = await linear.projectMilestones({ first: limit });
        }

        const milestoneList = await Promise.all(
          milestones.nodes.map(async (milestone) => {
            const project = await milestone.project;
            return {
              id: milestone.id,
              name: milestone.name,
              description: milestone.description,
              targetDate: milestone.targetDate,
              sortOrder: milestone.sortOrder,
              project: project ? { id: project.id, name: project.name } : null,
              createdAt: milestone.createdAt,
              updatedAt: milestone.updatedAt,
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: true, milestones: milestoneList },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_milestone": {
        const { milestoneId } = args as { milestoneId: string };
        const milestone = await linear.projectMilestone(milestoneId);
        const project = await milestone.project;
        const issues = await milestone.issues({ first: 20 });

        const issueList = await Promise.all(
          issues.nodes.map(async (issue) => {
            const state = await issue.state;
            const assignee = await issue.assignee;
            return {
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              state: state?.name || "Unknown",
              priority: issue.priorityLabel,
              assignee: assignee?.name,
              url: issue.url,
            };
          })
        );

        const milestoneDetails = {
          id: milestone.id,
          name: milestone.name,
          description: milestone.description,
          targetDate: milestone.targetDate,
          sortOrder: milestone.sortOrder,
          project: project ? { id: project.id, name: project.name } : null,
          createdAt: milestone.createdAt,
          updatedAt: milestone.updatedAt,
          issues: issueList,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: true, milestone: milestoneDetails },
                null,
                2
              ),
            },
          ],
        };
      }

      case "create_milestone": {
        const { name, projectId, description, targetDate, sortOrder } = args as {
          name: string;
          projectId: string;
          description?: string;
          targetDate?: string;
          sortOrder?: number;
        };

        const milestonePayload: any = { name, projectId };
        if (description) milestonePayload.description = description;
        if (targetDate) milestonePayload.targetDate = targetDate;
        if (sortOrder !== undefined) milestonePayload.sortOrder = sortOrder;

        const result = await linear.createProjectMilestone(milestonePayload);
        const milestone = await result.projectMilestone;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  milestone: {
                    id: milestone?.id,
                    name: milestone?.name,
                    description: milestone?.description,
                    targetDate: milestone?.targetDate,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "update_milestone": {
        const { milestoneId, name, description, targetDate, sortOrder } = args as {
          milestoneId: string;
          name?: string;
          description?: string;
          targetDate?: string;
          sortOrder?: number;
        };

        const updatePayload: any = {};
        if (name) updatePayload.name = name;
        if (description !== undefined) updatePayload.description = description;
        if (targetDate !== undefined) updatePayload.targetDate = targetDate;
        if (sortOrder !== undefined) updatePayload.sortOrder = sortOrder;

        await linear.updateProjectMilestone(milestoneId, updatePayload);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Milestone updated successfully",
              }),
            },
          ],
        };
      }

      case "delete_milestone": {
        const { milestoneId } = args as { milestoneId: string };

        await linear.deleteProjectMilestone(milestoneId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Milestone deleted successfully",
              }),
            },
          ],
        };
      }

      case "delete_issue": {
        const { issueId } = args as { issueId: string };

        await linear.deleteIssue(issueId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Issue deleted successfully",
              }),
            },
          ],
        };
      }

      case "assign_issue_to_milestone": {
        const { issueId, milestoneId } = args as {
          issueId: string;
          milestoneId?: string;
        };

        await linear.updateIssue(issueId, {
          projectMilestoneId: milestoneId || null,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: milestoneId
                  ? "Issue assigned to milestone successfully"
                  : "Issue removed from milestone successfully",
              }),
            },
          ],
        };
      }

      case "list_milestone_issues": {
        const { milestoneId, limit = 50 } = args as {
          milestoneId: string;
          limit?: number;
        };

        const milestone = await linear.projectMilestone(milestoneId);
        const issues = await milestone.issues({ first: limit });

        const issueList = await Promise.all(
          issues.nodes.map(async (issue) => {
            const state = await issue.state;
            const assignee = await issue.assignee;
            return {
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              description: issue.description?.substring(0, 300) || "",
              state: state?.name || "Unknown",
              stateId: state?.id,
              priority: issue.priority,
              priorityLabel: issue.priorityLabel,
              assignee: assignee?.name,
              url: issue.url,
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: true, issues: issueList },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }),
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

// Define resources
const RESOURCES = [
  {
    uri: "linear://teams",
    name: "Linear Teams",
    description: "List of all teams in the Linear workspace",
    mimeType: "application/json",
  },
  {
    uri: "linear://projects",
    name: "Linear Projects",
    description: "List of all projects in the Linear workspace",
    mimeType: "application/json",
  },
  {
    uri: "linear://issues",
    name: "Linear Issues",
    description: "List of recent issues in the Linear workspace",
    mimeType: "application/json",
  },
  {
    uri: "linear://workflow-states",
    name: "Workflow States",
    description: "Available workflow states (kanban columns) for organizing issues",
    mimeType: "application/json",
  },
  {
    uri: "linear://project-updates",
    name: "Recent Project Updates",
    description: "Recent project updates across all projects in the workspace",
    mimeType: "application/json",
  },
  {
    uri: "linear://milestones",
    name: "Project Milestones",
    description: "List of all milestones across projects in the workspace",
    mimeType: "application/json",
  },
];

// Handle list resources request
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: RESOURCES };
});

// Handle read resource request
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    switch (uri) {
      case "linear://teams": {
        const teams = await linear.teams();
        const teamList = teams.nodes.map((team) => ({
          id: team.id,
          name: team.name,
          key: team.key,
          description: team.description,
        }));
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(teamList, null, 2),
            },
          ],
        };
      }

      case "linear://projects": {
        const projects = await linear.projects();
        const projectList = projects.nodes.map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          state: project.state,
          progress: project.progress,
        }));
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(projectList, null, 2),
            },
          ],
        };
      }

      case "linear://issues": {
        const issues = await linear.issues({ first: 50 });
        const issueList = await Promise.all(
          issues.nodes.map(async (issue) => {
            const state = await issue.state;
            return {
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              state: state?.name || "Unknown",
              priority: issue.priorityLabel,
              url: issue.url,
            };
          })
        );
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(issueList, null, 2),
            },
          ],
        };
      }

      case "linear://workflow-states": {
        const teams = await linear.teams();
        const team = teams.nodes[0];
        if (!team) {
          throw new Error("No team found");
        }
        const states = await team.states();
        const stateList = states.nodes
          .sort((a, b) => a.position - b.position)
          .map((state) => ({
            id: state.id,
            name: state.name,
            type: state.type,
            position: state.position,
          }));
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(stateList, null, 2),
            },
          ],
        };
      }

      case "linear://project-updates": {
        const projects = await linear.projects();
        const allUpdates: any[] = [];

        for (const project of projects.nodes.slice(0, 5)) {
          const updates = await project.projectUpdates({ first: 3 });
          for (const update of updates.nodes) {
            const user = await update.user;
            allUpdates.push({
              projectId: project.id,
              projectName: project.name,
              id: update.id,
              body: update.body?.substring(0, 500) || "",
              health: update.health,
              createdAt: update.createdAt,
              user: user?.name,
            });
          }
        }

        // Sort by date descending
        allUpdates.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(allUpdates.slice(0, 10), null, 2),
            },
          ],
        };
      }

      case "linear://milestones": {
        const milestones = await linear.projectMilestones({ first: 50 });
        const milestoneList = await Promise.all(
          milestones.nodes.map(async (milestone) => {
            const project = await milestone.project;
            return {
              id: milestone.id,
              name: milestone.name,
              description: milestone.description,
              targetDate: milestone.targetDate,
              project: project ? { id: project.id, name: project.name } : null,
            };
          })
        );
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(milestoneList, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Define prompts
const PROMPTS = [
  {
    name: "kanban_overview",
    description:
      "Get an overview of the current kanban board state with all issues organized by column",
    arguments: [
      {
        name: "teamId",
        description: "Optional team ID to filter by",
        required: false,
      },
    ],
  },
  {
    name: "create_task",
    description: "Guided prompt for creating a new task/issue in Linear",
    arguments: [
      {
        name: "title",
        description: "Title of the task to create",
        required: true,
      },
      {
        name: "description",
        description: "Description of the task",
        required: false,
      },
    ],
  },
  {
    name: "daily_standup",
    description:
      "Generate a summary suitable for a daily standup meeting based on recent issue activity",
    arguments: [],
  },
  {
    name: "write_project_update",
    description:
      "Guided prompt for writing a project update that summarizes development progress, accomplishments, and next steps",
    arguments: [
      {
        name: "projectId",
        description: "The ID of the project to write an update for",
        required: true,
      },
      {
        name: "focus",
        description:
          "Optional focus area: 'progress' (what was accomplished), 'blockers' (issues encountered), 'planning' (next steps), or 'summary' (comprehensive)",
        required: false,
      },
    ],
  },
  {
    name: "milestone_overview",
    description:
      "Get an overview of milestones for a project, including progress and assigned issues",
    arguments: [
      {
        name: "projectId",
        description: "The ID of the project to show milestones for",
        required: true,
      },
    ],
  },
];

// Handle list prompts request
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: PROMPTS };
});

// Handle get prompt request
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "kanban_overview": {
      const teamId = args?.teamId as string | undefined;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please provide a kanban board overview for my Linear workspace${teamId ? ` (team: ${teamId})` : ""}.

First, use the list_workflow_states tool to get all available columns.
Then, use the list_issues tool to get all issues.
Finally, organize the issues by their workflow state and present them as a kanban board with columns.

For each issue, show:
- Issue identifier and title
- Priority (if set)
- Assignee (if assigned)`,
            },
          },
        ],
      };
    }

    case "create_task": {
      const title = args?.title as string;
      const description = args?.description as string | undefined;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please help me create a new task in Linear.

Title: ${title}
${description ? `Description: ${description}` : ""}

First, use list_teams to find available teams.
Then, use list_workflow_states to see available starting states.
Finally, use create_issue to create the task with appropriate defaults.`,
            },
          },
        ],
      };
    }

    case "daily_standup": {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please generate a daily standup summary from my Linear issues.

Use list_issues to get recent issues, then summarize:

1. **Completed** (Done state): What was finished recently
2. **In Progress**: What's currently being worked on
3. **Blocked/Needs Review**: Any items that need attention
4. **Coming Up** (Backlog/Todo): What's planned next

Keep it concise and suitable for a standup meeting.`,
            },
          },
        ],
      };
    }

    case "write_project_update": {
      const projectId = args?.projectId as string;
      const focus = (args?.focus as string) || "summary";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please help me write a project update for Linear project ID: ${projectId}

Focus area: ${focus}

Steps to follow:

1. First, use get_project to get the project details and recent updates
2. Use list_issues with projectId to see all issues in this project
3. Analyze the current state of issues (completed, in progress, backlog)
4. ${
                focus === "progress"
                  ? "Focus on what has been accomplished recently"
                  : focus === "blockers"
                    ? "Focus on any blockers, risks, or issues encountered"
                    : focus === "planning"
                      ? "Focus on upcoming work and next steps"
                      : "Provide a comprehensive summary covering progress, blockers, and next steps"
              }

5. Draft a well-structured update in markdown format with:
   - **Summary**: A brief overview (1-2 sentences)
   - **Accomplishments**: What was completed
   - **In Progress**: Current active work
   - **Next Steps**: What's coming up
   - **Blockers/Risks**: Any issues (if applicable)

6. Suggest an appropriate health status:
   - onTrack (green): Everything is progressing well
   - atRisk (yellow): Some concerns but manageable
   - offTrack (red): Significant issues affecting timeline

7. Use create_project_update to post the update with the appropriate health status

Keep the update concise but informative - suitable for stakeholders to quickly understand project status.`,
            },
          },
        ],
      };
    }

    case "milestone_overview": {
      const projectId = args?.projectId as string;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please provide a milestone overview for Linear project ID: ${projectId}

Steps to follow:

1. First, use get_project to get the project details
2. Use list_milestones with the projectId to get all milestones for this project
3. For each milestone, use list_milestone_issues to see all assigned issues
4. Present an overview showing:
   - Each milestone with its name, description, and target date
   - Progress: count of completed vs total issues for each milestone
   - Issue breakdown by state (completed, in progress, todo)
   - Any milestones approaching their target date

Format the output as a clear summary showing milestone progress and any upcoming deadlines.`,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Linear Kanban MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
