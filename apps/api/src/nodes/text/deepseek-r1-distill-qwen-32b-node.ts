import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * DeepSeek R1 Distill Qwen 32B Node implementation with comprehensive parameters
 */

interface DeepseekNonStreamedOutput {
  response?: string;
  usage?: any;
}

export class DeepseekR1DistillQwen32BNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "deepseek-r1-distill-qwen-32b",
    name: "deepseek-r1-distill-qwen-32b",
    type: "deepseek-r1-distill-qwen-32b",
    description: "Generates text using DeepSeek R1 Distill Qwen 32B model",
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
        name: "messages",
        type: "string",
        description: "JSON string of conversation messages",
        required: false,
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
      {
        name: "stream",
        type: "number",
        description: "Whether to stream the response",
        hidden: true,
        value: 0,
      },
    ],
    outputs: [
      {
        name: "response",
        type: "string",
        description: "Generated text response",
      },
      {
        name: "usage",
        type: "string",
        hidden: true,
        description: "Token usage statistics",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
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

      if (result instanceof ReadableStream) {
        // Handle stream response
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
          usage: "", // Usage info might not be available for streams or needs different handling
        });
      } else {
        // Handle non-stream response
        const typedResult = result as DeepseekNonStreamedOutput;
        return this.createSuccessResult({
          response: typedResult.response,
          usage: typedResult.usage ? JSON.stringify(typedResult.usage) : "",
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
