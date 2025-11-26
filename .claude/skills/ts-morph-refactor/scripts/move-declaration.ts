#!/usr/bin/env npx tsx
/**
 * Move a declaration from one file to another, updating all imports.
 *
 * Usage:
 *   npx tsx move-declaration.ts <tsconfig> <source-file> <target-file> <kind> <name>
 *
 * Parameters:
 *   tsconfig    - Path to tsconfig.json
 *   source-file - File containing the declaration
 *   target-file - Destination file (created if doesn't exist)
 *   kind        - Declaration kind: function, variable, class, interface, type
 *   name        - Name of declaration to move
 *
 * Example:
 *   npx tsx move-declaration.ts ./tsconfig.json src/utils.ts src/helpers/string-utils.ts function formatDate
 */

import { Project, SourceFile, SyntaxKind } from "ts-morph";
import * as path from "path";

const VALID_KINDS = ["function", "variable", "class", "interface", "type"] as const;
type DeclarationKind = (typeof VALID_KINDS)[number];

function printUsage(): void {
  console.error(`
Usage: npx tsx move-declaration.ts <tsconfig> <source-file> <target-file> <kind> <name>

Parameters:
  tsconfig    - Path to tsconfig.json
  source-file - File containing the declaration
  target-file - Destination file (created if doesn't exist)
  kind        - Declaration kind: ${VALID_KINDS.join(", ")}
  name        - Name of declaration to move

Example:
  npx tsx move-declaration.ts ./tsconfig.json src/utils.ts src/helpers/string-utils.ts function formatDate
`);
}

