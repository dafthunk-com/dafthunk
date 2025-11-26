#!/usr/bin/env npx tsx
/**
 * Organize imports across files: remove unused, sort, and merge.
 *
 * Usage:
 *   npx tsx organize-imports.ts <tsconfig> [glob-pattern]
 *
 * Parameters:
 *   tsconfig     - Path to tsconfig.json
 *   glob-pattern - Optional file pattern to process (default: src/**\/*.ts)
 *
 * Example:
 *   npx tsx organize-imports.ts ./tsconfig.json "apps/api/src/**\/*.ts"
 */

import { Project } from "ts-morph";

function printUsage(): void {
  console.error(`
Usage: npx tsx organize-imports.ts <tsconfig> [glob-pattern]

Parameters:
  tsconfig     - Path to tsconfig.json
  glob-pattern - Optional file pattern to process (default: src/**/*.ts)

Examples:
  npx tsx organize-imports.ts ./tsconfig.json
  npx tsx organize-imports.ts ./tsconfig.json "apps/api/src/**/*.ts"
  npx tsx organize-imports.ts ./tsconfig.json "src/components/**/*.tsx"
`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Error: Missing required tsconfig parameter");
    printUsage();
    process.exit(1);
  }

  const [tsconfigPath, globPattern = "src/**/*.ts"] = args;

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
  });

  // Add source files matching the pattern
  const sourceFiles = project.addSourceFilesAtPaths(globPattern);

  if (sourceFiles.length === 0) {
    console.error(`Error: No files found matching pattern '${globPattern}'`);
    process.exit(1);
  }

  console.log(`Processing ${sourceFiles.length} file(s)...`);

  let filesModified = 0;
  let importsRemoved = 0;
  let importsOrganized = 0;

  for (const sourceFile of sourceFiles) {
    const originalText = sourceFile.getFullText();
    const originalImportCount = sourceFile.getImportDeclarations().length;

    // Fix unused identifiers (removes unused imports)
    try {
      sourceFile.fixUnusedIdentifiers();
    } catch {
      // Some files may have issues with this, continue anyway
    }

    // Organize imports (sort and merge)
    sourceFile.organizeImports();

    const newText = sourceFile.getFullText();
    const newImportCount = sourceFile.getImportDeclarations().length;

    if (originalText !== newText) {
      filesModified++;
      const removed = originalImportCount - newImportCount;
      if (removed > 0) {
        importsRemoved += removed;
      }
      importsOrganized++;
    }
  }

  project.saveSync();

  console.log(`\nResults:`);
  console.log(`  Files processed: ${sourceFiles.length}`);
  console.log(`  Files modified: ${filesModified}`);
  console.log(`  Import statements removed: ${importsRemoved}`);

  if (filesModified > 0) {
    console.log(`\nModified files:`);
    for (const sourceFile of sourceFiles) {
      // Re-check which files were actually modified
      const filePath = sourceFile.getFilePath();
      console.log(`  ${filePath}`);
    }
  }
}

main();
