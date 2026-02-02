import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { SvgToPngNode } from "./svg-to-png-node";

describe("SvgToPngNode", () => {
  const simpleSvg =
    '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="red"/></svg>';
  const simpleSvgImage = {
    data: new TextEncoder().encode(simpleSvg),
    mimeType: "image/svg+xml",
  };

  it("should render simple SVG to PNG", async () => {
    const nodeId = "svg-to-png";
    const node = new SvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvgImage,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.image).toBeDefined();
    expect(result.outputs?.image.mimeType).toBe("image/png");
    expect(result.outputs?.image.data).toBeInstanceOf(Uint8Array);
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);
  });

  it("should handle width and height parameters", async () => {
    const nodeId = "svg-to-png";
    const node = new SvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvgImage,
        width: 200,
        height: 150,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.image).toBeDefined();
  });

  it("should handle scale parameter", async () => {
    const nodeId = "svg-to-png";
    const node = new SvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvgImage,
        scale: 2.0,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.image).toBeDefined();
  });

  it("should handle background color parameter", async () => {
    const nodeId = "svg-to-png";
    const node = new SvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvgImage,
        backgroundColor: "white",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.image).toBeDefined();
  });

  it("should fail with invalid SVG input", async () => {
    const nodeId = "svg-to-png";
    const node = new SvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: null,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("SVG image input is required");
  });

  it("should fail with invalid width", async () => {
    const nodeId = "svg-to-png";
    const node = new SvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvgImage,
        width: -10,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Width must be between 1 and 8192");
  });

  it("should fail with invalid height", async () => {
    const nodeId = "svg-to-png";
    const node = new SvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvgImage,
        height: 10000,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Height must be between 1 and 8192");
  });

  it("should fail with invalid scale", async () => {
    const nodeId = "svg-to-png";
    const node = new SvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvgImage,
        scale: 15,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Scale must be between 0.1 and 10");
  });

  it("should fail with non-SVG image input", async () => {
    const nodeId = "svg-to-png";
    const node = new SvgToPngNode({
      nodeId,
    } as unknown as Node);

    const nonSvgImage = {
      data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), // PNG header
      mimeType: "image/png",
    };

    const context = {
      nodeId,
      inputs: {
        svg: nonSvgImage,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Input must be SVG content");
  });
});
