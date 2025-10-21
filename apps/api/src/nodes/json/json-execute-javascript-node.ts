import { getQuickJSWASMModule, QuickJSContext } from "@cf-wasm/quickjs";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

export class JsonExecuteJavascriptNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-execute-javascript",
    name: "JSON Execute Javascript",
    type: "json-execute-javascript",
    description:
      "Executes a JavaScript script with a JSON object as input. The input JSON is available as a global variable 'json'. The result of the last expression is returned.",
    tags: ["Data", "JSON", "Execute", "JavaScript"],
    icon: "code",
    documentation:
      "This node executes JavaScript code with a JSON object as input, allowing you to transform and manipulate JSON data programmatically.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON object to process",
        required: true,
      },
      {
        name: "javascript",
        type: "string",
        description:
          "JavaScript code to execute. 'json' is available globally. The last expression's result is returned.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "json",
        description:
          "The result of the script execution, expected to be a JSON object or array",
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
    const { json, javascript } = context.inputs;

    if (json === undefined || json === null) {
      return this.createErrorResult("Missing JSON input object.");
    }

    if (
      !javascript ||
      typeof javascript !== "string" ||
      javascript.trim() === ""
    ) {
      return this.createErrorResult("Missing or empty script.");
    }

    let vm: QuickJSContext | undefined;
    try {
      const QuickJSModule = await getQuickJSWASMModule();
      vm = QuickJSModule.newContext();

      // 1. Convert JSON to string and create a string handle in the VM
      const jsonStringified = JSON.stringify(json);
      const jsonStringHandle = vm.newString(jsonStringified);

      // 2. Set this string handle to a temporary global variable in the VM
      vm.setProp(vm.global, "__tempJsonString__", jsonStringHandle);
      jsonStringHandle.dispose(); // Dispose handle, vm's global has it now

      // 3. Bootstrap script to parse the string and set globalThis.json
      const bootstrapScript = `
        try {
          globalThis.json = JSON.parse(globalThis.__tempJsonString__);
        } finally {
          delete globalThis.__tempJsonString__;
        }
      `;
      const bootstrapResult = vm.evalCode(bootstrapScript);

      if (bootstrapResult.error) {
        const errorDump = vm.dump(bootstrapResult.error);
        bootstrapResult.error.dispose();
        return this.createErrorResult(
          `Failed to initialize json in VM: ${JSON.stringify(errorDump)}`
        );
      }
      // Result of delete is boolean, or undefined if try/finally completes normally without returning a value from try.
      // In either case, dispose the handle for the result of the bootstrap script.
      bootstrapResult.value.dispose();

      // 4. Prepare the user's script - wrap in parentheses if it starts with '{' to handle object literals
      const scriptToExecute = javascript.trim();

      // If the script starts with '{', try wrapping it in parentheses first to treat it as an expression
      const shouldTryWrapping = scriptToExecute.startsWith("{");

      if (shouldTryWrapping) {
        const wrappedScript = `(${scriptToExecute})`;
        const wrappedResult = vm.evalCode(wrappedScript);

        if (wrappedResult.error) {
          // If wrapping failed, dispose the error and try without wrapping
          wrappedResult.error.dispose();
        } else {
          // Wrapping succeeded, use this result
          const resultOutput = vm.dump(wrappedResult.value);
          wrappedResult.value.dispose();
          return this.createSuccessResult({
            result: resultOutput,
            error: null,
          });
        }
      }

      // 5. Execute the original script (either it didn't start with '{' or wrapping failed)
      const evalResult = vm.evalCode(scriptToExecute);

      if (evalResult.error) {
        const errorDump = vm.dump(evalResult.error);
        evalResult.error.dispose();
        return this.createErrorResult(
          `Script execution error: ${JSON.stringify(errorDump)}`
        );
      } else {
        const resultOutput = vm.dump(evalResult.value);
        evalResult.value.dispose();
        return this.createSuccessResult({
          result: resultOutput,
          error: null, // Explicitly set error to null on success
        });
      }
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error during script execution: ${error.message}`
      );
    } finally {
      if (vm) {
        vm.dispose();
      }
    }
  }
}
