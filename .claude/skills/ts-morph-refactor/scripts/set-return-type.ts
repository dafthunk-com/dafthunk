#!/usr/bin/env npx tsx
/**
 * Add or update return type for all methods/functions matching criteria.
 *
 * Usage:
 *   npx tsx set-return-type.ts <tsconfig> <method-name> <return-type> [--class=ClassName] [--interface=InterfaceName] [--current-type=Type]
 *
 * Parameters:
 *   tsconfig      - Path to tsconfig.json
 *   method-name   - Name of the method/function (use "*" for all)
 *   return-type   - New return type to set
 *   --class       - Only methods in classes extending/implementing this class
 *   --interface   - Only methods in classes implementing this interface
 *   --current-type - Only update methods with this current return type (use "none" for no return type)
 *
 * Examples:
 *   npx tsx set-return-type.ts ./tsconfig.json execute "Promise<NodeExecution>" --class=ExecutableNode
 *   npx tsx set-return-type.ts ./tsconfig.json handle "Promise<Response>" --interface=Handler
 *   npx tsx set-return-type.ts ./tsconfig.json "*" void --current-type=none
 */

import { Project, ClassDeclaration, FunctionDeclaration, MethodDeclaration } from "ts-morph";

function printUsage(): void {
  console.error(`
Usage: npx tsx set-return-type.ts <tsconfig> <method-name> <return-type> [options]

Parameters:
  tsconfig      - Path to tsconfig.json
  method-name   - Name of the method/function (use "*" for all)
  return-type   - New return type to set

Options:
  --class=ClassName       - Only methods in classes extending/implementing this class
  --interface=InterfaceName - Only methods in classes implementing this interface
  --current-type=Type     - Only update methods with this current return type (use "none" for untyped)

Examples:
  npx tsx set-return-type.ts ./tsconfig.json execute "Promise<NodeExecution>" --class=ExecutableNode
  npx tsx set-return-type.ts ./tsconfig.json handle "Promise<Response>" --interface=Handler
  npx tsx set-return-type.ts ./tsconfig.json processData Result --current-type=any
`);
}

function parseOption(args: string[], prefix: string): string | undefined {
  const arg = args.find((a) => a.startsWith(prefix));
  if (arg) {
    return arg.substring(prefix.length);
  }
  return undefined;
}

function findClassesImplementing(project: Project, baseTypeName: string): Set<ClassDeclaration> {
  const implementations = new Set<ClassDeclaration>();
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
          implementations.add(cls);
          collect(className);
        }
      }
    }
  }

  // Include the base class itself if it exists
  for (const sourceFile of project.getSourceFiles()) {
    const baseClass = sourceFile.getClass(baseTypeName);
    if (baseClass) {
      implementations.add(baseClass);
      visited.add(baseTypeName);
    }
  }

  collect(baseTypeName);
  return implementations;
}

function setReturnTypeOnFunction(
  func: FunctionDeclaration | MethodDeclaration,
  newReturnType: string,
  currentTypeFilter: string | undefined
): { updated: boolean; oldType: string } {
  const returnTypeNode = func.getReturnTypeNode();
  const currentType = returnTypeNode ? returnTypeNode.getText() : "none";

  // Check current type filter
  if (currentTypeFilter) {
    if (currentTypeFilter === "none" && returnTypeNode) {
      return { updated: false, oldType: currentType };
    }
    if (currentTypeFilter !== "none" && currentType !== currentTypeFilter) {
      // Allow partial match for complex types
      if (!currentType.includes(currentTypeFilter)) {
        return { updated: false, oldType: currentType };
      }
    }
  }

  // Skip if already has the target type
  if (currentType === newReturnType) {
    return { updated: false, oldType: currentType };
  }

  func.setReturnType(newReturnType);
  return { updated: true, oldType: currentType };
}

