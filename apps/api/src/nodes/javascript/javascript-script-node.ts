import { getQuickJSWASMModule, QuickJSContext } from "@cf-wasm/quickjs";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

export class JavascriptScriptNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "javascript-script",
    name: "JavaScript Script",
    type: "javascript-script",
    description:
      "Executes a JavaScript script similar to running a Node.js script from command line. Provides arguments as a global 'args' array and console output capture.",
    tags: ["JavaScript", "Script"],
    icon: "terminal",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "script",
        type: "string",
        description: "The JavaScript script to execute",
        required: true,
      },
      {
        name: "args",
        type: "json",
        description:
          "Command line arguments (array of strings) to pass to the script",
        required: false,
      },
      {
        name: "timeout",
        type: "number",
        description: "Execution timeout in milliseconds (default: 5000)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "json",
        description:
          "The result of the script execution (return value or last expression)",
      },
      {
        name: "stdout",
        type: "string",
        description: "Captured console.log output",
      },
      {
        name: "stderr",
        type: "string",
        description: "Captured console.error output",
      },
      {
        name: "error",
        type: "string",
        description: "Error message if script execution failed",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    const { script, args = [], timeout = 5000 } = context.inputs;

    if (!script || typeof script !== "string" || script.trim() === "") {
      return this.createErrorResult("Missing or empty script.");
    }

    if (!Array.isArray(args)) {
      return this.createErrorResult("Arguments must be an array of strings.");
    }

    let vm: QuickJSContext | undefined;
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      const QuickJSModule = await getQuickJSWASMModule();
      vm = QuickJSModule.newContext();

      // Capture console output
      const stdout: string[] = [];
      const stderr: string[] = [];

      // Create a bootstrap script that sets up the environment
      const bootstrapScript = `
         // Set up console object
         globalThis.console = {
           log: function(...args) {
             globalThis.__stdout__.push(args.join(' '));
           },
           error: function(...args) {
             globalThis.__stderr__.push(args.join(' '));
           },
           warn: function(...args) {
             globalThis.__stderr__.push(args.join(' '));
           }
         };

         // Set up simple args global
         globalThis.args = ${JSON.stringify(args)};

         // Initialize output arrays
         globalThis.__stdout__ = [];
         globalThis.__stderr__ = [];
       `;

      const bootstrapResult = vm.evalCode(bootstrapScript);
      if (bootstrapResult.error) {
        const errorDump = vm.dump(bootstrapResult.error);
        bootstrapResult.error.dispose();
        return this.createErrorResult(
          `Failed to initialize script environment: ${JSON.stringify(errorDump)}`
        );
      }
      bootstrapResult.value.dispose();

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Script execution timed out after ${timeout}ms`));
        }, timeout);
      });

      // Execute the script
      const executionPromise = (async () => {
        // Prepare the user's script - wrap in parentheses if it starts with '{' to handle object literals
        const scriptToExecute = script.trim();

        // If the script starts with '{', try wrapping it in parentheses first to treat it as an expression
        const shouldTryWrapping = scriptToExecute.startsWith("{");

        if (shouldTryWrapping) {
          const wrappedScript = `(${scriptToExecute})`;
          const wrappedResult = vm!.evalCode(wrappedScript);

          if (wrappedResult.error) {
            // If wrapping failed, dispose the error and try without wrapping
            wrappedResult.error.dispose();
          } else {
            // Wrapping succeeded, use this result
            const resultOutput = vm!.dump(wrappedResult.value);
            wrappedResult.value.dispose();
            return resultOutput;
          }
        }

        // Execute the original script (either it didn't start with '{' or wrapping failed)
        const evalResult = vm!.evalCode(scriptToExecute);

        if (evalResult.error) {
          const errorDump = vm!.dump(evalResult.error);
          evalResult.error.dispose();
          throw new Error(
            `Script execution error: ${JSON.stringify(errorDump)}`
          );
        }

        const resultOutput = vm!.dump(evalResult.value);
        evalResult.value.dispose();
        return resultOutput;
      })();

      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Get captured output
      const stdoutResult = vm.evalCode("globalThis.__stdout__.join('\\n')");
      const stderrResult = vm.evalCode("globalThis.__stderr__.join('\\n')");

      const stdoutOutput = stdoutResult.error
        ? ""
        : vm.dump(stdoutResult.value);
      const stderrOutput = stderrResult.error
        ? ""
        : vm.dump(stderrResult.value);

      if (!stdoutResult.error) stdoutResult.value.dispose();
      if (!stderrResult.error) stderrResult.value.dispose();

      return this.createSuccessResult({
        result,
        stdout: stdoutOutput,
        stderr: stderrOutput,
        error: null,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error during script execution: ${error.message}`
      );
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (vm) {
        vm.dispose();
      }
    }
  }
}