function getRelativeImportPath(fromFile: SourceFile, toFile: SourceFile): string {
  const fromDir = path.dirname(fromFile.getFilePath());
  const toPath = toFile.getFilePath();
  let relativePath = path.relative(fromDir, toPath);

  // Remove .ts extension
  relativePath = relativePath.replace(/\.tsx?$/, "");

  // Ensure it starts with ./ or ../
  if (!relativePath.startsWith(".")) {
    relativePath = "./" + relativePath;
  }

  return relativePath;
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length < 5) {
    console.error("Error: Missing required parameters");
    printUsage();
    process.exit(1);
  }

  const [tsconfigPath, sourceFilePath, targetFilePath, kind, name] = args;

  if (!VALID_KINDS.includes(kind as DeclarationKind)) {
    console.error(`Error: Invalid kind '${kind}'. Must be one of: ${VALID_KINDS.join(", ")}`);
    process.exit(1);
  }

  if (sourceFilePath === targetFilePath) {
    console.error("Error: source-file and target-file must be different");
    process.exit(1);
  }

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
  });

  const sourceFile = project.getSourceFile(sourceFilePath);
  if (!sourceFile) {
    console.error(`Error: Source file not found: ${sourceFilePath}`);
    process.exit(1);
  }

  // Get or create target file
  let targetFile = project.getSourceFile(targetFilePath);
  if (!targetFile) {
    targetFile = project.createSourceFile(targetFilePath, "", { overwrite: false });
    console.log(`Created new file: ${targetFilePath}`);
  }

  const declarationKind = kind as DeclarationKind;

  // Find the declaration
  let declaration;
  let declarationText: string;
  let isExported = false;

  switch (declarationKind) {
    case "function": {
      const func = sourceFile.getFunction(name);
      if (!func) {
        const available = sourceFile.getFunctions().map((f) => f.getName() || "<anonymous>");
        console.error(`Error: Function '${name}' not found. Available: ${available.join(", ") || "none"}`);
        process.exit(1);
      }
      declaration = func;
      isExported = func.isExported();
      declarationText = func.getFullText();
      break;
    }
    case "variable": {
      const varDecl = sourceFile.getVariableDeclaration(name);
      if (!varDecl) {
        const available = sourceFile.getVariableDeclarations().map((v) => v.getName());
        console.error(`Error: Variable '${name}' not found. Available: ${available.join(", ") || "none"}`);
        process.exit(1);
      }
      declaration = varDecl;
      const varStmt = varDecl.getVariableStatement();
      if (varStmt) {
        isExported = varStmt.isExported();
        declarationText = varStmt.getFullText();
      } else {
        declarationText = varDecl.getFullText();
      }
      break;
    }
    case "class": {
      const cls = sourceFile.getClass(name);
      if (!cls) {
        const available = sourceFile.getClasses().map((c) => c.getName() || "<anonymous>");
        console.error(`Error: Class '${name}' not found. Available: ${available.join(", ") || "none"}`);
        process.exit(1);
      }
      declaration = cls;
      isExported = cls.isExported();
      declarationText = cls.getFullText();
      break;
    }
    case "interface": {
      const iface = sourceFile.getInterface(name);
      if (!iface) {
        const available = sourceFile.getInterfaces().map((i) => i.getName());
        console.error(`Error: Interface '${name}' not found. Available: ${available.join(", ") || "none"}`);
        process.exit(1);
      }
      declaration = iface;
      isExported = iface.isExported();
      declarationText = iface.getFullText();
      break;
    }
    case "type": {
      const typeAlias = sourceFile.getTypeAlias(name);
      if (!typeAlias) {
        const available = sourceFile.getTypeAliases().map((t) => t.getName());
        console.error(`Error: Type alias '${name}' not found. Available: ${available.join(", ") || "none"}`);
        process.exit(1);
      }
      declaration = typeAlias;
      isExported = typeAlias.isExported();
      declarationText = typeAlias.getFullText();
      break;
    }
  }

  // Collect imports needed by the declaration
  const referencedSymbols = new Set<string>();
  declaration.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.Identifier) {
      const symbol = node.getSymbol();
      if (symbol) {
        const declarations = symbol.getDeclarations();
        for (const decl of declarations) {
          const declSourceFile = decl.getSourceFile();
          if (declSourceFile !== sourceFile && declSourceFile !== targetFile) {
            // This is an imported symbol
            referencedSymbols.add(symbol.getName());
          }
        }
      }
    }
  });

  // Copy relevant imports to target file
  const sourceImports = sourceFile.getImportDeclarations();
  for (const imp of sourceImports) {
    const namedImports = imp.getNamedImports();
    const neededImports = namedImports.filter((ni) => referencedSymbols.has(ni.getName()));

    if (neededImports.length > 0) {
      const moduleSpecifier = imp.getModuleSpecifierValue();

      // Check if target file already has this import
      const existingImport = targetFile.getImportDeclaration(moduleSpecifier);
      if (existingImport) {
        // Add missing named imports
        for (const ni of neededImports) {
          const existingNamed = existingImport.getNamedImports();
          if (!existingNamed.some((en) => en.getName() === ni.getName())) {
            existingImport.addNamedImport(ni.getName());
          }
        }
      } else {
        // Add new import
        targetFile.addImportDeclaration({
          moduleSpecifier: moduleSpecifier,
          namedImports: neededImports.map((ni) => ni.getName()),
        });
      }
    }
  }

  // Add declaration to target file (ensure it's exported)
  let textToAdd = declarationText.trim();
  if (!isExported) {
    // Add export keyword
    textToAdd = "export " + textToAdd;
  }
  targetFile.addStatements(textToAdd);

  // Find all files that import this symbol from source file
  const filesUpdated: string[] = [];
  const relativePathToTarget = getRelativeImportPath(sourceFile, targetFile);

  for (const file of project.getSourceFiles()) {
    if (file === sourceFile || file === targetFile) continue;

    const imports = file.getImportDeclarations();
    for (const imp of imports) {
      // Check if this import is from the source file
      const moduleSpecifier = imp.getModuleSpecifierValue();
      const resolvedModule = imp.getModuleSpecifierSourceFile();

      if (resolvedModule === sourceFile) {
        const namedImports = imp.getNamedImports();
        const targetImport = namedImports.find((ni) => ni.getName() === name);

        if (targetImport) {
          // Remove from current import
          targetImport.remove();

          // If import is now empty, remove it
          if (imp.getNamedImports().length === 0 && !imp.getDefaultImport() && !imp.getNamespaceImport()) {
            imp.remove();
          }

          // Add import from new location
          const newModuleSpecifier = getRelativeImportPath(file, targetFile);
          const existingNewImport = file.getImportDeclaration(newModuleSpecifier);

          if (existingNewImport) {
            const existingNamed = existingNewImport.getNamedImports();
            if (!existingNamed.some((ni) => ni.getName() === name)) {
              existingNewImport.addNamedImport(name);
            }
          } else {
            file.addImportDeclaration({
              moduleSpecifier: newModuleSpecifier,
              namedImports: [name],
            });
          }

          filesUpdated.push(file.getFilePath());
        }
      }
    }
  }

  // Remove declaration from source file
  if (declarationKind === "variable") {
    const varDecl = sourceFile.getVariableDeclaration(name);
    const varStmt = varDecl?.getVariableStatement();
    if (varStmt) {
      // If this is the only declaration in the statement, remove the whole statement
      if (varStmt.getDeclarations().length === 1) {
        varStmt.remove();
      } else {
        varDecl?.remove();
      }
    }
  } else {
    declaration.remove();
  }

  // If source file still uses the moved symbol, add import
  const sourceFileText = sourceFile.getFullText();
  const symbolRegex = new RegExp(`\\b${name}\\b`);
  if (symbolRegex.test(sourceFileText)) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: relativePathToTarget,
      namedImports: [name],
    });
  }

  // Organize imports in modified files
  sourceFile.organizeImports();
  targetFile.organizeImports();
  for (const filePath of filesUpdated) {
    const file = project.getSourceFile(filePath);
    file?.organizeImports();
  }

  project.saveSync();

  console.log(`Moved ${declarationKind} '${name}' from ${sourceFilePath} to ${targetFilePath}`);
  console.log(`Updated imports in ${filesUpdated.length} file(s)`);
  if (filesUpdated.length > 0) {
    console.log("Files updated:");
    for (const f of filesUpdated) {
      console.log(`  ${f}`);
    }
  }
}

main();
