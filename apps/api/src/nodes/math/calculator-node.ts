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
      "Evaluates mathematical expressions with comprehensive support for arithmetic operations, mathematical functions, trigonometric functions, constants, and complex formulas. Supports: basic arithmetic (+, -, *, /, ^, %), bitwise operators (&, |, <, >, ~), mathematical functions (sqrt, cbrt, pow, exp, log, log10, abs, floor, ceil, round, min, max, sign, trunc, hypot), trigonometric functions (sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh, asinh, acosh, atanh), mathematical constants (PI, E), random numbers, and complex nested expressions with proper order of operations and parentheses. All inputs are validated for security and only mathematical operations are allowed.",
    tags: ["Math"],
    icon: "calculator",
    documentation: `This node evaluates mathematical expressions with support for arithmetic operations, functions, and constants.

## Usage Example

- **Input**: \`"2 + 3 * 4"\`
- **Output**: \`14\``,
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "expression",
        type: "string",
        description:
          "The mathematical expression to evaluate as a string. Examples: '2 + 3 * 4', 'sqrt(16)', 'sin(PI/2)', 'pow(2, 3)', 'abs(-5)', 'floor(3.7)', 'PI * 2^2', '(10 + 5) * 2 / 4', 'log(100)', 'random * 10', '17 % 5', '15 & 7', '8 | 4', '~10'. Supports all standard mathematical operations, functions, and constants. Use ^ for exponentiation (e.g., 2^3 = 8), % for modulo (e.g., 17 % 5 = 2), & for bitwise AND, | for bitwise OR, ~ for bitwise NOT. All expressions are validated for security.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description:
          "The calculated result of the mathematical expression as a number. Returns the final computed value after evaluating the expression with proper order of operations. Will be NaN or throw an error for invalid expressions.",
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
