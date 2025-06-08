import { getQuickJSWASMModule, QuickJSContext } from "@cf-wasm/quickjs";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

export class JsonJavascriptProcessorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-javascript-processor",
    name: "JSON Javascript Processor",
    type: "json-javascript-processor",
    description:
      "Executes a JavaScript script with a JSON object as input. The input JSON is available as a global variable 'json'. The result of the last expression is returned.",
    category: "JSON",
    icon: "code",
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

      // 4. Now, 'json' global variable is ready for the user's script
      const evalResult = vm.evalCode(javascript);

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
