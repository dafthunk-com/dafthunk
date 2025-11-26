#!/usr/bin/env npx tsx
/**
 * Rename a parameter across all methods/functions that match a given signature pattern.
 *
 * Usage:
 *   npx tsx rename-parameter.ts <tsconfig> <method-name> <old-param> <new-param> [--class=ClassName] [--interface=InterfaceName] [--param-type=Type]
 *
 * Parameters:
 *   tsconfig     - Path to tsconfig.json
 *   method-name  - Name of the method/function (use "*" for all methods)
 *   old-param    - Current parameter name to rename
 *   new-param    - New parameter name
 *   --class      - Only rename in methods of classes extending/implementing this class
 *   --interface  - Only rename in methods of classes implementing this interface
 *   --param-type - Only rename parameters with this type
 *
 * Examples:
 *   npx tsx rename-parameter.ts ./tsconfig.json execute ctx context --class=ExecutableNode
 *   npx tsx rename-parameter.ts ./tsconfig.json handle c context --interface=Handler
 *   npx tsx rename-parameter.ts ./tsconfig.json "*" req request --param-type=Request
 */

import { Project, ClassDeclaration, FunctionDeclaration, MethodDeclaration, MethodSignature } from "ts-morph";

function printUsage(): void {
  console.error(`
Usage: npx tsx rename-parameter.ts <tsconfig> <method-name> <old-param> <new-param> [options]

Parameters:
  tsconfig     - Path to tsconfig.json
  method-name  - Name of the method/function (use "*" for all methods)
  old-param    - Current parameter name to rename
  new-param    - New parameter name

Options:
  --class=ClassName       - Only methods in classes extending/implementing this class
  --interface=InterfaceName - Only methods in classes implementing this interface
  --param-type=Type       - Only parameters with this type

Examples:
  npx tsx rename-parameter.ts ./tsconfig.json execute ctx context --class=ExecutableNode
  npx tsx rename-parameter.ts ./tsconfig.json handle c context --interface=Handler
  npx tsx rename-parameter.ts ./tsconfig.json "*" req request --param-type=Request
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

  // Also include the base class itself if it exists
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

function renameParameterInFunction(
  func: FunctionDeclaration | MethodDeclaration | MethodSignature,
  oldParam: string,
  newParam: string,
  paramType: string | undefined
): boolean {
  const param = func.getParameter(oldParam);
  if (!param) return false;

  // Check type constraint if specified
  if (paramType) {
    const actualType = param.getType().getText();
    // Handle both exact match and partial match (e.g., "Request" matches "import(...).Request")
    if (!actualType.includes(paramType)) {
      return false;
    }
  }

  // Rename the parameter - this updates all usages within the function body
  param.rename(newParam);
  return true;
}

function main(): void {
  const args = process.argv.slice(2);

  const positionalArgs = args.filter((a) => !a.startsWith("--"));
  if (positionalArgs.length < 4) {
    console.error("Error: Missing required parameters");
    printUsage();
    process.exit(1);
  }

  const [tsconfigPath, methodName, oldParam, newParam] = positionalArgs;

  const classFilter = parseOption(args, "--class=");
  const interfaceFilter = parseOption(args, "--interface=");
  const paramTypeFilter = parseOption(args, "--param-type=");

  if (oldParam === newParam) {
    console.error("Error: old-param and new-param are the same");
    process.exit(1);
  }

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
      // Intersect with existing filter
      targetClasses = new Set([...targetClasses].filter((c) => interfaceClasses.has(c)));
    } else {
      targetClasses = interfaceClasses;
    }
    console.log(`Found ${targetClasses.size} class(es) implementing '${interfaceFilter}'`);
  }

  let renamedCount = 0;
  const modifiedFiles = new Set<string>();
  const matchAll = methodName === "*";

  // Also rename in the interface/class definition if --interface or --class filter is specified
  if (interfaceFilter) {
    for (const sourceFile of project.getSourceFiles()) {
      const iface = sourceFile.getInterface(interfaceFilter);
      if (iface) {
        const methods = matchAll ? iface.getMethods() : [iface.getMethod(methodName)].filter(Boolean);
        for (const method of methods) {
          if (!method) continue;
          if (renameParameterInFunction(method, oldParam, newParam, paramTypeFilter)) {
            console.log(`  Renamed '${oldParam}' -> '${newParam}' in ${interfaceFilter}.${method.getName()}() [interface]`);
            renamedCount++;
            modifiedFiles.add(sourceFile.getFilePath());
          }
        }
      }
    }
  }

  if (classFilter) {
    for (const sourceFile of project.getSourceFiles()) {
      const cls = sourceFile.getClass(classFilter);
      if (cls && !targetClasses?.has(cls)) {
        // The base class might be abstract and not in the implementations list
        const methods = matchAll ? cls.getMethods() : [cls.getMethod(methodName)].filter(Boolean);
        for (const method of methods) {
          if (!method) continue;
          if (renameParameterInFunction(method, oldParam, newParam, paramTypeFilter)) {
            console.log(`  Renamed '${oldParam}' -> '${newParam}' in ${classFilter}.${method.getName()}() [base class]`);
            renamedCount++;
            modifiedFiles.add(sourceFile.getFilePath());
          }
        }
      }
    }
  }

  // Process class methods
  for (const sourceFile of project.getSourceFiles()) {
    for (const cls of sourceFile.getClasses()) {
      // Skip if we have a class filter and this class isn't in it
      if (targetClasses && !targetClasses.has(cls)) continue;

      const methods = matchAll ? cls.getMethods() : [cls.getMethod(methodName)].filter(Boolean);

      for (const method of methods) {
        if (!method) continue;
        if (renameParameterInFunction(method, oldParam, newParam, paramTypeFilter)) {
          const className = cls.getName() || "<anonymous>";
          const methodNameStr = method.getName();
          console.log(`  Renamed '${oldParam}' -> '${newParam}' in ${className}.${methodNameStr}()`);
          renamedCount++;
          modifiedFiles.add(sourceFile.getFilePath());
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
        if (renameParameterInFunction(func, oldParam, newParam, paramTypeFilter)) {
          const funcName = func.getName() || "<anonymous>";
          console.log(`  Renamed '${oldParam}' -> '${newParam}' in ${funcName}()`);
          renamedCount++;
          modifiedFiles.add(sourceFile.getFilePath());
        }
      }
    }
  }

  if (renamedCount === 0) {
    console.log(`No parameters found matching criteria:`);
    console.log(`  Method: ${methodName}`);
    console.log(`  Parameter: ${oldParam}`);
    if (classFilter) console.log(`  Class filter: ${classFilter}`);
    if (interfaceFilter) console.log(`  Interface filter: ${interfaceFilter}`);
    if (paramTypeFilter) console.log(`  Type filter: ${paramTypeFilter}`);
    process.exit(0);
  }

  project.saveSync();

  console.log(`\nSummary:`);
  console.log(`  Parameters renamed: ${renamedCount}`);
  console.log(`  Files modified: ${modifiedFiles.size}`);
}

main();
