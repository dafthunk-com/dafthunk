#!/usr/bin/env npx tsx
/**
 * Add or modify a property on an interface.
 *
 * Usage:
 *   npx tsx add-interface-property.ts <tsconfig> <file> <interface> <property> <type> [--optional] [--readonly]
 *
 * Parameters:
 *   tsconfig   - Path to tsconfig.json
 *   file       - File containing the interface
 *   interface  - Interface name
 *   property   - Property name to add/modify
 *   type       - TypeScript type for the property
 *   --optional - Make property optional (?)
 *   --readonly - Make property readonly
 *
 * Example:
 *   npx tsx add-interface-property.ts ./tsconfig.json src/types.ts UserConfig theme "\"light\" | \"dark\"" --optional
 */

import { Project } from "ts-morph";

function printUsage(): void {
  console.error(`
Usage: npx tsx add-interface-property.ts <tsconfig> <file> <interface> <property> <type> [--optional] [--readonly]

Parameters:
  tsconfig   - Path to tsconfig.json
  file       - File containing the interface
  interface  - Interface name
  property   - Property name to add/modify
  type       - TypeScript type for the property (quote complex types)
  --optional - Make property optional (?)
  --readonly - Make property readonly

Examples:
  npx tsx add-interface-property.ts ./tsconfig.json src/types.ts User email string
  npx tsx add-interface-property.ts ./tsconfig.json src/types.ts Config debug boolean --optional
  npx tsx add-interface-property.ts ./tsconfig.json src/types.ts UserConfig theme "\"light\" | \"dark\"" --optional --readonly
`);
}

function main(): void {
  const args = process.argv.slice(2);

  // Parse flags
  const isOptional = args.includes("--optional");
  const isReadonly = args.includes("--readonly");

  // Remove flags from args
  const positionalArgs = args.filter((arg) => !arg.startsWith("--"));

  if (positionalArgs.length < 5) {
    console.error("Error: Missing required parameters");
    printUsage();
    process.exit(1);
  }

  const [tsconfigPath, filePath, interfaceName, propertyName, propertyType] = positionalArgs;

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
  });

  const sourceFile = project.getSourceFile(filePath);
  if (!sourceFile) {
    console.error(`Error: Source file not found: ${filePath}`);
    process.exit(1);
  }

  const iface = sourceFile.getInterface(interfaceName);
  if (!iface) {
    const available = sourceFile.getInterfaces().map((i) => i.getName());
    console.error(`Error: Interface '${interfaceName}' not found in ${filePath}`);
    if (available.length > 0) {
      console.error(`Available interfaces: ${available.join(", ")}`);
    } else {
      console.error("No interfaces found in file");
    }
    process.exit(1);
  }

  // Check if property already exists
  const existingProperty = iface.getProperty(propertyName);

  if (existingProperty) {
    // Update existing property
    const oldType = existingProperty.getType().getText();
    const wasOptional = existingProperty.hasQuestionToken();
    const wasReadonly = existingProperty.isReadonly();

    existingProperty.setType(propertyType);

    if (isOptional !== wasOptional) {
      existingProperty.setHasQuestionToken(isOptional);
    }

    if (isReadonly !== wasReadonly) {
      existingProperty.setIsReadonly(isReadonly);
    }

    project.saveSync();

    console.log(`Updated property '${propertyName}' on interface '${interfaceName}'`);
    console.log(`  Type: ${oldType} -> ${propertyType}`);
    if (isOptional !== wasOptional) {
      console.log(`  Optional: ${wasOptional} -> ${isOptional}`);
    }
    if (isReadonly !== wasReadonly) {
      console.log(`  Readonly: ${wasReadonly} -> ${isReadonly}`);
    }
  } else {
    // Add new property
    iface.addProperty({
      name: propertyName,
      type: propertyType,
      hasQuestionToken: isOptional,
      isReadonly: isReadonly,
    });

    project.saveSync();

    const modifiers: string[] = [];
    if (isReadonly) modifiers.push("readonly");
    if (isOptional) modifiers.push("optional");

    console.log(`Added property '${propertyName}' to interface '${interfaceName}'`);
    console.log(`  Type: ${propertyType}`);
    if (modifiers.length > 0) {
      console.log(`  Modifiers: ${modifiers.join(", ")}`);
    }
  }

  console.log(`\nInterface '${interfaceName}' now has ${iface.getProperties().length} properties:`);
  for (const prop of iface.getProperties()) {
    const optional = prop.hasQuestionToken() ? "?" : "";
    const readonly = prop.isReadonly() ? "readonly " : "";
    console.log(`  ${readonly}${prop.getName()}${optional}: ${prop.getType().getText()}`);
  }
}

main();
