import { ExecutableNode } from "../nodeTypes";
import { NodeContext, ExecutionResult } from "../../types";
import { StringNodeParameter, ArrayNodeParameter } from "../nodeParameterTypes";
import { NodeType } from "../nodeTypes";

export interface RadioOption {
  value: string;
  label: string;
}

/**
 * RadioGroup node implementation
 * This node provides a radio group widget that outputs a selected value
 * from a predefined set of options.
 *
 * The radio group's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class RadioGroupNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "radio-group",
    name: "Radio Group",
    type: "radio-group",
    description:
      "A radio group widget for selecting one option from a list of choices",
    category: "Text",
    icon: "radio",
    inputs: [
      {
        name: "options",
        type: ArrayNodeParameter,
        description: "Array of options for the radio group",
        hidden: true,
        value: new ArrayNodeParameter([
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
          { value: "option3", label: "Option 3" },
        ]),
      },
      {
        name: "value",
        type: StringNodeParameter,
        description: "Currently selected value",
        hidden: true,
        value: new StringNodeParameter("option1"), // Default to first option
      },
    ],
    outputs: [
      {
        name: "value",
        type: StringNodeParameter,
        description: "The selected value from the radio group",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const options = context.inputs.options as RadioOption[];
      const value = context.inputs.value as string;

      // Validate inputs
      if (!Array.isArray(options)) {
        return this.createErrorResult("Options must be an array");
      }

      if (options.length === 0) {
        return this.createErrorResult("Options array cannot be empty");
      }

      // Validate that all options have the correct structure
      const isValidOptions = options.every(
        (opt): opt is RadioOption =>
          typeof opt === "object" &&
          opt !== null &&
          typeof opt.value === "string" &&
          typeof opt.label === "string"
      );

      if (!isValidOptions) {
        return this.createErrorResult(
          "All options must have 'value' and 'label' properties as strings"
        );
      }

      // If no value is provided or the value is not in options, use first option's value
      const validValues = options.map((opt) => opt.value);
      const outputValue =
        value && validValues.includes(value) ? value : options[0].value;

      return this.createSuccessResult({
        value: new StringNodeParameter(outputValue),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
