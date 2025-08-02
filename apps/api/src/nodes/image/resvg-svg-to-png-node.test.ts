import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { ResvgSvgToPngNode } from "./resvg-svg-to-png-node";

describe("ResvgSvgToPngNode", () => {
  const simpleSvg = '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="red"/></svg>';

  it("should render simple SVG to PNG", async () => {
    const nodeId = "resvg-svg-to-png";
    const node = new ResvgSvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvg,
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
    const nodeId = "resvg-svg-to-png";
    const node = new ResvgSvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvg,
        width: 200,
        height: 150,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.image).toBeDefined();
  });

  it("should handle scale parameter", async () => {
    const nodeId = "resvg-svg-to-png";
    const node = new ResvgSvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvg,
        scale: 2.0,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.image).toBeDefined();
  });

  it("should handle background color parameter", async () => {
    const nodeId = "resvg-svg-to-png";
    const node = new ResvgSvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvg,
        backgroundColor: "white",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.image).toBeDefined();
  });

  it("should fail with invalid SVG input", async () => {
    const nodeId = "resvg-svg-to-png";
    const node = new ResvgSvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: null,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("SVG content is required");
  });

  it("should fail with invalid width", async () => {
    const nodeId = "resvg-svg-to-png";
    const node = new ResvgSvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvg,
        width: -10,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Width must be between 1 and 8192");
  });

  it("should fail with invalid height", async () => {
    const nodeId = "resvg-svg-to-png";
    const node = new ResvgSvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvg,
        height: 10000,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Height must be between 1 and 8192");
  });

  it("should fail with invalid scale", async () => {
    const nodeId = "resvg-svg-to-png";
    const node = new ResvgSvgToPngNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        svg: simpleSvg,
        scale: 15,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Scale must be between 0.1 and 10");
  });
}); 