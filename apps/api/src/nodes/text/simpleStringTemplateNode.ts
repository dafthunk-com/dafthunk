import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
import { NodeType, NodeExecution } from "@dafthunk/types";

export class SimpleStringTemplateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "simpleStringTemplate",
    name: "Simple String Template",
    type: "simpleStringTemplate",
    description:
      "Create a string using a template with a single variable injection using ${variable} syntax",
    category: "Text",
    icon: "quote",
    inputs: [
      {
        name: "template",
        type: "string",
        description:
          "The template string with a single variable in ${variable} format",
        required: true,
      },
      {
        name: "variable",
        type: "string",
        description: "The value to replace the ${variable} placeholder with",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description: "The resulting string with the variable replaced",
      },
    ],
  };

  private replaceVariable(template: string, variable: string): string {
    return template.replace(/\${variable}/g, variable);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { template, variable } = context.inputs;

      // Handle invalid template input (null, undefined, non-string)
      if (
        template === null ||
        template === undefined ||
        typeof template !== "string"
      ) {
        return this.createErrorResult("Invalid or missing template string");
      }

      // Handle empty template string
      if (template === "") {
        return this.createSuccessResult({
          result: "",
        });
      }

      // Handle invalid variable input
      if (
        variable === null ||
        variable === undefined ||
        typeof variable !== "string"
      ) {
        return this.createErrorResult("Invalid or missing variable value");
      }

      const result = this.replaceVariable(template, variable);

      return this.createSuccessResult({
        result,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error processing template: ${error.message}`
      );
    }
  }
}
