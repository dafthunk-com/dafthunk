import type { NodeType, Parameter } from "@dafthunk/types";

/**
 * Hand-built node types for generator tests.
 *
 * Deliberately not the real registry: the unit test entry point avoids loading
 * `CloudflareNodeRegistry` (and the heavy wasm packages behind it), and a fixed
 * catalog keeps assertions about ranking and repair hints stable.
 */

function param(
  name: string,
  type: string,
  extra: Partial<Parameter> = {}
): Parameter {
  return { name, type, ...extra } as Parameter;
}

export const TEXT_INPUT: NodeType = {
  id: "text-input",
  name: "Text Input",
  type: "text-input",
  description: "Static text value supplied by the workflow author",
  tags: ["Input", "Text"],
  icon: "type",
  inputs: [param("value", "string", { required: true })],
  outputs: [param("value", "string")],
};

export const OUTPUT_TEXT: NodeType = {
  id: "output-text",
  name: "Text Output",
  type: "output-text",
  description: "Displays a text result",
  tags: ["Output", "Text"],
  icon: "file-text",
  inputs: [param("value", "string", { required: true })],
  outputs: [],
};

export const TO_STRING: NodeType = {
  id: "to-string",
  name: "To String",
  type: "to-string",
  description: "Converts any value to its string representation",
  tags: ["Text", "Convert"],
  icon: "type",
  inputs: [param("value", "any", { required: true })],
  outputs: [param("result", "string")],
};

export const JSON_INPUT: NodeType = {
  id: "json-input",
  name: "JSON Input",
  type: "json-input",
  description: "Static JSON value",
  tags: ["Input", "JSON"],
  icon: "braces",
  inputs: [param("value", "json", { required: true })],
  outputs: [param("value", "json")],
};

export const VAR_STRING_TEMPLATE: NodeType = {
  id: "var-string-template",
  name: "Var String Template",
  type: "var-string-template",
  description: "Builds a string from a template with numbered variables",
  tags: ["Text", "Template"],
  icon: "type",
  dynamicInputs: {
    prefix: "var",
    type: "string",
    defaultCount: 1,
    minCount: 1,
  },
  inputs: [
    param("template", "string", { required: true }),
    param("var_1", "string"),
  ],
  outputs: [param("result", "string")],
};

export const RECEIVE_EMAIL: NodeType = {
  id: "receive-email",
  name: "Receive Email",
  type: "receive-email",
  description: "Starts the workflow when an email arrives",
  tags: ["Email", "Trigger"],
  icon: "mail",
  trigger: true,
  inputs: [param("email", "email", { hidden: true })],
  outputs: [
    param("from", "string"),
    param("subject", "string"),
    param("body", "string"),
  ],
};

export const HTTP_REQUEST: NodeType = {
  id: "http-request",
  name: "HTTP Request",
  type: "http-request",
  description: "Starts the workflow from a synchronous HTTP request",
  tags: ["HTTP", "Trigger"],
  icon: "globe",
  trigger: true,
  inputs: [],
  outputs: [param("body", "json"), param("method", "string")],
};

export const HTTP_RESPONSE: NodeType = {
  id: "http-response",
  name: "HTTP Response",
  type: "http-response",
  description: "Returns the response to the HTTP caller",
  tags: ["HTTP", "Responder"],
  icon: "globe",
  responder: true,
  inputs: [param("body", "any", { required: true }), param("status", "number")],
  outputs: [],
};

export const RECEIVE_SCHEDULED: NodeType = {
  id: "receive-scheduled-trigger",
  name: "Scheduled Trigger",
  type: "receive-scheduled-trigger",
  description: "Starts the workflow on a schedule",
  tags: ["Scheduled", "Trigger"],
  icon: "clock",
  trigger: true,
  inputs: [param("scheduleExpression", "string")],
  outputs: [param("timestamp", "string")],
};

export const SEND_SLACK: NodeType = {
  id: "send-slack-message",
  name: "Send Slack Message",
  type: "send-slack-message",
  description: "Posts a message to a Slack channel",
  tags: ["Slack", "Social"],
  icon: "message-square",
  subscription: true,
  inputs: [
    param("integrationId", "integration", {
      required: true,
      hidden: true,
      provider: "slack",
    } as Partial<Parameter>),
    param("text", "string", { required: true }),
  ],
  outputs: [param("ok", "boolean")],
};

export const GEO_BUFFER: NodeType = {
  id: "geo-buffer",
  name: "Geo Buffer",
  type: "geo-buffer",
  description: "Buffers a geometry by a distance",
  tags: ["Geo", "GeoJSON"],
  icon: "map",
  inputs: [param("geojson", "geojson", { required: true })],
  outputs: [param("result", "geojson")],
};

/** A catalog wide enough for ranking tests to be meaningful. */
export const FIXTURE_NODE_TYPES: NodeType[] = [
  TEXT_INPUT,
  OUTPUT_TEXT,
  TO_STRING,
  JSON_INPUT,
  VAR_STRING_TEMPLATE,
  RECEIVE_EMAIL,
  HTTP_REQUEST,
  HTTP_RESPONSE,
  RECEIVE_SCHEDULED,
  SEND_SLACK,
  GEO_BUFFER,
];
