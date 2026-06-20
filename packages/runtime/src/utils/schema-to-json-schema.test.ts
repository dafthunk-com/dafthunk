import type { Schema } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { schemaToJsonSchema } from "./schema-to-json-schema";

describe("schemaToJsonSchema", () => {
  it("maps primitive fields to a JSON Schema object", () => {
    const schema: Schema = {
      name: "person",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "age", type: "integer" },
        { name: "born", type: "datetime" },
      ],
    };

    expect(schemaToJsonSchema(schema)).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
        born: { type: "string", format: "date-time" },
      },
      required: ["name"],
      additionalProperties: false,
    });
  });

  it("throws when a schema contains a blob field", () => {
    const schema: Schema = {
      name: "upload",
      fields: [
        { name: "caption", type: "string" },
        { name: "photo", type: "image" },
      ],
    };

    expect(() => schemaToJsonSchema(schema)).toThrow(/photo/);
    expect(() => schemaToJsonSchema(schema)).toThrow(/structured output/);
  });
});
