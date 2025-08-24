import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { NowDateNode } from "./now-date-node";

describe("NowDateNode", () => {
  const nodeId = "date-now";
  const node = new NowDateNode({
    nodeId,
  } as unknown as Node);

  const createContext = (inputs: Record<string, any> = {}): NodeContext =>
    ({
      nodeId: "test",
      inputs,
      workflowId: "test",
      organizationId: "test-org",
      env: {},
    }) as unknown as NodeContext;

  describe("execute", () => {
    it("should return current date in ISO format", async () => {
      const before = new Date();
      const result = await node.execute(createContext());
      const after = new Date();

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBeDefined();
      expect(typeof result.outputs?.date).toBe("string");

      const resultDate = new Date(result.outputs?.date as string);
      expect(resultDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(resultDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should return valid ISO string", async () => {
      const result = await node.execute(createContext());

      expect(result.status).toBe("completed");
      const isoString = result.outputs?.date as string;
      expect(isoString).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it("should handle empty inputs", async () => {
      const result = await node.execute(createContext({}));

      expect(result.status).toBe("completed");
      expect(result.outputs?.date).toBeDefined();
    });
  });
});
