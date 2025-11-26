#!/usr/bin/env npx tsx
/**
 * Rename a symbol across all files in a TypeScript project.
 *
 * Usage:
 *   npx tsx rename-symbol.ts <tsconfig> <file> <kind> <old-name> <new-name>
 *
 * Parameters:
 *   tsconfig  - Path to tsconfig.json (e.g., ./tsconfig.json)
 *   file      - Source file containing the declaration (e.g., src/utils.ts)
 *   kind      - Symbol kind: function, variable, class, interface, type
 *   old-name  - Current symbol name
 *   new-name  - New symbol name
 *
 * Example:
 *   npx tsx rename-symbol.ts ./tsconfig.json src/services/user.ts class UserService AccountService
 */

import { Project, SyntaxKind } from "ts-morph";

const VALID_KINDS = ["function", "variable", "class", "interface", "type"] as const;
type SymbolKind = (typeof VALID_KINDS)[number];

function printUsage(): void {
  console.error(`
Usage: npx tsx rename-symbol.ts <tsconfig> <file> <kind> <old-name> <new-name>

Parameters:
  tsconfig  - Path to tsconfig.json (e.g., ./tsconfig.json)
  file      - Source file containing the declaration (e.g., src/utils.ts)
  kind      - Symbol kind: ${VALID_KINDS.join(", ")}
  old-name  - Current symbol name
  new-name  - New symbol name

Example:
  npx tsx rename-symbol.ts ./tsconfig.json src/services/user.ts class UserService AccountService
`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length < 5) {
    console.error("Error: Missing required parameters");
    printUsage();
    process.exit(1);
  }

  const [tsconfigPath, filePath, kind, oldName, newName] = args;

  if (!VALID_KINDS.includes(kind as SymbolKind)) {
    console.error(`Error: Invalid kind '${kind}'. Must be one of: ${VALID_KINDS.join(", ")}`);
    process.exit(1);
  }

  if (oldName === newName) {
    console.error("Error: old-name and new-name are the same");
    process.exit(1);
  }

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
  });

  const sourceFile = project.getSourceFile(filePath);
  if (!sourceFile) {
    console.error(`Error: Source file not found: ${filePath}`);
    console.error("Available files:", project.getSourceFiles().map((f) => f.getFilePath()).slice(0, 10).join("\n  "));
    process.exit(1);
  }

  let declaration;
  const symbolKind = kind as SymbolKind;

  switch (symbolKind) {
    case "function":
      declaration = sourceFile.getFunction(oldName);
      break;
    case "variable":
      declaration = sourceFile.getVariableDeclaration(oldName);
      break;
    case "class":
      declaration = sourceFile.getClass(oldName);
      break;
    case "interface":
      declaration = sourceFile.getInterface(oldName);
      break;
    case "type":
      declaration = sourceFile.getTypeAlias(oldName);
      break;
  }

  if (!declaration) {
    console.error(`Error: ${symbolKind} '${oldName}' not found in ${filePath}`);

    // List available symbols of that kind
    let available: string[] = [];
    switch (symbolKind) {
      case "function":
        available = sourceFile.getFunctions().map((f) => f.getName() || "<anonymous>");
        break;
      case "variable":
        available = sourceFile.getVariableDeclarations().map((v) => v.getName());
        break;
      case "class":
        available = sourceFile.getClasses().map((c) => c.getName() || "<anonymous>");
        break;
      case "interface":
        available = sourceFile.getInterfaces().map((i) => i.getName());
        break;
      case "type":
        available = sourceFile.getTypeAliases().map((t) => t.getName());
        break;
    }

    if (available.length > 0) {
      console.error(`Available ${symbolKind}s in file: ${available.join(", ")}`);
    } else {
      console.error(`No ${symbolKind}s found in file`);
    }
    process.exit(1);
  }

  // Perform the rename - ts-morph handles all references across files
  const referencesCount = declaration.findReferencesAsNodes().length;
  declaration.rename(newName);

  // Save all modified files
  project.saveSync();

  console.log(`Renamed ${symbolKind} '${oldName}' to '${newName}'`);
  console.log(`Updated ${referencesCount} references across the project`);

  // List modified files
  const modifiedFiles = project.getSourceFiles().filter((f) => !f.isSaved());
  if (modifiedFiles.length > 0) {
    console.log("Modified files:");
    for (const file of modifiedFiles) {
      console.log(`  ${file.getFilePath()}`);
    }
  }
}

main();
