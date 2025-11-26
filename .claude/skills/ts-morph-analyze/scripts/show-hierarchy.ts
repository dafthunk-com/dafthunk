#!/usr/bin/env npx tsx
/**
 * Display the inheritance hierarchy for a class.
 *
 * Usage:
 *   npx tsx show-hierarchy.ts <tsconfig> <file> <class-name> [--descendants] [--depth=N]
 *
 * Parameters:
 *   tsconfig     - Path to tsconfig.json
 *   file         - Source file containing the class
 *   class-name   - Name of the class to analyze
 *   --descendants - Also show classes that extend this class
 *   --depth=N    - Limit hierarchy depth (default: unlimited)
 */

import { Project, ClassDeclaration, SourceFile } from "ts-morph";

function printUsage(): void {
  console.error(`
Usage: npx tsx show-hierarchy.ts <tsconfig> <file> <class-name> [--descendants] [--depth=N]

Parameters:
  tsconfig     - Path to tsconfig.json
  file         - Source file containing the class
  class-name   - Name of the class to analyze
  --descendants - Also show classes that extend this class
  --depth=N    - Limit hierarchy depth (default: unlimited)

Example:
  npx tsx show-hierarchy.ts ./tsconfig.json src/nodes/text-node.ts TextNode --descendants
`);
}

interface HierarchyNode {
  name: string;
  kind: "class" | "interface";
  file?: string;
  children: HierarchyNode[];
}

function getAncestors(cls: ClassDeclaration, depth: number, maxDepth: number): HierarchyNode[] {
  if (maxDepth > 0 && depth >= maxDepth) return [];

  const ancestors: HierarchyNode[] = [];

  // Get extended class
  const extendsExpr = cls.getExtends();
  if (extendsExpr) {
    const extendedName = extendsExpr.getText().split("<")[0].trim();
    const extendedType = extendsExpr.getType();
    const symbol = extendedType.getSymbol();

    const node: HierarchyNode = {
      name: extendedName,
      kind: "class",
      children: [],
    };

    // Try to find the actual class declaration
    if (symbol) {
      const declarations = symbol.getDeclarations();
      for (const decl of declarations) {
        if (decl.getKind() === cls.getKind()) {
          const parentClass = decl as ClassDeclaration;
          node.file = parentClass.getSourceFile().getFilePath();
          node.children = getAncestors(parentClass, depth + 1, maxDepth);
          break;
        }
      }
    }

    ancestors.push(node);
  }

  // Get implemented interfaces
  for (const impl of cls.getImplements()) {
    const implName = impl.getText().split("<")[0].trim();
    const node: HierarchyNode = {
      name: implName,
      kind: "interface",
      children: [],
    };

    // Try to get interface extends
    const implType = impl.getType();
    const symbol = implType.getSymbol();
    if (symbol) {
      const declarations = symbol.getDeclarations();
      for (const decl of declarations) {
        const iface = decl.asKind(decl.getKind());
        if (iface && "getExtends" in iface) {
          const ifaceDecl = iface as { getExtends(): { getText(): string }[] };
          for (const ext of ifaceDecl.getExtends()) {
            node.children.push({
              name: ext.getText().split("<")[0].trim(),
              kind: "interface",
              children: [],
            });
          }
        }
      }
    }

    ancestors.push(node);
  }

  return ancestors;
}

function findDescendants(
  project: Project,
  className: string,
  depth: number,
  maxDepth: number
): HierarchyNode[] {
  if (maxDepth > 0 && depth >= maxDepth) return [];

  const descendants: HierarchyNode[] = [];

  for (const sourceFile of project.getSourceFiles()) {
    for (const cls of sourceFile.getClasses()) {
      const extendsExpr = cls.getExtends();
      if (extendsExpr) {
        const extendedName = extendsExpr.getText().split("<")[0].trim();
        if (extendedName === className) {
          const childName = cls.getName();
          if (childName) {
            descendants.push({
              name: childName,
              kind: "class",
              file: sourceFile.getFilePath(),
              children: findDescendants(project, childName, depth + 1, maxDepth),
            });
          }
        }
      }
    }
  }

  return descendants.sort((a, b) => a.name.localeCompare(b.name));
}

function printTree(nodes: HierarchyNode[], prefix: string, isLast: boolean[]): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLastNode = i === nodes.length - 1;

    // Build prefix
    let linePrefix = "";
    for (let j = 0; j < isLast.length; j++) {
      linePrefix += isLast[j] ? "    " : "│   ";
    }
    linePrefix += isLastNode ? "└── " : "├── ";

    // Print node
    const kindLabel = node.kind === "interface" ? "[interface]" : "";
    const filePath = node.file ? ` (${node.file})` : "";
    console.log(`${linePrefix}${node.name} ${kindLabel}${filePath}`.trim());

    // Print children
    if (node.children.length > 0) {
      printTree(node.children, prefix, [...isLast, isLastNode]);
    }
  }
}

function main(): void {
  const args = process.argv.slice(2);

  const showDescendants = args.includes("--descendants");
  const depthArg = args.find((a) => a.startsWith("--depth="));
  const maxDepth = depthArg ? parseInt(depthArg.split("=")[1], 10) : 0;

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

  // Add all source files for descendant search
  project.addSourceFilesAtPaths("**/*.ts");

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

  // Print class name
  console.log(className);

  // Get ancestors (extends/implements)
  const ancestors = getAncestors(cls, 0, maxDepth);

  if (ancestors.length > 0) {
    const extendsNodes = ancestors.filter((a) => a.kind === "class");
    const implementsNodes = ancestors.filter((a) => a.kind === "interface");

    if (extendsNodes.length > 0) {
      console.log("├── extends:");
      printTree(extendsNodes, "", [false]);
    }

    if (implementsNodes.length > 0) {
      const prefix = showDescendants || extendsNodes.length > 0 ? "├── " : "└── ";
      console.log(`${prefix}implements:`);
      printTree(implementsNodes, "", [!showDescendants]);
    }
  }

  // Get descendants if requested
  if (showDescendants) {
    const descendants = findDescendants(project, className, 0, maxDepth);

    if (descendants.length > 0) {
      console.log("└── descendants:");
      printTree(descendants, "", [true]);
    } else {
      console.log("└── descendants: (none)");
    }
  }
}

main();
