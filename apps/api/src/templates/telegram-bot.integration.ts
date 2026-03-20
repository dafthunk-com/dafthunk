import { describe, expect, it } from "vitest";

import { telegramBotTemplate } from "./telegram-bot";

describe("Telegram Bot Template", () => {
  it("should have valid structure", () => {
    expect(telegramBotTemplate.nodes).toHaveLength(3);
    expect(telegramBotTemplate.edges).toHaveLength(4);

    const nodeIds = new Set(telegramBotTemplate.nodes.map((n) => n.id));
    for (const edge of telegramBotTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct node types", () => {
    const nodeTypes = telegramBotTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("receive-telegram-message");
    expect(nodeTypes).toContain("agent-claude-sonnet-4");
    expect(nodeTypes).toContain("send-message-telegram");
  });

  it("should have correct edge connections", () => {
    const edges = telegramBotTemplate.edges;

    expect(edges).toContainEqual({
      source: "trigger",
      target: "agent",
      sourceOutput: "content",
      targetInput: "input",
    });

    expect(edges).toContainEqual({
      source: "trigger",
      target: "agent",
      sourceOutput: "chatId",
      targetInput: "agent_id",
    });

    expect(edges).toContainEqual({
      source: "trigger",
      target: "send-reply",
      sourceOutput: "chatId",
      targetInput: "chatId",
    });

    expect(edges).toContainEqual({
      source: "agent",
      target: "send-reply",
      sourceOutput: "text",
      targetInput: "text",
    });
  });

  it("should be a telegram_event triggered workflow", () => {
    expect(telegramBotTemplate.trigger).toBe("telegram_event");
  });
});
