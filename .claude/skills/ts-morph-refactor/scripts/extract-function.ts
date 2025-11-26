#!/usr/bin/env npx tsx
/**
 * Extract code from a function into a new function in the same file.
 *
 * Usage:
 *   npx tsx extract-function.ts <tsconfig> <file> <source-function> <new-function> <start-line> <end-line> [params...]
 *
 * Parameters:
 *   tsconfig        - Path to tsconfig.json
 *   file            - Source file path
 *   source-function - Name of function containing code to extract
 *   new-function    - Name for the new extracted function
 *   start-line      - Start line number of code to extract (1-indexed)
 *   end-line        - End line number of code to extract (1-indexed)
 *   params          - Optional parameters for extracted function as name:type pairs
 *
 * Example:
 *   npx tsx extract-function.ts ./tsconfig.json src/handlers.ts processRequest validateInput 15 25 data:RequestData config:Config
 */

import { Project, SyntaxKind, VariableDeclarationKind } from "ts-morph";

interface Parameter {
  name: string;
  type: string;
}

function printUsage(): void {
  console.error(`
Usage: npx tsx extract-function.ts <tsconfig> <file> <source-function> <new-function> <start-line> <end-line> [params...]

Parameters:
  tsconfig        - Path to tsconfig.json
  file            - Source file path
  source-function - Name of function containing code to extract
  new-function    - Name for the new extracted function
  start-line      - Start line number of code to extract (1-indexed)
  end-line        - End line number of code to extract (1-indexed)
  params          - Optional parameters as name:type pairs (e.g., data:RequestData)

Example:
  npx tsx extract-function.ts ./tsconfig.json src/handlers.ts processRequest validateInput 15 25 data:RequestData config:Config
`);
}

function parseParameters(paramArgs: string[]): Parameter[] {
  const params: Parameter[] = [];
  for (const arg of paramArgs) {
    const colonIndex = arg.indexOf(":");
    if (colonIndex === -1) {
      console.error(`Error: Invalid parameter format '${arg}'. Expected 'name:type'`);
      process.exit(1);
    }
    params.push({
      name: arg.substring(0, colonIndex),
      type: arg.substring(colonIndex + 1),
    });
  }
  return params;
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length < 6) {
    console.error("Error: Missing required parameters");
    printUsage();
    process.exit(1);
  }

  const [tsconfigPath, filePath, sourceFunctionName, newFunctionName, startLineStr, endLineStr, ...paramArgs] = args;

  const startLine = parseInt(startLineStr, 10);
  const endLine = parseInt(endLineStr, 10);

  if (isNaN(startLine) || isNaN(endLine)) {
    console.error("Error: start-line and end-line must be numbers");
    process.exit(1);
  }

  if (startLine > endLine) {
    console.error("Error: start-line must be less than or equal to end-line");
    process.exit(1);
  }

  if (startLine < 1) {
    console.error("Error: start-line must be at least 1");
    process.exit(1);
  }

  const parameters = parseParameters(paramArgs);

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
  });

  const sourceFile = project.getSourceFile(filePath);
  if (!sourceFile) {
    console.error(`Error: Source file not found: ${filePath}`);
    process.exit(1);
  }

  // Find the source function
  const sourceFunction = sourceFile.getFunction(sourceFunctionName);
  if (!sourceFunction) {
    const available = sourceFile.getFunctions().map((f) => f.getName() || "<anonymous>");
    console.error(`Error: Function '${sourceFunctionName}' not found in ${filePath}`);
    if (available.length > 0) {
      console.error(`Available functions: ${available.join(", ")}`);
    }
    process.exit(1);
  }

  // Check if new function name already exists
  if (sourceFile.getFunction(newFunctionName)) {
    console.error(`Error: Function '${newFunctionName}' already exists in ${filePath}`);
    process.exit(1);
  }

  // Get the function body
  const body = sourceFunction.getBody();
  if (!body || body.getKind() !== SyntaxKind.Block) {
    console.error("Error: Source function must have a block body");
    process.exit(1);
  }

  // Get statements within the line range
  const statements = body.getStatements();
  const statementsToExtract = statements.filter((stmt) => {
    const stmtStartLine = stmt.getStartLineNumber();
    const stmtEndLine = stmt.getEndLineNumber();
    return stmtStartLine >= startLine && stmtEndLine <= endLine;
  });

  if (statementsToExtract.length === 0) {
    console.error(`Error: No statements found between lines ${startLine} and ${endLine}`);
    console.error("Available statement ranges:");
    for (const stmt of statements) {
      console.error(`  Lines ${stmt.getStartLineNumber()}-${stmt.getEndLineNumber()}: ${stmt.getKindName()}`);
    }
    process.exit(1);
  }

  // Extract the code text
  const extractedCode = statementsToExtract.map((s) => s.getText()).join("\n");

  // Determine if we need to return something (check for return statements or last expression)
  const lastStatement = statementsToExtract[statementsToExtract.length - 1];
  const hasReturn = statementsToExtract.some(
    (s) => s.getKind() === SyntaxKind.ReturnStatement
  );

  // Try to infer return type from the extracted code
  let returnType = "void";
  if (hasReturn) {
    const returnStmt = statementsToExtract.find((s) => s.getKind() === SyntaxKind.ReturnStatement);
    if (returnStmt) {
      const expr = returnStmt.asKind(SyntaxKind.ReturnStatement)?.getExpression();
      if (expr) {
        returnType = expr.getType().getText();
      }
    }
  }

  // Create the new function before the source function
  const newFunction = sourceFile.insertFunction(sourceFunction.getChildIndex(), {
    name: newFunctionName,
    parameters: parameters.map((p) => ({ name: p.name, type: p.type })),
    returnType: returnType,
    statements: extractedCode,
  });

  // Build the function call
  const paramNames = parameters.map((p) => p.name).join(", ");
  const functionCall = `${newFunctionName}(${paramNames})`;

  // Replace extracted statements with function call
  const firstStatement = statementsToExtract[0];
  const firstIndex = statements.indexOf(firstStatement);

  // Remove all extracted statements except the first
  for (let i = statementsToExtract.length - 1; i > 0; i--) {
    statementsToExtract[i].remove();
  }

  // Replace first statement with function call
  if (hasReturn) {
    firstStatement.replaceWithText(`return ${functionCall};`);
  } else if (returnType !== "void") {
    // If there's a meaningful return but no return statement, assign to const
    firstStatement.replaceWithText(`const result = ${functionCall};`);
  } else {
    firstStatement.replaceWithText(`${functionCall};`);
  }

  project.saveSync();

  console.log(`Extracted function '${newFunctionName}' from '${sourceFunctionName}'`);
  console.log(`Extracted ${statementsToExtract.length} statement(s) from lines ${startLine}-${endLine}`);
  console.log(`Parameters: ${parameters.length > 0 ? parameters.map((p) => `${p.name}: ${p.type}`).join(", ") : "none"}`);
  console.log(`Return type: ${returnType}`);
}

main();
