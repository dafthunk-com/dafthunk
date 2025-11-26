#!/usr/bin/env npx tsx
/**
 * Generate a TypeScript interface from a class's public members.
 *
 * Usage:
 *   npx tsx extract-interface.ts <tsconfig> <file> <class-name> [--name=InterfaceName] [--include-protected]
 *
 * Parameters:
 *   tsconfig          - Path to tsconfig.json
 *   file              - Source file containing the class
 *   class-name        - Name of the class to extract from
 *   --name=Name       - Name for the generated interface (default: I{ClassName})
 *   --include-protected - Include protected members
 */

import { Project, ClassDeclaration, SyntaxKind } from "ts-morph";

function printUsage(): void {
  console.error(`
Usage: npx tsx extract-interface.ts <tsconfig> <file> <class-name> [--name=InterfaceName] [--include-protected]

Parameters:
  tsconfig          - Path to tsconfig.json
  file              - Source file containing the class
  class-name        - Name of the class to extract from
  --name=Name       - Name for the generated interface (default: I{ClassName})
  --include-protected - Include protected members

Example:
  npx tsx extract-interface.ts ./tsconfig.json src/services/user.ts UserService --name=IUserService
`);
}

function isPrivate(node: { hasModifier(kind: SyntaxKind): boolean }): boolean {
  return node.hasModifier(SyntaxKind.PrivateKeyword);
}

function isProtected(node: { hasModifier(kind: SyntaxKind): boolean }): boolean {
  return node.hasModifier(SyntaxKind.ProtectedKeyword);
}

function extractInterface(
  cls: ClassDeclaration,
  interfaceName: string,
  includeProtected: boolean
): string {
  const lines: string[] = [];

  lines.push(`export interface ${interfaceName} {`);

  // Extract properties
  for (const prop of cls.getProperties()) {
    // Skip private members
    if (isPrivate(prop)) continue;
    // Skip protected unless requested
    if (isProtected(prop) && !includeProtected) continue;
    // Skip static properties (interfaces can't have static members)
    if (prop.isStatic()) continue;

    const readonly = prop.isReadonly() ? "readonly " : "";
    const propName = prop.getName();
    const optional = prop.hasQuestionToken() ? "?" : "";
    const type = prop.getType().getText(prop);

    lines.push(`  ${readonly}${propName}${optional}: ${type};`);
  }

  // Extract getters as readonly properties
  for (const getter of cls.getGetAccessors()) {
    if (isPrivate(getter)) continue;
    if (isProtected(getter) && !includeProtected) continue;
    if (getter.isStatic()) continue;

    // Check if there's a corresponding setter
    const setterName = getter.getName();
    const hasSetter = cls.getSetAccessor(setterName) !== undefined;

    const readonly = hasSetter ? "" : "readonly ";
    const type = getter.getReturnType().getText(getter);

    lines.push(`  ${readonly}${setterName}: ${type};`);
  }

  // Extract methods
  for (const method of cls.getMethods()) {
    // Skip private methods
    if (isPrivate(method)) continue;
    // Skip protected unless requested
    if (isProtected(method) && !includeProtected) continue;
    // Skip static methods (interfaces can't have static members)
    if (method.isStatic()) continue;

    const methodName = method.getName();
    const params = method.getParameters().map((p) => {
      const optional = p.isOptional() ? "?" : "";
      return `${p.getName()}${optional}: ${p.getType().getText(p)}`;
    });
    const returnType = method.getReturnType().getText(method);

    lines.push(`  ${methodName}(${params.join(", ")}): ${returnType};`);
  }

  lines.push("}");

  return lines.join("\n");
}

function main(): void {
  const args = process.argv.slice(2);

  const includeProtected = args.includes("--include-protected");
  const nameArg = args.find((a) => a.startsWith("--name="));
  const customName = nameArg ? nameArg.split("=")[1] : null;

  const positionalArgs = args.filter((a) => !a.startsWith("--"));

  if (positionalArgs.length < 3) {
    console.error("Error: Missing required parameters");
    printUsage();
    process.exit(1);
  }

  const [tsconfigPath, filePath, className] = positionalArgs;

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
  });

  const sourceFile = project.addSourceFileAtPath(filePath);
  const cls = sourceFile.getClass(className);

  if (!cls) {
    console.error(`Error: Class '${className}' not found in ${filePath}`);
    const classes = sourceFile.getClasses().map((c) => c.getName()).filter(Boolean);
    if (classes.length > 0) {
      console.error(`Available classes: ${classes.join(", ")}`);
    }
    process.exit(1);
  }

  const interfaceName = customName || `I${className}`;
  const result = extractInterface(cls, interfaceName, includeProtected);

  console.log(result);
}

main();
