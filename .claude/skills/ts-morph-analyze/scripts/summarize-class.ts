#!/usr/bin/env npx tsx
/**
 * Extract the API signature of a class or interface without implementation details.
 *
 * Usage:
 *   npx tsx summarize-class.ts <tsconfig> <file> <name> [--private] [--jsdoc]
 *
 * Parameters:
 *   tsconfig  - Path to tsconfig.json
 *   file      - Source file containing the class/interface
 *   name      - Class or interface name
 *   --private - Include private and protected members
 *   --jsdoc   - Include JSDoc comments
 */

import { Project, ClassDeclaration, InterfaceDeclaration, SyntaxKind, JSDoc } from "ts-morph";

function printUsage(): void {
  console.error(`
Usage: npx tsx summarize-class.ts <tsconfig> <file> <name> [--private] [--jsdoc]

Parameters:
  tsconfig  - Path to tsconfig.json
  file      - Source file containing the class/interface
  name      - Class or interface name
  --private - Include private and protected members
  --jsdoc   - Include JSDoc comments

Example:
  npx tsx summarize-class.ts ./tsconfig.json src/nodes/types.ts ExecutableNode
`);
}

function getJsDocComment(node: { getJsDocs(): JSDoc[] }): string {
  const jsDocs = node.getJsDocs();
  if (jsDocs.length === 0) return "";

  const doc = jsDocs[jsDocs.length - 1];
  return doc.getFullText().trim() + "\n";
}

function getModifiers(node: {
  hasModifier(kind: SyntaxKind): boolean;
  isAbstract?(): boolean;
  isStatic?(): boolean;
  isReadonly?(): boolean;
}): string[] {
  const modifiers: string[] = [];

  if (node.isAbstract?.()) modifiers.push("abstract");
  if (node.isStatic?.()) modifiers.push("static");
  if (node.isReadonly?.()) modifiers.push("readonly");
  if (node.hasModifier(SyntaxKind.AsyncKeyword)) modifiers.push("async");
  if (node.hasModifier(SyntaxKind.PrivateKeyword)) modifiers.push("private");
  if (node.hasModifier(SyntaxKind.ProtectedKeyword)) modifiers.push("protected");
  if (node.hasModifier(SyntaxKind.PublicKeyword)) modifiers.push("public");

  return modifiers;
}

function isPrivateOrProtected(node: { hasModifier(kind: SyntaxKind): boolean }): boolean {
  return (
    node.hasModifier(SyntaxKind.PrivateKeyword) ||
    node.hasModifier(SyntaxKind.ProtectedKeyword)
  );
}

function summarizeClass(
  cls: ClassDeclaration,
  includePrivate: boolean,
  includeJsdoc: boolean
): string {
  const lines: string[] = [];
  const name = cls.getName() || "<anonymous>";
  const isAbstract = cls.isAbstract();
  const isExported = cls.isExported();

  // Class declaration line
  const extendsClause = cls.getExtends()?.getText();
  const implementsClauses = cls.getImplements().map((i) => i.getText());

  let declaration = "";
  if (isExported) declaration += "export ";
  if (isAbstract) declaration += "abstract ";
  declaration += `class ${name}`;
  if (extendsClause) declaration += ` extends ${extendsClause}`;
  if (implementsClauses.length > 0) declaration += ` implements ${implementsClauses.join(", ")}`;
  declaration += " {";

  if (includeJsdoc) {
    const jsDoc = getJsDocComment(cls);
    if (jsDoc) lines.push(jsDoc);
  }
  lines.push(declaration);

  // Properties
  for (const prop of cls.getProperties()) {
    if (!includePrivate && isPrivateOrProtected(prop)) continue;

    const modifiers = getModifiers(prop);
    const propName = prop.getName();
    const optional = prop.hasQuestionToken() ? "?" : "";
    const type = prop.getType().getText(prop);

    if (includeJsdoc) {
      const jsDoc = getJsDocComment(prop);
      if (jsDoc) lines.push("  " + jsDoc.split("\n").join("\n  "));
    }

    const modStr = modifiers.length > 0 ? modifiers.join(" ") + " " : "";
    lines.push(`  ${modStr}${propName}${optional}: ${type};`);
  }

  // Constructor
  const constructors = cls.getConstructors();
  if (constructors.length > 0) {
    const ctor = constructors[0];
    const params = ctor.getParameters().map((p) => {
      const paramModifiers: string[] = [];
      if (p.isReadonly()) paramModifiers.push("readonly");
      if (p.hasModifier(SyntaxKind.PrivateKeyword)) paramModifiers.push("private");
      if (p.hasModifier(SyntaxKind.ProtectedKeyword)) paramModifiers.push("protected");
      if (p.hasModifier(SyntaxKind.PublicKeyword)) paramModifiers.push("public");

      const modStr = paramModifiers.length > 0 ? paramModifiers.join(" ") + " " : "";
      const optional = p.isOptional() ? "?" : "";
      return `${modStr}${p.getName()}${optional}: ${p.getType().getText(p)}`;
    });

    if (includeJsdoc) {
      const jsDoc = getJsDocComment(ctor);
      if (jsDoc) lines.push("  " + jsDoc.split("\n").join("\n  "));
    }

    lines.push(`  constructor(${params.join(", ")});`);
  }

  // Methods
  for (const method of cls.getMethods()) {
    if (!includePrivate && isPrivateOrProtected(method)) continue;

    const modifiers = getModifiers(method);
    const methodName = method.getName();
    const params = method.getParameters().map((p) => {
      const optional = p.isOptional() ? "?" : "";
      return `${p.getName()}${optional}: ${p.getType().getText(p)}`;
    });
    const returnType = method.getReturnType().getText(method);

    if (includeJsdoc) {
      const jsDoc = getJsDocComment(method);
      if (jsDoc) lines.push("  " + jsDoc.split("\n").join("\n  "));
    }

    const modStr = modifiers.length > 0 ? modifiers.join(" ") + " " : "";
    lines.push(`  ${modStr}${methodName}(${params.join(", ")}): ${returnType};`);
  }

  lines.push("}");
  return lines.join("\n");
}

