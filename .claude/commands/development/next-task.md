---
allowed-tools: Read, Task, Glob, Grep
argument-hint: [optional-phase-filter]
description: Analyze PRD and execute next priority task using appropriate agent
---

<instructions>
This command analyzes Product Requirements Documents and executes the next priority task using specialized agents.

Process:

1. Locate PRD analysis JSON file in docs/ directory
2. Analyze current project structure and read documentation
3. Identify highest priority incomplete task from current development phase
4. Map task type to appropriate specialized agent with project context
5. Execute task using selected agent with full context
6. Provide clear status and next steps

Agent Selection Logic:

- Frontend/UI tasks → frontend-developer agent
- Backend/API tasks → backend-developer agent
- Database/schema tasks → database-engineer agent
- Infrastructure/deployment → devops-engineer agent
- Testing/QA tasks → qa-engineer agent
- Mixed/unclear tasks → most relevant primary agent
  </instructions>

<project_structure_analysis>
Before task selection, analyze the current project:

- Discover project structure using Glob patterns (package.json, requirements.txt, etc.)
- Read README.md and related documentation files
- Identify technology stack, frameworks, and build tools
- Understand project conventions and patterns
- Determine testing frameworks and development workflows
- Assess current implementation state and architecture
  </project_structure_analysis>

<task_analysis>
Analyze the PRD analysis JSON to identify:

- Current development phase and timeline
- Highest priority incomplete features (Must > Should > Could)
- Task dependencies and blocking relationships
- Required technical capabilities and expertise
- Success criteria and deliverables
- Alignment with discovered project architecture and patterns
  </task_analysis>

<agent_mapping>
Map task characteristics to agents based on both task type and project context:

**Context-Aware Agent Selection:**

- Consider discovered technology stack (React, FastAPI, etc.)
- Respect existing project patterns and conventions
- Account for available tools and frameworks
- Align with established development workflows

**Frontend Tasks:**

- UI/UX components and interfaces (prefer framework-specific agents)
- Client-side functionality (consider project's JS/TS setup)
- User experience flows (respect existing design patterns)
- Component development (match project's component architecture)
- Styling and responsive design (use project's CSS framework)

**Backend Tasks:**

- Server-side logic and APIs (match project's backend framework)
- Business logic implementation (follow established patterns)
- Authentication and authorization (integrate with existing auth)
- Data processing and validation (use project's validation libs)
- Service integration (respect existing service patterns)

**Database Tasks:**

- Schema design and migrations (use project's migration tools)
- Query optimization (leverage project's ORM/query builder)
- Data modeling (align with existing models)
- Database administration (respect project's DB setup)
- Performance tuning (consider project's DB technology)

**DevOps Tasks:**

- Infrastructure setup (match existing infrastructure patterns)
- CI/CD pipelines (extend existing workflows)
- Deployment automation (integrate with current deployment)
- Monitoring and logging (use established monitoring stack)
- Security and compliance (follow project security patterns)

**QA Tasks:**

- Test strategy and planning (align with existing test structure)
- Automated test creation (use project's testing frameworks)
- Quality assurance processes (follow established QA patterns)
- Performance testing (leverage existing performance tools)
- Bug tracking and validation (integrate with project workflows)
  </agent_mapping>

<execution_strategy>

1. **Discover PRD Analysis**: Find most recent prd-analysis.json or product-requirements-\*.json
2. **Project Structure Discovery**: Analyze current codebase structure and read documentation
   - Use Glob to discover package managers, frameworks, and config files
   - Read README.md and other documentation for project context
   - Identify technology stack, patterns, and development workflows
3. **Phase Assessment**: Determine current development phase and priorities
4. **Task Selection**: Choose highest priority incomplete task from current phase
5. **Context-Aware Agent Selection**: Map task type to specialized agent considering:
   - Task characteristics and requirements
   - Discovered project technology stack
   - Existing patterns and conventions
   - Available tools and frameworks
6. **Context Preparation**: Gather relevant information including:
   - PRD sections and technical requirements
   - Project structure and conventions
   - Existing implementation patterns
   - Development workflow constraints
7. **Agent Execution**: Launch appropriate agent with comprehensive context
8. **Progress Tracking**: Update task status and identify next dependencies
   </execution_strategy>

<validation>
Before executing:
- Confirm PRD analysis file exists and is readable
- Verify project structure can be analyzed (README.md, config files accessible)
- Validate task selection logic against priorities and project capabilities
- Ensure selected agent has necessary capabilities for the technology stack
- Check for blocking dependencies and prerequisite tasks
- Confirm agent selection aligns with discovered project patterns
- Verify comprehensive context can be provided to selected agent
</validation>

<output_format>
Provide clear status:

- **Project Analysis Summary**: Key findings about technology stack, patterns, and structure
- **Selected Task**: Name, priority score, and description
- **Agent Selection**: Chosen agent and rationale based on task + project context
- **Task Context**: Requirements, constraints, and relevant project information
- **Project Integration**: How task aligns with existing patterns and architecture
- **Expected Deliverables**: Specific outputs and success criteria
- **Estimated Timeline**: Completion estimate considering project complexity
- **Next Steps**: Dependencies and follow-up tasks
  </output_format>

Execute next priority development task from PRD analysis.
Phase filter: ${1:-"current"}
