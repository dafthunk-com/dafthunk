import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import { ToMarkdownNode } from "./to-markdown-node";

describe("ToMarkdownNode", () => {
  const nodeId = "to-markdown";
  const node = new ToMarkdownNode({ nodeId } as unknown as Node);

  const createContext = (
    inputs: Record<string, unknown>,
    ai?: unknown
  ): NodeContext =>
    ({
      nodeId,
      inputs,
      env: { AI: ai, AI_OPTIONS: {} },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const document = {
    data: new Uint8Array(1000),
    mimeType: "application/pdf",
  };

  it("returns the converted markdown", async () => {
    const ai = {
      toMarkdown: vi
        .fn()
        .mockResolvedValue([{ format: "markdown", data: "# Title" }]),
    };

    const result = await node.execute(createContext({ document }, ai));

    expect(result.status).toBe("completed");
    expect(result.outputs?.markdown).toBe("# Title");
  });

  it("names the uploaded file by its MIME type", async () => {
    const ai = {
      toMarkdown: vi
        .fn()
        .mockResolvedValue([{ format: "markdown", data: "x" }]),
    };

    await node.execute(createContext({ document }, ai));

    expect(ai.toMarkdown.mock.calls[0][0][0].name).toBe("document.pdf");
  });

  it("charges a floor of ten credits for a small document", async () => {
    const ai = {
      toMarkdown: vi
        .fn()
        .mockResolvedValue([{ format: "markdown", data: "x" }]),
    };

    const result = await node.execute(createContext({ document }, ai));

    expect(result.usage).toBe(10);
  });

  it("scales usage with document size", async () => {
    const ai = {
      toMarkdown: vi
        .fn()
        .mockResolvedValue([{ format: "markdown", data: "x" }]),
    };

    const result = await node.execute(
      createContext(
        { document: { ...document, data: new Uint8Array(5_000_000) } },
        ai
      )
    );

    expect(result.usage).toBe(50);
  });

  it("errors when no document is provided", async () => {
    const result = await node.execute(
      createContext({}, { toMarkdown: vi.fn() })
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe("Document input is required but not provided");
  });

  it("errors when the AI binding is unavailable", async () => {
    const result = await node.execute(createContext({ document }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("AI service is not available");
  });

  it("errors when the conversion returns nothing", async () => {
    const ai = { toMarkdown: vi.fn().mockResolvedValue([]) };

    const result = await node.execute(createContext({ document }, ai));

    expect(result.status).toBe("error");
    expect(result.error).toBe("Failed to convert document to Markdown");
  });

  it("surfaces a conversion error from the AI service", async () => {
    const ai = {
      toMarkdown: vi
        .fn()
        .mockResolvedValue([{ format: "error", error: "unsupported format" }]),
    };

    const result = await node.execute(createContext({ document }, ai));

    expect(result.status).toBe("error");
    expect(result.error).toBe("unsupported format");
  });

  it("reports a thrown AI failure against this node", async () => {
    const ai = { toMarkdown: vi.fn().mockRejectedValue(new Error("boom")) };

    const result = await node.execute(createContext({ document }, ai));

    expect(result.status).toBe("error");
    expect(result.error).toBe("boom");
  });
});
