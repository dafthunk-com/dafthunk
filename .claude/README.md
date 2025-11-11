# Claude Code Custom Commands

This directory contains custom slash commands for the Dafthunk project.

## Available Commands

### Database & Migrations
- `/db-migrate` - Generate and apply a new database migration
- `/db-reset` - Reset local database and reapply all migrations

### Node Development
- `/add-node` - Create a new workflow node with proper structure
- `/review-node` - Review a node implementation for best practices
- `/explain-node` - Get detailed explanation of how a node works
- `/find-node` - Search for nodes by functionality or category
- `/refactor-node` - Refactor a node following best practices
- `/compare-nodes` - Compare similar nodes and suggest consolidation

### API Development
- `/add-route` - Create a new API route with proper patterns
- `/test-api` - Run API tests (unit, integration, or specific patterns)

### Code Quality & Build
- `/fix-types` - Fix TypeScript errors across the monorepo
- `/check-build` - Run full build and check for issues
- `/deploy-check` - Pre-deployment checklist and validation

### Development Tools
- `/setup-env` - Setup development environment from scratch
- `/analyze-bundle` - Analyze bundle size and dependencies
- `/debug-workflow` - Debug a workflow execution issue
- `/update-deps` - Update dependencies safely

## Usage

Simply type `/command-name` in Claude Code to use any of these commands. For example:

```
/add-node
```

Claude will then guide you through the process with context-aware assistance.

## Creating New Commands

To create a new custom command:

1. Create a new `.md` file in `.claude/commands/`
2. Add YAML frontmatter with a description (optional):
   ```markdown
   ---
   description: Brief description of what this command does
   ---

   Your command prompt here...
   ```
3. The command will be available immediately as `/filename` (without the `.md` extension)

## Best Practices

- Keep commands focused on a single workflow
- Use step-by-step instructions for complex tasks
- Reference project patterns from CLAUDE.md
- Include error handling and validation steps
