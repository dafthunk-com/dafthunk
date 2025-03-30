import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { JsonValue } from "../types";
import { ArrayValue } from "../types";
import { NodeType } from "../types";

export class JsonTemplateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    type: "jsonTemplate",
    name: "JSON Template",
    description:
      "Create a JSON object using a template with variable injection using ${variableName} syntax",
    category: "JSON",
    id: "jsonTemplate",
    icon: "code",
    inputs: [
      {
        name: "template",
        type: JsonValue,
        description:
          "The JSON template object with variables in ${variableName} format",
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
        type: JsonValue,
        description: "The resulting JSON object with variables replaced",
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

  private extractVariableNames(obj: any): string[] {
    const variableNames: string[] = [];
    const regex = /\${([^}]+)}/g;

    const traverse = (value: any) => {
      if (typeof value === "string") {
        const matches = value.match(regex) || [];
        variableNames.push(...matches.map((match) => match.slice(2, -1)));
      } else if (Array.isArray(value)) {
        value.forEach(traverse);
      } else if (value && typeof value === "object") {
        Object.values(value).forEach(traverse);
      }
    };

    traverse(obj);
    return [...new Set(variableNames)]; // Remove duplicates
  }

  private replaceVariables(
    template: any,
    variables: Record<string, any>
  ): { result: any; missingVariables: string[] } {
    const variableNames = this.extractVariableNames(template);
    const missingVariables = variableNames.filter(
      (varName) => !variables.hasOwnProperty(varName)
    );

    const replaceValue = (value: any): any => {
      if (typeof value === "string") {
        return value.replace(/\${([^}]+)}/g, (match, varName) => {
          if (variables.hasOwnProperty(varName)) {
            const val = variables[varName];
            return val !== null && val !== undefined ? String(val) : "";
          }
          return match;
        });
      } else if (Array.isArray(value)) {
        return value.map(replaceValue);
      } else if (value && typeof value === "object") {
        const result: Record<string, any> = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = replaceValue(val);
        }
        return result;
      }
      return value;
    };

    return {
      result: replaceValue(template),
      missingVariables,
    };
  }

  public async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const { template, variables } = context.inputs;

      // Handle invalid template input (null, undefined, non-object)
      if (
        template === null ||
        template === undefined ||
        typeof template !== "object"
      ) {
        return this.createErrorResult("Invalid or missing template object");
      }

      if (!variables || typeof variables !== "object") {
        return this.createErrorResult("Invalid or missing variables object");
      }

      const { result, missingVariables } = this.replaceVariables(
        template,
        variables
      );

      return this.createSuccessResult({
        result: new JsonValue(result),
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
