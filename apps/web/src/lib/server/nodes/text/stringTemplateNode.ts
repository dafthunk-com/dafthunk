import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { StringValue, ArrayValue, JsonValue } from "../types";

export class StringTemplateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    name: "String Template",
    description:
      "Create a string using a template with variable injection using ${variableName} syntax",
    category: "Text",
    id: "stringTemplate",
    icon: "quote",
    inputs: [
      {
        name: "template",
        type: StringValue,
        description:
          "The template string with variables in ${variableName} format",
        required: true,
      },
      {
        name: "variables",
        type: JsonValue,
        description: "JSON object containing variable values to inject",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: StringValue,
        description: "The resulting string with variables replaced",
      },
      {
        name: "missingVariables",
        type: ArrayValue,
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

  public async execute(context: NodeContext): Promise<ExecutionResult> {
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
          result: new StringValue(""),
          missingVariables: new ArrayValue([]),
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
        result: new StringValue(result),
        missingVariables: new ArrayValue(missingVariables),
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error processing template: ${error.message}`
      );
    }
  }
}