function main(): void {
  const args = process.argv.slice(2);

  const positionalArgs = args.filter((a) => !a.startsWith("--"));
  if (positionalArgs.length < 3) {
    console.error("Error: Missing required parameters");
    printUsage();
    process.exit(1);
  }

  const [tsconfigPath, methodName, returnType] = positionalArgs;

  const classFilter = parseOption(args, "--class=");
  const interfaceFilter = parseOption(args, "--interface=");
  const currentTypeFilter = parseOption(args, "--current-type=");

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
  });

  let targetClasses: Set<ClassDeclaration> | null = null;

  // Build set of target classes if filtering by class/interface
  if (classFilter) {
    targetClasses = findClassesImplementing(project, classFilter);
    if (targetClasses.size === 0) {
      console.error(`Error: No classes found extending/implementing '${classFilter}'`);
      process.exit(1);
    }
    console.log(`Found ${targetClasses.size} class(es) extending/implementing '${classFilter}'`);
  }

  if (interfaceFilter) {
    const interfaceClasses = findClassesImplementing(project, interfaceFilter);
    if (interfaceClasses.size === 0) {
      console.error(`Error: No classes found implementing '${interfaceFilter}'`);
      process.exit(1);
    }
    if (targetClasses) {
      targetClasses = new Set([...targetClasses].filter((c) => interfaceClasses.has(c)));
    } else {
      targetClasses = interfaceClasses;
    }
    console.log(`Found ${targetClasses.size} class(es) implementing '${interfaceFilter}'`);
  }

  let updatedCount = 0;
  let skippedCount = 0;
  const modifiedFiles = new Set<string>();
  const matchAll = methodName === "*";
  const typeChanges: Array<{ location: string; oldType: string; newType: string }> = [];

  // Process class methods
  for (const sourceFile of project.getSourceFiles()) {
    for (const cls of sourceFile.getClasses()) {
      if (targetClasses && !targetClasses.has(cls)) continue;

      const methods = matchAll ? cls.getMethods() : [cls.getMethod(methodName)].filter(Boolean);

      for (const method of methods) {
        if (!method) continue;

        const result = setReturnTypeOnFunction(method, returnType, currentTypeFilter);
        if (result.updated) {
          const className = cls.getName() || "<anonymous>";
          const methodNameStr = method.getName();
          const location = `${className}.${methodNameStr}()`;
          typeChanges.push({ location, oldType: result.oldType, newType: returnType });
          updatedCount++;
          modifiedFiles.add(sourceFile.getFilePath());
        } else {
          skippedCount++;
        }
      }
    }

    // Process standalone functions (only if no class/interface filter)
    if (!targetClasses) {
      const functions = matchAll
        ? sourceFile.getFunctions()
        : [sourceFile.getFunction(methodName)].filter(Boolean);

      for (const func of functions) {
        if (!func) continue;

        const result = setReturnTypeOnFunction(func, returnType, currentTypeFilter);
        if (result.updated) {
          const funcName = func.getName() || "<anonymous>";
          typeChanges.push({ location: funcName + "()", oldType: result.oldType, newType: returnType });
          updatedCount++;
          modifiedFiles.add(sourceFile.getFilePath());
        } else {
          skippedCount++;
        }
      }
    }
  }

  if (updatedCount === 0) {
    console.log(`No methods found matching criteria:`);
    console.log(`  Method: ${methodName}`);
    if (classFilter) console.log(`  Class filter: ${classFilter}`);
    if (interfaceFilter) console.log(`  Interface filter: ${interfaceFilter}`);
    if (currentTypeFilter) console.log(`  Current type filter: ${currentTypeFilter}`);
    process.exit(0);
  }

  project.saveSync();

  console.log(`\nChanges made:`);
  for (const change of typeChanges) {
    console.log(`  ${change.location}: ${change.oldType} -> ${change.newType}`);
  }

  console.log(`\nSummary:`);
  console.log(`  Return types updated: ${updatedCount}`);
  console.log(`  Skipped (no match or already correct): ${skippedCount}`);
  console.log(`  Files modified: ${modifiedFiles.size}`);
}

main();
