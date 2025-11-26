#!/usr/bin/env npx tsx
/**
 * Propagate interface changes to all implementing classes.
 * Adds missing properties/methods from an interface to all classes that implement it.
 *
 * Usage:
 *   npx tsx propagate-interface.ts <tsconfig> <interface-name> [--dry-run]
 *
 * Parameters:
 *   tsconfig       - Path to tsconfig.json
 *   interface-name - Name of the interface to propagate
 *   --dry-run      - Show what would be changed without making changes
 *
 * Examples:
 *   npx tsx propagate-interface.ts ./tsconfig.json NodeContext
 *   npx tsx propagate-interface.ts ./tsconfig.json Handler --dry-run
 */

import { Project, ClassDeclaration, InterfaceDeclaration, Scope, SyntaxKind } from "ts-morph";

function printUsage(): void {
  console.error(`
Usage: npx tsx propagate-interface.ts <tsconfig> <interface-name> [--dry-run]

Parameters:
  tsconfig       - Path to tsconfig.json
  interface-name - Name of the interface to propagate
  --dry-run      - Show what would be changed without making changes

Examples:
  npx tsx propagate-interface.ts ./tsconfig.json NodeContext
  npx tsx propagate-interface.ts ./tsconfig.json Handler --dry-run
`);
}

function findAllImplementingClasses(project: Project, interfaceName: string): ClassDeclaration[] {
  const implementations: ClassDeclaration[] = [];
  const visited = new Set<string>();

  function collect(typeName: string): void {
    for (const sourceFile of project.getSourceFiles()) {
      for (const cls of sourceFile.getClasses()) {
        const className = cls.getName();
        if (!className || visited.has(className)) continue;

        const implementsTarget = cls.getImplements().some((impl) => {
          const baseName = impl.getText().split("<")[0].trim();
          return baseName === typeName;
        });

        const extendsTarget = cls.getExtends()?.getText().split("<")[0].trim() === typeName;

        if (implementsTarget || extendsTarget) {
          visited.add(className);
          implementations.push(cls);
          collect(className);
        }
      }
    }
  }

  collect(interfaceName);
  return implementations;
}

