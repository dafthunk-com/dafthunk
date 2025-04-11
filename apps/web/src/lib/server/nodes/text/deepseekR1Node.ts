import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { StringValue, NumberValue } from "../types";

/**
 * DeepSeek R1 Distill Qwen 32B Node implementation with comprehensive parameters
 */
export class DeepseekR1Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "deepseek-r1-distill-qwen-32b",
    name: "deepseek-r1-distill-qwen-32b",
    description: "Generates text using DeepSeek R1 Distill Qwen 32B model",
    category: "Text",
    icon: "ai",
    inputs: [
      {
        name: "prompt",
        type: StringValue,
        description: "The input text prompt for the LLM",
        required: true,
      },
      {
        name: "messages",
        type: StringValue,
        description: "JSON string of conversation messages",
        required: false,
      },
      {
        name: "temperature",
        type: NumberValue,
        description: "Controls randomness in the output (0.0 to 5.0)",
        hidden: true,
        value: new NumberValue(0.6),
      },
      {
        name: "max_tokens",
        type: NumberValue,
        description: "Maximum number of tokens to generate",
        hidden: true,
        value: new NumberValue(256),
      },
      {
        name: "top_p",
        type: NumberValue,
        description: "Controls diversity via nucleus sampling (0.0 to 2.0)",
        hidden: true,
        value: new NumberValue(1.0),
      },
      {
        name: "top_k",
        type: NumberValue,
        description: "Controls diversity via top-k sampling (1 to 50)",
        hidden: true,
        value: new NumberValue(40),
      },
      {
        name: "seed",
        type: NumberValue,
        description: "Random seed for deterministic generation",
        hidden: true,
        value: undefined,
      },
      {
        name: "repetition_penalty",
        type: NumberValue,
        description: "Penalty for repeated tokens (0.0 to 2.0)",
        hidden: true,
        value: new NumberValue(1.0),
      },
      {
        name: "frequency_penalty",
        type: NumberValue,
        description: "Penalty for frequency of tokens (0.0 to 2.0)",
        hidden: true,
        value: new NumberValue(0.0),
      },
      {
        name: "presence_penalty",
        type: NumberValue,
        description: "Penalty for presence of tokens (0.0 to 2.0)",
        hidden: true,
        value: new NumberValue(0.0),
      },
      {
        name: "stream",
        type: NumberValue,
        description: "Whether to stream the response",
        hidden: true,
        value: new NumberValue(0),
      },
    ],
    outputs: [
      {
        name: "response",
        type: StringValue,
        description: "Generated text response",
      },
      {
        name: "usage",
        type: StringValue,
        hidden: true,
        description: "Token usage statistics",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const {
        prompt,
        messages,
        temperature,
        max_tokens,
        top_p,
        top_k,
        seed,
        repetition_penalty,
        frequency_penalty,
        presence_penalty,
        stream,
      } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const params: any = {
        temperature,
        max_tokens,
        top_p,
        top_k,
        seed,
        repetition_penalty,
        frequency_penalty,
        presence_penalty,
        stream: Boolean(stream),
      };

      // If messages are provided, use them, otherwise use prompt
      if (messages) {
        params.messages = JSON.parse(messages);
      } else {
        params.prompt = prompt;
      }

      const result = await context.env.AI.run(
        "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
        params
      );

      return this.createSuccessResult({
        response: new StringValue(result.response),
        usage: new StringValue(JSON.stringify(result.usage)),
      });
    } catch (error) {
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
