import { describe, expect, it } from "vitest";

import { emailReplyTemplate } from "./email-reply";

describe("Email Reply Template", () => {
  it("should have valid structure", () => {
    expect(emailReplyTemplate.nodes).toHaveLength(4);
    expect(emailReplyTemplate.edges).toHaveLength(5);

    const nodeIds = new Set(emailReplyTemplate.nodes.map((n) => n.id));
    for (const edge of emailReplyTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct node types defined", () => {
    const nodeTypes = emailReplyTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("receive-email");
    expect(nodeTypes).toContain("parse-email");
    expect(nodeTypes).toContain("dataset-ai-search");
    expect(nodeTypes).toContain("send-email");
  });

  it("should have correct edge connections", () => {
    const edges = emailReplyTemplate.edges;

    // receive-email -> parse-email
    expect(edges).toContainEqual({
      source: "receive-email",
      target: "parse-email",
      sourceOutput: "raw",
      targetInput: "raw",
    });

    // receive-email -> send-reply (from address directly to recipient)
    expect(edges).toContainEqual({
      source: "receive-email",
      target: "send-reply",
      sourceOutput: "from",
      targetInput: "to",
    });

    // parse-email -> rag-search (body text as query)
    expect(edges).toContainEqual({
      source: "parse-email",
      target: "rag-search",
      sourceOutput: "text",
      targetInput: "query",
    });

    // parse-email -> send-reply (subject)
    expect(edges).toContainEqual({
      source: "parse-email",
      target: "send-reply",
      sourceOutput: "subject",
      targetInput: "subject",
    });

    // rag-search -> send-reply (response as text body)
    expect(edges).toContainEqual({
      source: "rag-search",
      target: "send-reply",
      sourceOutput: "response",
      targetInput: "text",
    });
  });

  it("should be an email_message triggered workflow", () => {
    expect(emailReplyTemplate.trigger).toBe("email_message");
  });
});
