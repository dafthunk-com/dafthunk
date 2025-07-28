import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class MultiVariableStringTemplateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "multi-variable-string-template",
    name: "Multi-Variable String Template",
    type: "multi-variable-string-template",
    description:
      "Create a string using a template with multiple variable injection using ${variableName} syntax",
    tags: ["Text"],
    icon: "quote",
    inlinable: true,
    inputs: [
      {
        name: "template",
        type: "string",
        description:
          "The template string with variables in ${variableName} format",
        required: true,
      },
      {
        name: "variables",
        type: "json",
        description: "JSON object containing variable values to inject",
        required: true,
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
          "Array of variable names that were not found in the variables object",
        hidden: true,
      },
    ],
  };

  private extractVariableNames(template: string): string[] {
    const regex = /\${([^}]+)}/g;
    const matches = template.match(regex) || [];
    return matches.map((match) => match.slice(2, -1));
  }

  private replaceVariables(
    template: string,
    variables: Record<string, any>
  ): { result: string; missingVariables: string[] } {
    const variableNames = this.extractVariableNames(template);
    const missingVariables = variableNames.filter(
      (varName) => !variables.hasOwnProperty(varName)
    );

    const result = template.replace(/\${([^}]+)}/g, (match, varName) => {
      if (variables.hasOwnProperty(varName)) {
        const value = variables[varName];
        return value !== null && value !== undefined ? String(value) : "";
      }
      return match;
    });

    return { result, missingVariables };
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { template, variables } = context.inputs;

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
          missingVariables: [],
        });
      }

      if (!variables || typeof variables !== "object") {
        return this.createErrorResult("Invalid or missing variables object");
      }

      const { result, missingVariables } = this.replaceVariables(
        template,
        variables
      );

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
