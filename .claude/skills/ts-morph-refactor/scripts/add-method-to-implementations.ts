#!/usr/bin/env npx tsx
/**
 * Add a method stub to all classes that implement or extend a given interface/class.
 *
 * Usage:
 *   npx tsx add-method-to-implementations.ts <tsconfig> <base-type> <method-name> <return-type> [params...] [--abstract] [--async]
 *
 * Parameters:
 *   tsconfig    - Path to tsconfig.json
 *   base-type   - Interface or class name that implementations extend/implement
 *   method-name - Name of the method to add
 *   return-type - Return type of the method
 *   params      - Optional parameters as name:type pairs
 *   --abstract  - Add as abstract method (for abstract classes only)
 *   --async     - Make the method async
 *
 * Example:
 *   npx tsx add-method-to-implementations.ts ./tsconfig.json ExecutableNode cleanup void
 *   npx tsx add-method-to-implementations.ts ./tsconfig.json Handler handle "Promise<Response>" request:Request context:Context --async
 */

import { Project, ClassDeclaration, SyntaxKind, Scope } from "ts-morph";

interface Parameter {
  name: string;
  type: string;
}

function printUsage(): void {
  console.error(`
Usage: npx tsx add-method-to-implementations.ts <tsconfig> <base-type> <method-name> <return-type> [params...] [--abstract] [--async]

Parameters:
  tsconfig    - Path to tsconfig.json
  base-type   - Interface or class name that implementations extend/implement
  method-name - Name of the method to add
  return-type - Return type of the method
  params      - Optional parameters as name:type pairs (e.g., request:Request)
  --abstract  - Add as abstract method (for abstract classes only)
  --async     - Make the method async

Examples:
  npx tsx add-method-to-implementations.ts ./tsconfig.json ExecutableNode cleanup void
  npx tsx add-method-to-implementations.ts ./tsconfig.json Handler handle "Promise<Response>" request:Request context:Context --async
`);
}

function parseParameters(paramArgs: string[]): Parameter[] {
  const params: Parameter[] = [];
  for (const arg of paramArgs) {
    if (arg.startsWith("--")) continue;
    const colonIndex = arg.indexOf(":");
    if (colonIndex === -1) continue; // Skip non-parameter args
    params.push({
      name: arg.substring(0, colonIndex),
      type: arg.substring(colonIndex + 1),
    });
  }
  return params;
}

function findAllImplementations(project: Project, baseTypeName: string): ClassDeclaration[] {
  const implementations: ClassDeclaration[] = [];
  const visited = new Set<string>();

  // Find the base type (interface or class)
  let baseInterface;
  let baseClass;

  for (const sourceFile of project.getSourceFiles()) {
    baseInterface = baseInterface || sourceFile.getInterface(baseTypeName);
    baseClass = baseClass || sourceFile.getClass(baseTypeName);
  }

  if (!baseInterface && !baseClass) {
    return implementations;
  }

  // Recursively find all classes that implement/extend
  function collectImplementations(typeName: string): void {
    for (const sourceFile of project.getSourceFiles()) {
      for (const cls of sourceFile.getClasses()) {
        const className = cls.getName();
        if (!className || visited.has(className)) continue;

        // Check if class implements the interface
        const implementsTarget = cls.getImplements().some((impl) => {
          const implText = impl.getText();
          // Handle generic types like "Interface<T>"
          const baseName = implText.split("<")[0].trim();
          return baseName === typeName;
        });

        // Check if class extends the base class
        const extendsTarget = cls.getExtends()?.getText().split("<")[0].trim() === typeName;

        if (implementsTarget || extendsTarget) {
          visited.add(className);
          implementations.push(cls);
          // Recursively find classes that extend this class
          collectImplementations(className);
        }
      }
    }
  }

  collectImplementations(baseTypeName);
  return implementations;
}