function getInterfaceMembers(iface: InterfaceDeclaration): {
  properties: Array<{ name: string; type: string; optional: boolean; readonly: boolean }>;
  methods: Array<{
    name: string;
    returnType: string;
    parameters: Array<{ name: string; type: string; optional: boolean }>;
    optional: boolean;
  }>;
} {
  const properties = iface.getProperties().map((prop) => ({
    name: prop.getName(),
    type: prop.getType().getText(),
    optional: prop.hasQuestionToken(),
    readonly: prop.isReadonly(),
  }));

  const methods = iface.getMethods().map((method) => ({
    name: method.getName(),
    returnType: method.getReturnType().getText(),
    parameters: method.getParameters().map((p) => ({
      name: p.getName(),
      type: p.getType().getText(),
      optional: p.isOptional(),
    })),
    optional: method.hasQuestionToken(),
  }));

  // Also collect from extended interfaces
  for (const extendedInterface of iface.getExtends()) {
    const extendedType = extendedInterface.getType();
    const symbol = extendedType.getSymbol();
    if (symbol) {
      const declarations = symbol.getDeclarations();
      for (const decl of declarations) {
        if (decl.getKind() === SyntaxKind.InterfaceDeclaration) {
          const extended = getInterfaceMembers(decl as InterfaceDeclaration);
          properties.push(...extended.properties);
          methods.push(...extended.methods);
        }
      }
    }
  }

  return { properties, methods };
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positionalArgs = args.filter((a) => !a.startsWith("--"));

  if (positionalArgs.length < 2) {
    console.error("Error: Missing required parameters");
    printUsage();
    process.exit(1);
  }

  const [tsconfigPath, interfaceName] = positionalArgs;

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
  });

  // Find the interface
  let targetInterface: InterfaceDeclaration | undefined;
  for (const sourceFile of project.getSourceFiles()) {
    targetInterface = sourceFile.getInterface(interfaceName);
    if (targetInterface) break;
  }

  if (!targetInterface) {
    console.error(`Error: Interface '${interfaceName}' not found`);

    // List available interfaces
    const interfaces: string[] = [];
    for (const sf of project.getSourceFiles()) {
      interfaces.push(...sf.getInterfaces().map((i) => i.getName()));
    }
    if (interfaces.length > 0) {
      console.error(`\nAvailable interfaces (first 30): ${interfaces.slice(0, 30).join(", ")}`);
    }
    process.exit(1);
  }

  // Get interface members
  const { properties, methods } = getInterfaceMembers(targetInterface);

  console.log(`Interface '${interfaceName}' has:`);
  console.log(`  Properties: ${properties.length}`);
  console.log(`  Methods: ${methods.length}`);

  if (properties.length === 0 && methods.length === 0) {
    console.log("\nNothing to propagate.");
    process.exit(0);
  }

  // Find all implementing classes
  const implementations = findAllImplementingClasses(project, interfaceName);

  if (implementations.length === 0) {
    console.log(`\nNo classes found implementing '${interfaceName}'`);
    process.exit(0);
  }

  console.log(`\nFound ${implementations.length} implementing class(es)`);

  if (dryRun) {
    console.log("\n[DRY RUN - no changes will be made]\n");
  }

  let totalPropertiesAdded = 0;
  let totalMethodsAdded = 0;
  const modifiedFiles = new Set<string>();

  for (const cls of implementations) {
    const className = cls.getName() || "<anonymous>";
    const filePath = cls.getSourceFile().getFilePath();
    const changes: string[] = [];

    // Check and add missing properties
    for (const prop of properties) {
      const existingProp = cls.getProperty(prop.name);
      if (!existingProp) {
        if (!dryRun) {
          cls.addProperty({
            name: prop.name,
            type: prop.type,
            hasQuestionToken: prop.optional,
            isReadonly: prop.readonly,
            scope: Scope.Public,
          });
        }
        changes.push(`+ property: ${prop.readonly ? "readonly " : ""}${prop.name}${prop.optional ? "?" : ""}: ${prop.type}`);
        totalPropertiesAdded++;
      }
    }

    // Check and add missing methods
    for (const method of methods) {
      const existingMethod = cls.getMethod(method.name);
      if (!existingMethod) {
        if (!dryRun) {
          const addedMethod = cls.addMethod({
            name: method.name,
            parameters: method.parameters.map((p) => ({
              name: p.name,
              type: p.type,
              hasQuestionToken: p.optional,
            })),
            returnType: method.returnType,
            scope: Scope.Public,
          });

          // Add placeholder body
          addedMethod.setBodyText("// TODO: Implement this method\nthrow new Error(\"Not implemented\");");
        }

        const paramStr = method.parameters.map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`).join(", ");
        changes.push(`+ method: ${method.name}(${paramStr}): ${method.returnType}`);
        totalMethodsAdded++;
      }
    }

    if (changes.length > 0) {
      console.log(`\n${className} (${filePath}):`);
      for (const change of changes) {
        console.log(`  ${change}`);
      }
      modifiedFiles.add(filePath);
    }
  }

  if (!dryRun && (totalPropertiesAdded > 0 || totalMethodsAdded > 0)) {
    project.saveSync();
  }

  console.log(`\nSummary:`);
  console.log(`  Classes processed: ${implementations.length}`);
  console.log(`  Properties added: ${totalPropertiesAdded}`);
  console.log(`  Methods added: ${totalMethodsAdded}`);
  console.log(`  Files ${dryRun ? "would be " : ""}modified: ${modifiedFiles.size}`);

  if (dryRun && (totalPropertiesAdded > 0 || totalMethodsAdded > 0)) {
    console.log("\nRun without --dry-run to apply changes.");
  }
}

main();
