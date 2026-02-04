#!/usr/bin/env bun
import { LinearClient } from "@linear/sdk";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY || "";

if (!LINEAR_API_KEY) {
  console.error("Error: LINEAR_API_KEY environment variable is required");
  process.exit(1);
}

const linear = new LinearClient({ apiKey: LINEAR_API_KEY });

async function main() {
  // Find the 21app project
  console.log("Searching for 21app project...");
  const projects = await linear.projects();

  const project = projects.nodes.find(
    (p) => p.name.toLowerCase().includes("21app") || p.name.toLowerCase().includes("21 app")
  );

  if (!project) {
    console.log("Available projects:");
    projects.nodes.forEach((p) => {
      console.log(`  - ${p.name} (ID: ${p.id})`);
    });
    console.error("\nCould not find a project containing '21app'. Please check the project name above.");
    process.exit(1);
  }

  console.log(`Found project: ${project.name} (ID: ${project.id})`);

  // Create a test milestone
  console.log("\nCreating test milestone...");
  const result = await linear.createProjectMilestone({
    name: "Test Milestone",
    projectId: project.id,
    description: "This is a test milestone created via the Linear Kanban MCP server",
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days from now
  });

  const milestone = await result.projectMilestone;

  if (milestone) {
    console.log("\nMilestone created successfully!");
    console.log(`  ID: ${milestone.id}`);
    console.log(`  Name: ${milestone.name}`);
    console.log(`  Description: ${milestone.description}`);
    console.log(`  Target Date: ${milestone.targetDate}`);
  } else {
    console.error("Failed to create milestone");
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
