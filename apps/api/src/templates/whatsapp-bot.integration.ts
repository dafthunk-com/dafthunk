import { describe, expect, it } from "vitest";

import { whatsappBotTemplate } from "./whatsapp-bot";

describe("WhatsApp Bot Template", () => {
  it("should have valid structure", () => {
    expect(whatsappBotTemplate.nodes).toHaveLength(3);
    expect(whatsappBotTemplate.edges).toHaveLength(4);

    const nodeIds = new Set(whatsappBotTemplate.nodes.map((n) => n.id));
    for (const edge of whatsappBotTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct node types", () => {
    const nodeTypes = whatsappBotTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("receive-whatsapp-message");
    expect(nodeTypes).toContain("agent-claude-sonnet-4");
    expect(nodeTypes).toContain("send-message-whatsapp");
  });

  it("should have correct edge connections", () => {
    const edges = whatsappBotTemplate.edges;

    expect(edges).toContainEqual({
      source: "trigger",
      target: "agent",
      sourceOutput: "content",
      targetInput: "input",
    });

    expect(edges).toContainEqual({
      source: "trigger",
      target: "agent",
      sourceOutput: "from",
      targetInput: "agent_id",
    });

    expect(edges).toContainEqual({
      source: "trigger",
      target: "send-reply",
      sourceOutput: "from",
      targetInput: "to",
    });

    expect(edges).toContainEqual({
      source: "agent",
      target: "send-reply",
      sourceOutput: "text",
      targetInput: "text",
    });
  });

  it("should be a whatsapp_event triggered workflow", () => {
    expect(whatsappBotTemplate.trigger).toBe("whatsapp_event");
  });
});
