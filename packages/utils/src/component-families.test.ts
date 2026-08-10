import type { NodeType, Parameter } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  COMPONENT_FAMILIES,
  type ComponentFamilyId,
  deriveFamilyCapabilities,
  RESOURCE_FAMILY_NOUNS,
} from "./component-families";

function input(name: string, type: Parameter["type"]): Parameter {
  return { name, type } as Parameter;
}

function nodeType(overrides: Partial<NodeType> & { type: string }): NodeType {
  return {
    id: overrides.type,
    name: overrides.type,
    tags: [],
    icon: "",
    inputs: [],
    outputs: [],
    ...overrides,
  };
}

const REGISTRY: NodeType[] = [
  nodeType({
    type: "dataset-ai-search",
    inputs: [input("dataset", "dataset"), input("query", "string")],
  }),
  nodeType({
    type: "database-query",
    inputs: [input("database", "database"), input("sql", "string")],
  }),
  nodeType({
    type: "send-queue-message",
    inputs: [input("queue", "queue"), input("payload", "json")],
  }),
  nodeType({
    type: "queue-message",
    trigger: true,
    inputs: [input("queue", "queue")],
  }),
  nodeType({
    type: "receive-email",
    trigger: true,
    inputs: [input("email", "email")],
  }),
  nodeType({
    type: "bot-send-message-discord",
    inputs: [input("discord", "discord"), input("message", "string")],
  }),
  nodeType({ type: "string-concat", inputs: [input("a", "string")] }),
];

describe("COMPONENT_FAMILIES", () => {
  it("describes every family with a non-empty purpose and noun", () => {
    for (const family of Object.values(COMPONENT_FAMILIES)) {
      expect(family.purpose.length).toBeGreaterThan(0);
      expect(family.noun.length).toBeGreaterThan(0);
    }
  });

  it("marks exactly the creatable families", () => {
    const creatable = Object.values(COMPONENT_FAMILIES)
      .filter((family) => family.creatable)
      .map((family) => family.id)
      .sort();
    expect(creatable).toEqual([
      "database",
      "dataset",
      "email",
      "queue",
      "schema",
    ]);
  });

  it("names a noun for every groundable resource family", () => {
    for (const noun of Object.values(RESOURCE_FAMILY_NOUNS)) {
      expect(noun.length).toBeGreaterThan(0);
    }
  });
});

describe("deriveFamilyCapabilities", () => {
  const capabilities = (id: ComponentFamilyId) =>
    deriveFamilyCapabilities(COMPONENT_FAMILIES[id], REGISTRY);

  it("finds the non-trigger nodes consuming a family", () => {
    expect(
      capabilities("dataset").consumers.map((entry) => entry.type)
    ).toEqual(["dataset-ai-search"]);
    expect(
      capabilities("database").consumers.map((entry) => entry.type)
    ).toEqual(["database-query"]);
  });

  it("excludes trigger nodes from consumers but reports their trigger kinds", () => {
    const queue = capabilities("queue");
    expect(queue.consumers.map((entry) => entry.type)).toEqual([
      "send-queue-message",
    ]);
    expect(queue.triggerKinds).toEqual(["queue_message"]);

    expect(capabilities("email").triggerKinds).toEqual(["email_message"]);
  });

  it("covers all providers for the bot family", () => {
    expect(capabilities("bot").consumers.map((entry) => entry.type)).toEqual([
      "bot-send-message-discord",
    ]);
  });

  it("yields nothing for platform families, which are not referenced by id", () => {
    expect(capabilities("node")).toEqual({ consumers: [], triggerKinds: [] });
    expect(capabilities("ai-model")).toEqual({
      consumers: [],
      triggerKinds: [],
    });
  });
});
