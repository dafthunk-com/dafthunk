#!/usr/bin/env npx tsx
/**
 * List all exports from a file or directory with their types and signatures.
 *
 * Usage:
 *   npx tsx list-exports.ts <tsconfig> <path> [--recursive] [--types-only] [--functions-only] [--classes-only]
 *
 * Parameters:
 *   tsconfig         - Path to tsconfig.json
 *   path             - File or directory to analyze
 *   --recursive      - Recursively analyze directories
 *   --types-only     - Show only type/interface exports
 *   --functions-only - Show only function exports
 *   --classes-only   - Show only class exports
 */

import { Project, SourceFile, ExportedDeclarations, SyntaxKind } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

function printUsage(): void {
  console.error(`
Usage: npx tsx list-exports.ts <tsconfig> <path> [--recursive] [--types-only] [--functions-only] [--classes-only]

Parameters:
  tsconfig         - Path to tsconfig.json
  path             - File or directory to analyze
  --recursive      - Recursively analyze directories
  --types-only     - Show only type/interface exports
  --functions-only - Show only function exports
  --classes-only   - Show only class exports

Example:
  npx tsx list-exports.ts ./tsconfig.json src/utils/
  npx tsx list-exports.ts ./tsconfig.json src/index.ts --types-only
`);
}

interface ExportInfo {
  name: string;
  kind: string;
  signature: string;
}

function getExportSignature(name: string, declarations: ExportedDeclarations[]): ExportInfo | null {
  if (declarations.length === 0) return null;

  const decl = declarations[0];
  const kind = decl.getKindName();

  switch (decl.getKind()) {
    case SyntaxKind.FunctionDeclaration: {
      const func = decl.asKind(SyntaxKind.FunctionDeclaration)!;
      const params = func.getParameters().map((p) => {
        const optional = p.isOptional() ? "?" : "";
        return `${p.getName()}${optional}: ${p.getType().getText(p)}`;
      });
      const returnType = func.getReturnType().getText(func);
      const asyncMod = func.isAsync() ? "async " : "";
      return {
        name,
        kind: "function",
        signature: `export ${asyncMod}function ${name}(${params.join(", ")}): ${returnType}`,
      };
    }

    case SyntaxKind.ClassDeclaration: {
      const cls = decl.asKind(SyntaxKind.ClassDeclaration)!;
      const abstractMod = cls.isAbstract() ? "abstract " : "";
      const extendsClause = cls.getExtends()?.getText();
      const implementsClauses = cls.getImplements().map((i) => i.getText());

      let sig = `export ${abstractMod}class ${name}`;
      if (extendsClause) sig += ` extends ${extendsClause}`;
      if (implementsClauses.length > 0) sig += ` implements ${implementsClauses.join(", ")}`;

      return { name, kind: "class", signature: sig };
    }

    case SyntaxKind.InterfaceDeclaration: {
      const iface = decl.asKind(SyntaxKind.InterfaceDeclaration)!;
      const extendsClauses = iface.getExtends().map((e) => e.getText());

      let sig = `export interface ${name}`;
      if (extendsClauses.length > 0) sig += ` extends ${extendsClauses.join(", ")}`;

      return { name, kind: "interface", signature: sig };
    }

    case SyntaxKind.TypeAliasDeclaration: {
      const typeAlias = decl.asKind(SyntaxKind.TypeAliasDeclaration)!;
      const typeParams = typeAlias.getTypeParameters().map((p) => p.getText());
      const typeParamsStr = typeParams.length > 0 ? `<${typeParams.join(", ")}>` : "";
      const type = typeAlias.getType().getText(typeAlias);

      return {
        name,
        kind: "type",
        signature: `export type ${name}${typeParamsStr} = ${type}`,
      };
    }

    case SyntaxKind.VariableDeclaration: {
      const varDecl = decl.asKind(SyntaxKind.VariableDeclaration)!;
      const type = varDecl.getType().getText(varDecl);
      const declKind = varDecl.getVariableStatement()?.getDeclarationKind() || "const";

      return {
        name,
        kind: "variable",
        signature: `export ${declKind} ${name}: ${type}`,
      };
    }

    case SyntaxKind.EnumDeclaration: {
      return {
        name,
        kind: "enum",
        signature: `export enum ${name}`,
      };
    }

    default:
      return {
        name,
        kind: kind.toLowerCase(),
        signature: `export ${kind.toLowerCase()} ${name}`,
      };
  }
}

function analyzeFile(
  sourceFile: SourceFile,
  filters: { typesOnly: boolean; functionsOnly: boolean; classesOnly: boolean }
): ExportInfo[] {
  const exports: ExportInfo[] = [];
  const exportedDeclarations = sourceFile.getExportedDeclarations();

  for (const [name, declarations] of exportedDeclarations) {
    const info = getExportSignature(name, declarations);
    if (!info) continue;

    // Apply filters
    if (filters.typesOnly && info.kind !== "type" && info.kind !== "interface") continue;
    if (filters.functionsOnly && info.kind !== "function") continue;
    if (filters.classesOnly && info.kind !== "class") continue;

    exports.push(info);
  }

  // Sort by kind then name
  return exports.sort((a, b) => {
    const kindOrder = ["interface", "type", "class", "function", "variable", "enum"];
    const aKindIdx = kindOrder.indexOf(a.kind);
    const bKindIdx = kindOrder.indexOf(b.kind);
    if (aKindIdx !== bKindIdx) return aKindIdx - bKindIdx;
    return a.name.localeCompare(b.name);
  });
}

function collectFiles(targetPath: string, recursive: boolean): string[] {
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    return [targetPath];
  }

  if (stat.isDirectory()) {
    const files: string[] = [];
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);

      if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        if (!entry.name.endsWith(".d.ts") && !entry.name.endsWith(".test.ts")) {
          files.push(fullPath);
        }
      } else if (entry.isDirectory() && recursive && entry.name !== "node_modules") {
        files.push(...collectFiles(fullPath, recursive));
      }
    }

    return files.sort();
  }

  return [];
}

function main(): void {
  const args = process.argv.slice(2);

  const recursive = args.includes("--recursive");
  const typesOnly = args.includes("--types-only");
  const functionsOnly = args.includes("--functions-only");
  const classesOnly = args.includes("--classes-only");

  const positionalArgs = args.filter((a) => !a.startsWith("--"));

  if (positionalArgs.length < 2) {
    console.error("Error: Missing required parameters");
    printUsage();
    process.exit(1);
  }

  const [tsconfigPath, targetPath] = positionalArgs;

  if (!fs.existsSync(targetPath)) {
    console.error(`Error: Path not found: ${targetPath}`);
    process.exit(1);
  }

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
  });

  const files = collectFiles(targetPath, recursive);
  const filters = { typesOnly, functionsOnly, classesOnly };

  let totalExports = 0;

  for (const file of files) {
    const sourceFile = project.addSourceFileAtPath(file);
    const exports = analyzeFile(sourceFile, filters);

    if (exports.length === 0) continue;

    console.log(`${file}:`);
    for (const exp of exports) {
      console.log(`  ${exp.signature}`);
    }
    console.log();

    totalExports += exports.length;
  }

  if (totalExports === 0) {
    console.log("No exports found matching criteria.");
  } else {
    console.log(`Total: ${totalExports} export(s) in ${files.length} file(s)`);
  }
}

main();
