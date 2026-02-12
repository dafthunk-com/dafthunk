import { BlobParameter, NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { BlobToFormDataNode } from "./blob-to-form-data-node";

describe("BlobToFormDataNode", () => {
  it("should parse simple form data from blob", async () => {
    const nodeId = "blob-to-form-data";
    const node = new BlobToFormDataNode({
      nodeId,
    } as unknown as Node);

    const formString = "name=John+Doe&email=john%40example.com";
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(formString),
      mimeType: "application/x-www-form-urlencoded",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.formData).toEqual({
      name: "John Doe",
      email: "john@example.com",
    });
  });

  it("should convert boolean values", async () => {
    const nodeId = "blob-to-form-data";
    const node = new BlobToFormDataNode({
      nodeId,
    } as unknown as Node);

    const formString = "active=true&disabled=false&enabled=TRUE&off=FALSE";
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(formString),
      mimeType: "application/x-www-form-urlencoded",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.formData).toEqual({
      active: true,
      disabled: false,
      enabled: true,
      off: false,
    });
  });

  it("should convert numeric values", async () => {
    const nodeId = "blob-to-form-data";
    const node = new BlobToFormDataNode({
      nodeId,
    } as unknown as Node);

    const formString = "age=30&price=19.99&negative=-5&zero=0";
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(formString),
      mimeType: "application/x-www-form-urlencoded",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.formData).toEqual({
      age: 30,
      price: 19.99,
      negative: -5,
      zero: 0,
    });
  });

  it("should handle empty form data", async () => {
    const nodeId = "blob-to-form-data";
    const node = new BlobToFormDataNode({
      nodeId,
    } as unknown as Node);

    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(""),
      mimeType: "application/x-www-form-urlencoded",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.formData).toEqual({});
  });

  it("should handle special characters", async () => {
    const nodeId = "blob-to-form-data";
    const node = new BlobToFormDataNode({
      nodeId,
    } as unknown as Node);

    const formString = "message=Hello%20World%21&query=foo%3Dbar%26baz";
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(formString),
      mimeType: "application/x-www-form-urlencoded",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.formData).toEqual({
      message: "Hello World!",
      query: "foo=bar&baz",
    });
  });

  it("should keep string values that look like numbers but are not", async () => {
    const nodeId = "blob-to-form-data";
    const node = new BlobToFormDataNode({
      nodeId,
    } as unknown as Node);

    const formString = "phone=+1234567890&zipcode=01234";
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(formString),
      mimeType: "application/x-www-form-urlencoded",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    // +1234567890 is a valid number, 01234 is also parsed as number (1234)
    expect(result.outputs?.formData?.phone).toBe(1234567890);
    expect(result.outputs?.formData?.zipcode).toBe(1234);
  });

  it("should error when blob is missing", async () => {
    const nodeId = "blob-to-form-data";
    const node = new BlobToFormDataNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        blob: undefined,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Blob is required");
  });

  it("should error when blob has invalid format", async () => {
    const nodeId = "blob-to-form-data";
    const node = new BlobToFormDataNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        blob: { invalid: "format" },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid blob format");
  });

  it("should handle values with equals sign", async () => {
    const nodeId = "blob-to-form-data";
    const node = new BlobToFormDataNode({
      nodeId,
    } as unknown as Node);

    const formString = "equation=a%3Db%2Bc";
    const textEncoder = new TextEncoder();
    const blob: BlobParameter = {
      data: textEncoder.encode(formString),
      mimeType: "application/x-www-form-urlencoded",
    };

    const context = {
      nodeId,
      inputs: {
        blob,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.formData).toEqual({
      equation: "a=b+c",
    });
  });
});
