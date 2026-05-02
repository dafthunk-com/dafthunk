import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import { EXECUTOR_UNAVAILABLE_MESSAGE } from "../../utils/code-mode";

const ALLOWED_CHARS = /^[0-9+\-*/()., \t\n\r\s^%&|<>~]+$/;
const MATH_FUNCTIONS =
  /\b(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|asinh|acosh|atanh|sqrt|cbrt|pow|exp|log|log10|abs|floor|ceil|round|min|max|random|PI|E|sign|trunc|hypot|atan2)\b/g;

const PRELUDE = [
  "const {",
  "  sin, cos, tan, asin, acos, atan, atan2,",
  "  sinh, cosh, tanh, asinh, acosh, atanh,",
  "  sqrt, cbrt, pow, exp, log, log10,",
  "  abs, floor, ceil, round, sign, trunc,",
  "  min, max, hypot, random,",
  "  PI, E,",
  "} = Math;",
].join("\n");

export class CalculatorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "calculator",
    name: "Calculator",
    type: "calculator",
    description:
      "Evaluates mathematical expressions with support for arithmetic, functions, and constants.",
    tags: ["Math", "Calculate"],
    icon: "calculator",
    documentation:
      "Evaluates mathematical expressions with comprehensive support for arithmetic operations, mathematical functions, trigonometric functions, constants, and complex formulas.",
    specification: `result = eval(expression)

IMPORTANT: Use exact function names - no abbreviations allowed!

Supported operators:
  Arithmetic: + (addition), - (subtraction), * (multiplication), / (division), ^ (exponentiation), % (modulo)
  Bitwise: & (AND), | (OR), ~ (NOT), < (left shift), > (right shift)
  Parentheses: ( ) for grouping

Supported functions (use exact names):
  Trigonometric: sin(x), cos(x), tan(x), asin(x), acos(x), atan(x), atan2(y, x)
  Hyperbolic: sinh(x), cosh(x), tanh(x), asinh(x), acosh(x), atanh(x)
  Exponential/Logarithmic: exp(x), log(x), log10(x), pow(base, exp)
  Rounding: floor(x), ceil(x), round(x), trunc(x)
  Absolute/Sign: abs(x), sign(x)
  Roots: sqrt(x) for square root, cbrt(x) for cube root
  Min/Max: min(a, b, ...), max(a, b, ...)
  Other: hypot(x, y, ...), random()

Constants:
  PI = 3.141592653589793
  E = 2.718281828459045

Examples:
  sqrt(16) → 4
  2 + 3 * 4 → 14
  sin(PI / 2) → 1
  pow(2, 3) → 8
  atan2(1, 1) → 0.7853981633974483 (PI/4)
  sqrt(100^2 - 2*9.81*300) → valid expression

Expression must contain only numbers, allowed operators, exact function names, constants, whitespace, and parentheses. Result must be a finite number.`,
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

    // Whitelist: numbers, math operators, parens, whitespace, and exact
    // math function/constant names. Defense-in-depth on top of the V8 sandbox.
    const stripped = expression.replace(MATH_FUNCTIONS, "");
    if (stripped && !ALLOWED_CHARS.test(stripped)) {
      return this.createErrorResult(
        "Expression contains invalid characters. Only numbers, operators (+, -, *, /, ^, %, &, |, <, >, ~), parentheses, and math functions are allowed."
      );
    }

    const executor = context.codeModeExecutor;
    if (!executor) {
      return this.createErrorResult(EXECUTOR_UNAVAILABLE_MESSAGE);
    }

    // ^ is XOR in JS; the calculator treats it as exponentiation.
    const jsExpression = expression.replace(/\^/g, "**");

    const code = `${PRELUDE}\nreturn (${jsExpression});`;

    const { result, error } = await executor.execute(
      code,
      {},
      { timeoutMs: 5000 }
    );

    if (error) {
      return this.createErrorResult(`Expression evaluation error: ${error}`);
    }

    if (
      typeof result !== "number" ||
      Number.isNaN(result) ||
      !Number.isFinite(result)
    ) {
      return this.createErrorResult(
        "Expression evaluation resulted in an invalid number (NaN or Infinity)."
      );
    }

    return this.createSuccessResult({ result });
  }
}
