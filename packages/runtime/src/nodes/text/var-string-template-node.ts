import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class VarStringTemplateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "var-string-template",
    name: "Var String Template",
    type: "var-string-template",
    description:
      "Create a string using a template with variable injection using ${variableName} syntax",
    tags: ["Text", "Template"],
    icon: "quote",
    documentation:
      "This node creates a string using a template with variable injection using \\${variableName} syntax. Variables are provided as dynamic inputs matching the variable names in the template.",
    inlinable: true,
    dynamicInputs: {
      prefix: "var",
      type: "string",
      defaultCount: 1,
      minCount: 1,
    },
    inputs: [
      {
        name: "template",
        type: "string",
        description:
          "The template string with variables in ${variableName} format",
        required: true,
      },
      {
        name: "var_1",
        type: "string",
        description: "Variable value to inject",
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description: "The resulting string with variables replaced",
      },
      {
        name: "missingVariables",
        type: "json",
        description:
          "Array of variable names that were not found in the provided inputs",
        hidden: true,
      },
    ],
  };

  private extractVariableNames(template: string): string[] {
    const regex = /\${([^}]+)}/g;
    const matches = template.match(regex) || [];
    return matches.map((match) => match.slice(2, -1));
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { template } = context.inputs;

      if (
        template === null ||
        template === undefined ||
        typeof template !== "string"
      ) {
        return this.createErrorResult("Invalid or missing template string");
      }

      if (template === "") {
        return this.createSuccessResult({
          result: "",
          missingVariables: [],
        });
      }

      const variables: Record<string, string> = {};
      const values = this.collectDynamicInputs(context.inputs, "var");
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (value !== null && value !== undefined) {
          variables[`var_${i + 1}`] = String(value);
        }
      }

      const variableNames = this.extractVariableNames(template);
      const missingVariables = variableNames.filter(
        (varName) => !Object.hasOwn(variables, varName)
      );

      const result = template.replace(/\${([^}]+)}/g, (match, varName) => {
        if (Object.hasOwn(variables, varName)) {
          return variables[varName];
        }
        return match;
      });

      return this.createSuccessResult({
        result,
        missingVariables,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error processing template: ${error.message}`
      );
    }
  }
}
