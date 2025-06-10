import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Llama 3.3 70B Instruct Fast Node implementation with comprehensive parameters
 */

interface Llama3370BNonStreamedOutput {
  response?: string;
  usage?: any;
}

export class Llama3370BInstructFastNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "llama-3-3-70b-instruct-fp8-fast",
    name: "llama-3.3-70b-instruct-fp8-fast",
    type: "llama-3-3-70b-instruct-fp8-fast",
    description: "Generates text using Llama 3.3 70B model with fp8 precision",
    category: "Text",
    icon: "ai",
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "The input text prompt for the LLM",
        required: true,
      },
      {
        name: "temperature",
        type: "number",
        description: "Controls randomness in the output (0.0 to 5.0)",
        hidden: true,
        value: 0.6,
      },
      {
        name: "max_tokens",
        type: "number",
        description: "Maximum number of tokens to generate",
        hidden: true,
        value: 256,
      },
      {
        name: "top_p",
        type: "number",
        description: "Controls diversity via nucleus sampling (0.0 to 2.0)",
        hidden: true,
        value: 1.0,
      },
      {
        name: "top_k",
        type: "number",
        description: "Controls diversity via top-k sampling (1 to 50)",
        hidden: true,
        value: 40,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for deterministic generation",
        hidden: true,
      },
      {
        name: "repetition_penalty",
        type: "number",
        description: "Penalty for repeated tokens (0.0 to 2.0)",
        hidden: true,
        value: 1.0,
      },
      {
        name: "frequency_penalty",
        type: "number",
        description: "Penalty for frequency of tokens (0.0 to 2.0)",
        hidden: true,
        value: 0.0,
      },
      {
        name: "presence_penalty",
        type: "number",
        description: "Penalty for presence of tokens (0.0 to 2.0)",
        hidden: true,
        value: 0.0,
      },
    ],
    outputs: [
      {
        name: "response",
        type: "string",
        description: "Generated text response",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        prompt,
        messages, // Note: messages is declared but not used if params.stream is always false and no messages input handling
        temperature,
        max_tokens,
        top_p,
        top_k,
        seed,
        repetition_penalty,
        frequency_penalty,
        presence_penalty,
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
        stream: false, // Assuming stream is always false for now, can be parameterized if needed
      };

      // If messages are provided, use them, otherwise use prompt
      if (messages && typeof messages === "string") {
        try {
          params.messages = JSON.parse(messages);
        } catch (e) {
          console.error("Failed to parse messages JSON string:", e);
          // Optionally, handle the error, e.g., by falling back to prompt or returning an error result
        }
      } else if (prompt) {
        params.prompt = prompt;
      } else {
        return this.createErrorResult(
          "Either prompt or messages must be provided."
        );
      }

      const result = await context.env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as any,
        params,
        context.env.AI_OPTIONS
      );

      if (result instanceof ReadableStream) {
        const reader = result.getReader();
        const decoder = new TextDecoder();
        let streamedResponse = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamedResponse += decoder.decode(value);
        }
        return this.createSuccessResult({
          response: streamedResponse,
          usage: "",
        });
      } else {
        const typedResult = result as Llama3370BNonStreamedOutput;
        return this.createSuccessResult({
          response: typedResult.response,
        });
      }
    } catch (error) {
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
