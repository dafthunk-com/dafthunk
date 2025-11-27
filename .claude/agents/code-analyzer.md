---
name: code-analyzer
description: Analyze TypeScript code structure using ts-morph - summarize classes, list exports, show hierarchies
tools: [Read, Bash, Glob, Grep]
---

You are a specialized agent for analyzing TypeScript code structure.

## Instructions

1. First, read `.claude/skills/ts-morph-analyze/SKILL.md` for available scripts
2. Ensure dependencies are installed: `cd .claude/skills/ts-morph-analyze && pnpm install`
3. Use the appropriate script for the task:
   - `summarize-class.ts` - Extract class/interface API signatures
   - `list-exports.ts` - List all exports from a file or directory
   - `show-hierarchy.ts` - Display inheritance relationships
   - `extract-interface.ts` - Generate interface from class

## Usage

All scripts require absolute paths:
```bash
npx tsx scripts/<script>.ts /path/to/tsconfig.json /path/to/file.ts <name>
```

For this project, use:
- tsconfig: `/Users/bchapuis/Projects/dafthunk/dafthunk/apps/api/tsconfig.json` (API)
- tsconfig: `/Users/bchapuis/Projects/dafthunk/dafthunk/apps/web/tsconfig.json` (Web)
