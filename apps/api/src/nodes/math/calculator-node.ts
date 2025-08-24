import { getQuickJSWASMModule, QuickJSContext } from "@cf-wasm/quickjs";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Calculator node implementation
 */
export class CalculatorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "calculator",
    name: "Calculator",
    type: "calculator",
    description:
      "Evaluates mathematical expressions with support for arithmetic, functions, and constants.",
    tags: ["Math"],
    icon: "calculator",
    documentation: `Evaluates mathematical expressions with comprehensive support for arithmetic operations, mathematical functions, trigonometric functions, constants, and complex formulas.

## Supported Operations

### Basic Arithmetic
- Addition: \`+\`
- Subtraction: \`-\`
- Multiplication: \`*\`
- Division: \`/\`
- Exponentiation: \`^\` (e.g., \`2^3 = 8\`)
- Modulo: \`%\` (e.g., \`17 % 5 = 2\`)

### Bitwise Operators
- Bitwise AND: \`&\`
- Bitwise OR: \`|\`
- Bitwise NOT: \`~\`
- Left shift: \`<\`
- Right shift: \`>\`

### Mathematical Functions
- Square root: \`sqrt(x)\`
- Cube root: \`cbrt(x)\`
- Power: \`pow(x, y)\`
- Exponential: \`exp(x)\`
- Natural logarithm: \`log(x)\`
- Base-10 logarithm: \`log10(x)\`
- Absolute value: \`abs(x)\`
- Floor: \`floor(x)\`
- Ceiling: \`ceil(x)\`
- Round: \`round(x)\`
- Minimum: \`min(x, y)\`
- Maximum: \`max(x, y)\`
- Sign: \`sign(x)\`
- Truncate: \`trunc(x)\`
- Hypotenuse: \`hypot(x, y)\`

### Trigonometric Functions
- Sine: \`sin(x)\`
- Cosine: \`cos(x)\`
- Tangent: \`tan(x)\`
- Arc sine: \`asin(x)\`
- Arc cosine: \`acos(x)\`
- Arc tangent: \`atan(x)\`
- Arc tangent 2: \`atan2(y, x)\`
- Hyperbolic sine: \`sinh(x)\`
- Hyperbolic cosine: \`cosh(x)\`
- Hyperbolic tangent: \`tanh(x)\`
- Inverse hyperbolic sine: \`asinh(x)\`
- Inverse hyperbolic cosine: \`acosh(x)\`
- Inverse hyperbolic tangent: \`atanh(x)\`

### Constants
- Pi: \`PI\` (≈ 3.14159)
- Euler's number: \`E\` (≈ 2.71828)
- Random number: \`random\` (0 to 1)

## Usage Examples

### Basic Arithmetic
- **Input**: \`"2 + 3 * 4"\`
- **Output**: \`14\`

### Functions and Constants
- **Input**: \`"sqrt(16)"\`
- **Output**: \`4\`

- **Input**: \`"sin(PI/2)"\`
- **Output**: \`1\`

- **Input**: \`"pow(2, 3)"\`
- **Output**: \`8\`

- **Input**: \`"abs(-5)"\`
- **Output**: \`5\`

### Complex Expressions
- **Input**: \`"PI * 2^2"\`
- **Output**: \`12.566370614359172\`

- **Input**: \`"(10 + 5) * 2 / 4"\`
- **Output**: \`7.5\`

- **Input**: \`"log(100)"\`
- **Output**: \`4.605170185988092\`

### Random Numbers
- **Input**: \`"random * 10"\`
- **Output**: Random number between 0 and 10

### Bitwise Operations
- **Input**: \`"17 % 5"\`
- **Output**: \`2\`

- **Input**: \`"15 & 7"\`
- **Output**: \`7\`

- **Input**: \`"8 | 4"\`
- **Output**: \`12\`

## Security

All expressions are validated for security. Only mathematical operations, numbers, and predefined functions are allowed. The node prevents code injection by restricting input to safe mathematical expressions only.

## Error Handling

- Invalid expressions return an error
- Division by zero is handled gracefully
- Invalid function arguments return appropriate error messages
- Results are validated to ensure they are finite numbers`,
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "expression",
        type: "string",
        description: "Mathematical expression to evaluate",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description: "Calculated result of the expression",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { expression } = context.inputs;

    if (
      !expression ||
      typeof expression !== "string" ||
      expression.trim() === ""
    ) {
      return this.createErrorResult("Missing or empty expression.");
    }

    let vm: QuickJSContext | undefined;

    try {
      // Validate expression for safety - only allow mathematical operations
      const allowedPattern = /^[0-9+\-*/()., \t\n\r\s^%&|<>~]+$/;
      const mathFunctions =
        /(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|asinh|acosh|atanh|sqrt|cbrt|pow|exp|log|log10|abs|floor|ceil|round|min|max|random|PI|E|sign|trunc|hypot|atan2)/g;

      // Check if expression contains only allowed characters and math functions
      const cleanExpression = expression.replace(mathFunctions, "");
      if (cleanExpression && !allowedPattern.test(cleanExpression)) {
        return this.createErrorResult(
          "Expression contains invalid characters. Only numbers, operators (+, -, *, /, ^, %, &, |, <, >, ~), parentheses, and math functions are allowed."
        );
      }

      const QuickJSModule = await getQuickJSWASMModule();
      vm = QuickJSModule.newContext();

      // Replace ^ with ** for JavaScript exponentiation
      const jsExpression = expression.replace(/\^/g, "**");

      // Create a bootstrap script that sets up the Math environment
      const bootstrapScript = `
        // Set up Math object with all available functions
        globalThis.Math = {
          sin: Math.sin,
          cos: Math.cos,
          tan: Math.tan,
          asin: Math.asin,
          acos: Math.acos,
          atan: Math.atan,
          sinh: Math.sinh,
          cosh: Math.cosh,
          tanh: Math.tanh,
          asinh: Math.asinh,
          acosh: Math.acosh,
          atanh: Math.atanh,
          sqrt: Math.sqrt,
          cbrt: Math.cbrt,
          pow: Math.pow,
          exp: Math.exp,
          log: Math.log,
          log10: Math.log10,
          abs: Math.abs,
          floor: Math.floor,
          ceil: Math.ceil,
          round: Math.round,
          min: Math.min,
          max: Math.max,
          random: Math.random,
          PI: Math.PI,
          E: Math.E,
          sign: Math.sign,
          trunc: Math.trunc,
          hypot: Math.hypot,
          atan2: Math.atan2
        };

        // Make Math functions available globally for convenience
        globalThis.sin = Math.sin;
        globalThis.cos = Math.cos;
        globalThis.tan = Math.tan;
        globalThis.asin = Math.asin;
        globalThis.acos = Math.acos;
        globalThis.atan = Math.atan;
        globalThis.sinh = Math.sinh;
        globalThis.cosh = Math.cosh;
        globalThis.tanh = Math.tanh;
        globalThis.asinh = Math.asinh;
        globalThis.acosh = Math.acosh;
        globalThis.atanh = Math.atanh;
        globalThis.sqrt = Math.sqrt;
        globalThis.cbrt = Math.cbrt;
        globalThis.pow = Math.pow;
        globalThis.exp = Math.exp;
        globalThis.log = Math.log;
        globalThis.log10 = Math.log10;
        globalThis.abs = Math.abs;
        globalThis.floor = Math.floor;
        globalThis.ceil = Math.ceil;
        globalThis.round = Math.round;
        globalThis.min = Math.min;
        globalThis.max = Math.max;
        globalThis.random = Math.random;
        globalThis.PI = Math.PI;
        globalThis.E = Math.E;
        globalThis.sign = Math.sign;
        globalThis.trunc = Math.trunc;
        globalThis.hypot = Math.hypot;
        globalThis.atan2 = Math.atan2;
      `;

      const bootstrapResult = vm.evalCode(bootstrapScript);
      if (bootstrapResult.error) {
        const errorDump = vm.dump(bootstrapResult.error);
        bootstrapResult.error.dispose();
        return this.createErrorResult(
          `Failed to initialize Math environment: ${JSON.stringify(errorDump)}`
        );
      }
      bootstrapResult.value.dispose();

      // Execute the expression
      const evalResult = vm.evalCode(jsExpression);

      if (evalResult.error) {
        const errorDump = vm.dump(evalResult.error);
        evalResult.error.dispose();
        return this.createErrorResult(
          `Expression evaluation error: ${JSON.stringify(errorDump)}`
        );
      }

      const result = vm.dump(evalResult.value);
      evalResult.value.dispose();

      // Validate the result
      if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
        return this.createErrorResult(
          "Expression evaluation resulted in an invalid number (NaN or Infinity)."
        );
      }

      return this.createSuccessResult({ result });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Failed to evaluate expression"
      );
    } finally {
      if (vm) {
        vm.dispose();
      }
    }
  }
}
