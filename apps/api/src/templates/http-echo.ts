import { HttpRequestNode } from "@dafthunk/runtime/nodes/http/http-request-node";
import { HttpResponseNode } from "@dafthunk/runtime/nodes/http/http-response-node";
import type { WorkflowTemplate } from "@dafthunk/types";

export const httpEchoTemplate: WorkflowTemplate = {
  id: "http-echo",
  name: "HTTP Echo",
  description: "Echo the request body back in the response",
  icon: "repeat",
  trigger: "http_request",
  tags: ["api"],
  nodes: [
    HttpRequestNode.create({
      id: "request",
      name: "HTTP Request",
      position: { x: 100, y: 200 },
    }),
    HttpResponseNode.create({
      id: "response",
      name: "HTTP Response",
      position: { x: 500, y: 200 },
      inputs: {
        statusCode: 200,
      },
    }),
  ],
  edges: [
    {
      source: "request",
      target: "response",
      sourceOutput: "body",
      targetInput: "body",
    },
  ],
};
