import type { WorkflowTemplate } from "@dafthunk/types";

import { HttpRequestNode } from "../nodes/http/http-request-node";
import { HttpResponseNode } from "../nodes/http/http-response-node";

export const httpEchoTemplate: WorkflowTemplate = {
  id: "http-echo",
  name: "HTTP Echo",
  description: "Echo the request body back in the response",
  icon: "repeat",
  type: "http_request",
  tags: ["http", "demo", "api"],
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
