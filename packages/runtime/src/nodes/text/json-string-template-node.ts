import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class JsonStringTemplateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-string-template",
    name: "JSON String Template",
    type: "json-string-template",
    description:
      "Create a string using a template with variable injection from a JSON object using ${variableName} syntax",
    tags: ["Text", "Template"],
    icon: "quote",
    documentation:
      "This node creates a string using a template with variable injection from a JSON object using \\${variableName} syntax.",
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
      (varName) => !Object.hasOwn(variables, varName)
    );

    const result = template.replace(/\${([^}]+)}/g, (match, varName) => {
      if (Object.hasOwn(variables, varName)) {
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