function summarizeInterface(
  iface: InterfaceDeclaration,
  includeJsdoc: boolean
): string {
  const lines: string[] = [];
  const name = iface.getName();
  const isExported = iface.isExported();

  // Interface declaration line
  const extendsClauses = iface.getExtends().map((e) => e.getText());

  let declaration = "";
  if (isExported) declaration += "export ";
  declaration += `interface ${name}`;
  if (extendsClauses.length > 0) declaration += ` extends ${extendsClauses.join(", ")}`;
  declaration += " {";

  if (includeJsdoc) {
    const jsDoc = getJsDocComment(iface);
    if (jsDoc) lines.push(jsDoc);
  }
  lines.push(declaration);

  // Properties
  for (const prop of iface.getProperties()) {
    const readonly = prop.isReadonly() ? "readonly " : "";
    const propName = prop.getName();
    const optional = prop.hasQuestionToken() ? "?" : "";
    const type = prop.getType().getText(prop);

    if (includeJsdoc) {
      const jsDoc = getJsDocComment(prop);
      if (jsDoc) lines.push("  " + jsDoc.split("\n").join("\n  "));
    }

    lines.push(`  ${readonly}${propName}${optional}: ${type};`);
  }

  // Methods
  for (const method of iface.getMethods()) {
    const methodName = method.getName();
    const params = method.getParameters().map((p) => {
      const optional = p.isOptional() ? "?" : "";
      return `${p.getName()}${optional}: ${p.getType().getText(p)}`;
    });
    const returnType = method.getReturnType().getText(method);

    if (includeJsdoc) {
      const jsDoc = getJsDocComment(method);
      if (jsDoc) lines.push("  " + jsDoc.split("\n").join("\n  "));
    }

    lines.push(`  ${methodName}(${params.join(", ")}): ${returnType};`);
  }

  lines.push("}");
  return lines.join("\n");
}

function main(): void {
  const args = process.argv.slice(2);

  const includePrivate = args.includes("--private");
  const includeJsdoc = args.includes("--jsdoc");
  const positionalArgs = args.filter((a) => !a.startsWith("--"));

  if (positionalArgs.length < 3) {
    console.error("Error: Missing required parameters");
    printUsage();
    process.exit(1);
  }

  const [tsconfigPath, filePath, name] = positionalArgs;

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
  });

  const sourceFile = project.addSourceFileAtPath(filePath);

  // Try to find as class first, then interface
  const cls = sourceFile.getClass(name);
  if (cls) {
    console.log(summarizeClass(cls, includePrivate, includeJsdoc));
    return;
  }

  const iface = sourceFile.getInterface(name);
  if (iface) {
    console.log(summarizeInterface(iface, includeJsdoc));
    return;
  }

  // Not found
  console.error(`Error: Class or interface '${name}' not found in ${filePath}`);

  const classes = sourceFile.getClasses().map((c) => c.getName()).filter(Boolean);
  const interfaces = sourceFile.getInterfaces().map((i) => i.getName());

  if (classes.length > 0) {
    console.error(`Available classes: ${classes.join(", ")}`);
  }
  if (interfaces.length > 0) {
    console.error(`Available interfaces: ${interfaces.join(", ")}`);
  }

  process.exit(1);
}

main();
