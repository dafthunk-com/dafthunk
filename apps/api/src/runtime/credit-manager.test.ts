import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import type { Bindings } from "../context";
import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CreditManager } from "./credit-manager";

// Mock the credits utility
vi.mock("../utils/credits", () => ({
  getOrganizationComputeUsage: vi.fn(),
}));

import { getOrganizationComputeUsage } from "../utils/credits";

describe("CreditManager", () => {
  const createMockEnv = (cloudflareEnv?: string): Bindings => {
    return {
      CLOUDFLARE_ENV: cloudflareEnv,
      KV: {} as any,
    } as Bindings;
  };

  const createMockRegistry = (
    nodeTypes: Record<string, { computeCost?: number }>
  ): CloudflareNodeRegistry => {
    return {
      getNodeType: vi.fn((type: string) => nodeTypes[type] || {}),
    } as any;
  };

  describe("hasEnoughComputeCredits", () => {
    it("should always return true in development mode", async () => {
      const env = createMockEnv("development");
      const registry = createMockRegistry({});
      const manager = new CreditManager(env, registry);

      const result = await manager.hasEnoughComputeCredits(
        "org-123",
        100, // computeCredits
        200 // computeCost (exceeds credits)
      );

      expect(result).toBe(true);
      expect(getOrganizationComputeUsage).not.toHaveBeenCalled();
    });

    it("should return true when credits are sufficient", async () => {
      const env = createMockEnv("production");
      const registry = createMockRegistry({});
      const manager = new CreditManager(env, registry);

      vi.mocked(getOrganizationComputeUsage).mockResolvedValue(50); // current usage

      const result = await manager.hasEnoughComputeCredits(
        "org-123",
        100, // total credits
        30 // additional cost needed
      );

      expect(result).toBe(true); // 50 + 30 = 80 <= 100
    });

    it("should return false when credits are insufficient", async () => {
      const env = createMockEnv("production");
      const registry = createMockRegistry({});
      const manager = new CreditManager(env, registry);

      vi.mocked(getOrganizationComputeUsage).mockResolvedValue(80); // current usage

      const result = await manager.hasEnoughComputeCredits(
        "org-123",
        100, // total credits
        30 // additional cost needed
      );

      expect(result).toBe(false); // 80 + 30 = 110 > 100
    });

    it("should return true when exactly at credit limit", async () => {
      const env = createMockEnv("production");
      const registry = createMockRegistry({});
      const manager = new CreditManager(env, registry);

      vi.mocked(getOrganizationComputeUsage).mockResolvedValue(70); // current usage

      const result = await manager.hasEnoughComputeCredits(
        "org-123",
        100, // total credits
        30 // additional cost needed
      );

      expect(result).toBe(true); // 70 + 30 = 100 == 100
    });

    it("should handle zero current usage", async () => {
      const env = createMockEnv("production");
      const registry = createMockRegistry({});
      const manager = new CreditManager(env, registry);

      vi.mocked(getOrganizationComputeUsage).mockResolvedValue(0);

      const result = await manager.hasEnoughComputeCredits("org-123", 100, 50);

      expect(result).toBe(true); // 0 + 50 = 50 <= 100
    });
  });

  describe("getNodesComputeCost", () => {
    it("should calculate total cost for multiple nodes", () => {
      const registry = createMockRegistry({
        text: { computeCost: 1 },
        ai: { computeCost: 10 },
        image: { computeCost: 5 },
      });
      const manager = new CreditManager({} as Bindings, registry);

      const nodes: Node[] = [
        { id: "A", type: "text", inputs: [], outputs: [] },
        { id: "B", type: "ai", inputs: [], outputs: [] },
        { id: "C", type: "image", inputs: [], outputs: [] },
      ] as unknown as Node[];

      const result = manager.getNodesComputeCost(nodes);

      expect(result).toBe(16); // 1 + 10 + 5
    });

    it("should use default cost of 1 when computeCost not specified", () => {
      const registry = createMockRegistry({
        text: {}, // no computeCost specified
        unknown: {}, // no computeCost specified
      });
      const manager = new CreditManager({} as Bindings, registry);

      const nodes: Node[] = [
        { id: "A", type: "text", inputs: [], outputs: [] },
        { id: "B", type: "unknown", inputs: [], outputs: [] },
      ] as unknown as Node[];

      const result = manager.getNodesComputeCost(nodes);

      expect(result).toBe(2); // 1 + 1 (defaults)
    });

    it("should handle empty node list", () => {
      const registry = createMockRegistry({});
      const manager = new CreditManager({} as Bindings, registry);

      const result = manager.getNodesComputeCost([]);

      expect(result).toBe(0);
    });

    it("should handle nodes with zero cost", () => {
      const registry = createMockRegistry({
        free: { computeCost: 0 },
      });
      const manager = new CreditManager({} as Bindings, registry);

      const nodes: Node[] = [
        { id: "A", type: "free", inputs: [], outputs: [] },
        { id: "B", type: "free", inputs: [], outputs: [] },
      ] as unknown as Node[];

      const result = manager.getNodesComputeCost(nodes);

      expect(result).toBe(0);
    });

    it("should handle single node", () => {
      const registry = createMockRegistry({
        expensive: { computeCost: 100 },
      });
      const manager = new CreditManager({} as Bindings, registry);

      const nodes: Node[] = [
        { id: "A", type: "expensive", inputs: [], outputs: [] },
      ] as unknown as Node[];

      const result = manager.getNodesComputeCost(nodes);

      expect(result).toBe(100);
    });

    it("should sum costs correctly for many nodes", () => {
      const registry = createMockRegistry({
        type1: { computeCost: 3 },
        type2: { computeCost: 7 },
      });
      const manager = new CreditManager({} as Bindings, registry);

      const nodes: Node[] = Array.from({ length: 10 }, (_, i) => ({
        id: `node-${i}`,
        type: i % 2 === 0 ? "type1" : "type2",
        inputs: [],
        outputs: [],
      })) as unknown as Node[];

      const result = manager.getNodesComputeCost(nodes);

      // 5 nodes of type1 (3 each) + 5 nodes of type2 (7 each) = 15 + 35 = 50
      expect(result).toBe(50);
    });
  });
});
