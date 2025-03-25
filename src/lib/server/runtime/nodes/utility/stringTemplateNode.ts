import { BaseExecutableNode } from '../baseNode';
import { Node, NodeContext, ExecutionResult, NodeType } from '../../workflowTypes';

export class StringTemplateNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    type: 'stringTemplate',
    name: 'String Template',
    description: 'Create a string using a template with variable injection using ${variableName} syntax',
    category: 'Utility',
    id: 'stringTemplate',
    icon: 'quote',
    inputs: [
      {
        name: 'template',
        type: 'string',
        description: 'The template string with variables in ${variableName} format',
      },
      {
        name: 'variables',
        type: 'json',
        description: 'JSON object containing variable values to inject',
      }
    ],
    outputs: [
      {
        name: 'result',
        type: 'string',
        description: 'The resulting string with variables replaced',
      },
      {
        name: 'missingVariables',
        type: 'json',
        description: 'Array of variable names that were not found in the variables object',
      }
    ],
  };

  private extractVariableNames(template: string): string[] {
    const regex = /\${([^}]+)}/g;
    const matches = template.match(regex) || [];
    return matches.map(match => match.slice(2, -1));
  }

  private replaceVariables(template: string, variables: Record<string, any>): [string, string[]] {
    const missingVariables: string[] = [];
    const result = template.replace(/\${([^}]+)}/g, (match, varName) => {
      if (variables.hasOwnProperty(varName)) {
        const value = variables[varName];
        return value !== null && value !== undefined ? String(value) : '';
      }
      missingVariables.push(varName);
      return match;
    });
    return [result, missingVariables];
  }

  public async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const template = context.inputs['template'];
      const variables = context.inputs['variables'];

      if (template === null || template === undefined || typeof template !== 'string') {
        return this.createErrorResult('Invalid or missing template string');
      }

      // Empty string is a valid template
      if (variables === null || variables === undefined || typeof variables !== 'object') {
        return this.createErrorResult('Invalid or missing variables object');
      }

      const [result, missingVariables] = this.replaceVariables(template, variables);

      return this.createSuccessResult({
        result,
        missingVariables
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error processing template: ${error.message}`);
    }
  }
} 