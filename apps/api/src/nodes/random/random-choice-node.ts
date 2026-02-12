import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

/**
 * RandomChoice node implementation
 * Selects random item(s) from a list of options
 */
export class RandomChoiceNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "random-choice",
    name: "Random Choice",
    type: "random-choice",
    description: "Select random item(s) from a list of options",
    tags: ["Random", "Logic", "Array"],
    icon: "shuffle",
    documentation:
      "Randomly selects one or more items from a list of options. Set count to select multiple items, and unique to ensure no duplicates.",
    inlinable: false,
    asTool: false,
    inputs: [
      {
        name: "options",
        type: "any",
        description: "Options to choose from",
        required: true,
        repeated: true,
      },
      {
        name: "count",
        type: "number",
        description: "Number of items to select",
        required: false,
        repeated: false,
        value: 1,
      },
      {
        name: "unique",
        type: "boolean",
        description: "Select unique items (no duplicates)",
        required: false,
        repeated: false,
        value: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "any",
        description: "Randomly selected item(s)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { options, count = 1, unique = true } = context.inputs;

      // Validate options
      if (options === null || options === undefined) {
        return this.createErrorResult("Missing required input: options");
      }

      // Convert to array if not already
      const optionsArray = Array.isArray(options) ? options : [options];

      if (optionsArray.length === 0) {
        return this.createErrorResult("options cannot be empty");
      }

      // Validate count
      const countNum = Number(count);
      if (isNaN(countNum)) {
        return this.createErrorResult(
          `Invalid count: expected number, got ${typeof count}`
        );
      }

      if (countNum < 1) {
        return this.createErrorResult(
          `Invalid count: must be at least 1, got ${countNum}`
        );
      }

      if (!Number.isInteger(countNum)) {
        return this.createErrorResult(
          `Invalid count: must be an integer, got ${countNum}`
        );
      }

      // Validate unique constraint
      if (unique && countNum > optionsArray.length) {
        return this.createErrorResult(
          `Cannot select ${countNum} unique items from ${optionsArray.length} options`
        );
      }

      // Select random item(s)
      let selected: unknown[];

      if (unique) {
        // Fisher-Yates shuffle for unique selection
        const shuffled = [...optionsArray];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        selected = shuffled.slice(0, countNum);
      } else {
        // Random selection with possible duplicates
        selected = [];
        for (let i = 0; i < countNum; i++) {
          const randomIndex = Math.floor(Math.random() * optionsArray.length);
          selected.push(optionsArray[randomIndex]);
        }
      }

      // Return single item if count is 1, array otherwise
      const result = countNum === 1 ? selected[0] : selected;

      return this.createSuccessResult({ value: result });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error selecting random choice: ${error.message}`
      );
    }
  }
}
