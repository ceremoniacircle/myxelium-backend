---
allowed-tools: Task
argument-hint: [optional-project-type]
description: Initialize complete project structure using project-setup agent
---

<instructions>
1. Use the Task tool to invoke the project-setup agent
2. Pass the project type argument if provided, otherwise let agent determine from context
3. Agent will analyze current directory and set up appropriate project structure
4. No user confirmation needed - this is a setup command
</instructions>

<project_initialization>
Initialize project structure and boilerplate using the specialized project-setup agent.

Project type: ${1:-"auto-detect"}

The project-setup agent will:
- Analyze the current codebase and requirements
- Set up appropriate directory structure
- Create necessary configuration files
- Install dependencies and development tools
- Configure build systems and tooling
- Set up testing frameworks
- Create documentation templates
- Initialize version control if needed
</project_initialization>

Use the project-setup agent to initialize the complete project structure for: $ARGUMENTS