function main(): void {
  const args = process.argv.slice(2);

  // Parse flags
  const isAbstract = args.includes("--abstract");
  const isAsync = args.includes("--async");

  // Remove flags from args
  const positionalArgs = args.filter((arg) => !arg.startsWith("--"));

  if (positionalArgs.length < 4) {
    console.error("Error: Missing required parameters");
    printUsage();
    process.exit(1);
  }

  const [tsconfigPath, baseTypeName, methodName, returnType, ...paramArgs] = positionalArgs;
  const parameters = parseParameters(paramArgs);

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
  });

  // Find all implementations
  const implementations = findAllImplementations(project, baseTypeName);

  if (implementations.length === 0) {
    console.error(`Error: No classes found implementing or extending '${baseTypeName}'`);

    // List available interfaces and classes
    const interfaces: string[] = [];
    const classes: string[] = [];
    for (const sf of project.getSourceFiles()) {
      interfaces.push(...sf.getInterfaces().map((i) => i.getName()));
      classes.push(...sf.getClasses().map((c) => c.getName()).filter((n): n is string => !!n));
    }

    if (interfaces.length > 0) {
      console.error(`\nAvailable interfaces (first 20): ${interfaces.slice(0, 20).join(", ")}`);
    }
    if (classes.length > 0) {
      console.error(`\nAvailable classes (first 20): ${classes.slice(0, 20).join(", ")}`);
    }
    process.exit(1);
  }

  console.log(`Found ${implementations.length} class(es) implementing/extending '${baseTypeName}'`);

  let addedCount = 0;
  let skippedCount = 0;
  const modifiedFiles: string[] = [];

  for (const cls of implementations) {
    const className = cls.getName() || "<anonymous>";
    const filePath = cls.getSourceFile().getFilePath();

    // Check if method already exists
    const existingMethod = cls.getMethod(methodName);
    if (existingMethod) {
      console.log(`  Skipped ${className}: method '${methodName}' already exists`);
      skippedCount++;
      continue;
    }

    // Check if class is abstract (for --abstract flag)
    const classIsAbstract = cls.isAbstract();

    if (isAbstract && !classIsAbstract) {
      console.log(`  Skipped ${className}: --abstract flag used but class is not abstract`);
      skippedCount++;
      continue;
    }

    // Add the method
    const method = cls.addMethod({
      name: methodName,
      parameters: parameters.map((p) => ({ name: p.name, type: p.type })),
      returnType: returnType,
      isAbstract: isAbstract && classIsAbstract,
      isAsync: isAsync,
      scope: Scope.Public,
    });

    // Add placeholder body for non-abstract methods
    if (!isAbstract || !classIsAbstract) {
      // Determine appropriate placeholder based on return type
      let placeholder: string;
      if (returnType === "void") {
        placeholder = "// TODO: Implement this method\nthrow new Error(\"Not implemented\");";
      } else if (returnType.startsWith("Promise<")) {
        const innerType = returnType.slice(8, -1);
        if (innerType === "void") {
          placeholder = "// TODO: Implement this method\nthrow new Error(\"Not implemented\");";
        } else {
          placeholder = "// TODO: Implement this method\nthrow new Error(\"Not implemented\");";
        }
      } else {
        placeholder = "// TODO: Implement this method\nthrow new Error(\"Not implemented\");";
      }
      method.setBodyText(placeholder);
    }

    addedCount++;
    if (!modifiedFiles.includes(filePath)) {
      modifiedFiles.push(filePath);
    }
    console.log(`  Added ${methodName}() to ${className} in ${filePath}`);
  }

  project.saveSync();

  console.log(`\nSummary:`);
  console.log(`  Methods added: ${addedCount}`);
  console.log(`  Skipped (already exists): ${skippedCount}`);
  console.log(`  Files modified: ${modifiedFiles.length}`);

  if (addedCount > 0) {
    console.log(`\nMethod signature added:`);
    const asyncKeyword = isAsync ? "async " : "";
    const abstractKeyword = isAbstract ? "abstract " : "";
    const paramStr = parameters.map((p) => `${p.name}: ${p.type}`).join(", ");
    console.log(`  ${abstractKeyword}${asyncKeyword}${methodName}(${paramStr}): ${returnType}`);
  }
}

main();
