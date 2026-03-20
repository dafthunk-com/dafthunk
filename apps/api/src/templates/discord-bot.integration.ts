import { describe, expect, it } from "vitest";

import { discordBotTemplate } from "./discord-bot";

describe("Discord Bot Template", () => {
  it("should have valid structure", () => {
    expect(discordBotTemplate.nodes).toHaveLength(3);
    expect(discordBotTemplate.edges).toHaveLength(6);

    const nodeIds = new Set(discordBotTemplate.nodes.map((n) => n.id));
    for (const edge of discordBotTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct node types", () => {
    const nodeTypes = discordBotTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("receive-discord-message");
    expect(nodeTypes).toContain("agent-claude-sonnet-4");
    expect(nodeTypes).toContain("bot-send-message-discord");
  });

  it("should have correct edge connections", () => {
    const edges = discordBotTemplate.edges;

    expect(edges).toContainEqual({
      source: "trigger",
      target: "agent",
      sourceOutput: "content",
      targetInput: "input",
    });

    expect(edges).toContainEqual({
      source: "trigger",
      target: "agent",
      sourceOutput: "channelId",
      targetInput: "agent_id",
    });

    expect(edges).toContainEqual({
      source: "trigger",
      target: "send-reply",
      sourceOutput: "channelId",
      targetInput: "channelId",
    });

    expect(edges).toContainEqual({
      source: "trigger",
      target: "send-reply",
      sourceOutput: "interactionToken",
      targetInput: "interactionToken",
    });

    expect(edges).toContainEqual({
      source: "trigger",
      target: "send-reply",
      sourceOutput: "applicationId",
      targetInput: "applicationId",
    });

    expect(edges).toContainEqual({
      source: "agent",
      target: "send-reply",
      sourceOutput: "text",
      targetInput: "content",
    });
  });

  it("should be a discord_event triggered workflow", () => {
    expect(discordBotTemplate.trigger).toBe("discord_event");
  });
});
