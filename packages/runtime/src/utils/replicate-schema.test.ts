import { describe, expect, it } from "vitest";
import { mapReplicateSchema } from "./replicate-schema";

describe("mapReplicateSchema", () => {
  it("maps a typical image generation model (SDXL-like)", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            required: ["prompt"],
            properties: {
              prompt: {
                type: "string",
                description: "Text prompt for image generation",
                "x-order": 0,
              },
              negative_prompt: {
                type: "string",
                description: "What to exclude",
                default: "",
                "x-order": 1,
              },
              width: {
                type: "integer",
                description: "Output width",
                default: 1024,
                "x-order": 2,
              },
              height: {
                type: "integer",
                description: "Output height",
                default: 1024,
                "x-order": 3,
              },
              num_inference_steps: {
                type: "integer",
                description: "Number of denoising steps",
                default: 25,
                "x-order": 4,
              },
              guidance_scale: {
                type: "number",
                description: "Guidance scale",
                default: 7.5,
                "x-order": 5,
              },
              seed: {
                type: "integer",
                description: "Random seed",
                "x-order": 6,
              },
            },
          },
          Output: {
            type: "array",
            items: { type: "string", format: "uri" },
            description: "Generated images",
          },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    // Prompt should be required and visible
    expect(result.inputs[0]).toMatchObject({
      name: "prompt",
      type: "string",
      required: true,
      hidden: false,
    });

    // negative_prompt has default → hidden
    expect(result.inputs[1]).toMatchObject({
      name: "negative_prompt",
      type: "string",
      hidden: true,
      value: "",
    });

    // width/height are integers → mapped to number
    expect(result.inputs[2]).toMatchObject({
      name: "width",
      type: "number",
      value: 1024,
      hidden: true,
    });

    // seed has no default but is optional → hidden, not required
    expect(result.inputs[6]).toMatchObject({
      name: "seed",
      type: "number",
      required: false,
      hidden: true,
    });

    // Output: array of URIs → image (from description "images")
    expect(result.outputs[0]).toMatchObject({
      name: "output",
      type: "image",
    });
  });

  it("maps URI string inputs to blob types using name heuristics", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            required: ["image"],
            properties: {
              image: {
                type: "string",
                format: "uri",
                description: "Input image to process",
                "x-order": 0,
              },
              audio_file: {
                type: "string",
                format: "uri",
                description: "Audio file to use",
                "x-order": 1,
              },
              video_clip: {
                type: "string",
                format: "uri",
                description: "Input video clip",
                "x-order": 2,
              },
              reference_file: {
                type: "string",
                format: "uri",
                description: "A reference file",
                "x-order": 3,
              },
            },
          },
          Output: {
            type: "string",
            format: "uri",
          },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.inputs[0]).toMatchObject({
      name: "image",
      type: "image",
      required: true,
    });
    expect(result.inputs[1]).toMatchObject({
      name: "audio_file",
      type: "audio",
    });
    expect(result.inputs[2]).toMatchObject({
      name: "video_clip",
      type: "video",
    });
    // "reference_file" has no blob keyword → falls back to blob
    expect(result.inputs[3]).toMatchObject({
      name: "reference_file",
      type: "blob",
    });

    // Output URI without type keywords → blob
    expect(result.outputs[0]).toMatchObject({
      name: "output",
      type: "blob",
    });
  });

  it("maps enum strings with default values", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            properties: {
              scheduler: {
                type: "string",
                enum: ["DDIM", "K_EULER", "DPMSolverMultistep"],
                default: "K_EULER",
                description: "Scheduler to use",
                "x-order": 0,
              },
            },
          },
          Output: { type: "string" },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.inputs[0]).toMatchObject({
      name: "scheduler",
      type: "string",
      value: "K_EULER",
      hidden: true,
    });
    expect(result.inputs[0].description).toContain("DDIM");
    expect(result.inputs[0].description).toContain("DPMSolverMultistep");
  });

  it("maps boolean inputs", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            properties: {
              disable_safety_checker: {
                type: "boolean",
                default: false,
                description: "Disable safety checker",
                "x-order": 0,
              },
            },
          },
          Output: { type: "string" },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.inputs[0]).toMatchObject({
      name: "disable_safety_checker",
      type: "boolean",
      value: false,
      hidden: true,
    });
  });

  it("sorts inputs by x-order", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            properties: {
              c_param: { type: "string", "x-order": 2 },
              a_param: { type: "string", "x-order": 0 },
              b_param: { type: "string", "x-order": 1 },
            },
          },
          Output: { type: "string" },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.inputs.map((i) => i.name)).toEqual([
      "a_param",
      "b_param",
      "c_param",
    ]);
  });

  it("falls back to alphabetical order when x-order is missing", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            properties: {
              zebra: { type: "string" },
              alpha: { type: "string" },
              middle: { type: "string" },
            },
          },
          Output: { type: "string" },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.inputs.map((i) => i.name)).toEqual([
      "alpha",
      "middle",
      "zebra",
    ]);
  });

  it("handles allOf references", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            properties: {
              scheduler: {
                allOf: [
                  {
                    type: "string",
                    enum: ["DDIM", "K_EULER"],
                  },
                ],
                description: "Noise scheduler",
                default: "DDIM",
                "x-order": 0,
              },
            },
          },
          Output: { type: "string" },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.inputs[0]).toMatchObject({
      name: "scheduler",
      type: "string",
      value: "DDIM",
    });
  });

  it("resolves $ref output schema to the named definition (Replicate trellis2 pattern)", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            required: ["image"],
            properties: {
              image: { type: "string", format: "uri", "x-order": 0 },
            },
          },
          // Output is a $ref to PredictOutput defined elsewhere in components.schemas
          Output: { $ref: "#/components/schemas/PredictOutput" },
          PredictOutput: {
            type: "object",
            properties: {
              model_file: { type: "string", format: "uri" },
              video: { type: "string", format: "uri" },
              no_background_image: { type: "string", format: "uri" },
            },
          },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.outputs).toHaveLength(3);
    expect(result.outputs[0]).toMatchObject({
      name: "model_file",
      type: "blob",
    });
    expect(result.outputs[1]).toMatchObject({ name: "video", type: "video" });
    expect(result.outputs[2]).toMatchObject({
      name: "no_background_image",
      type: "image",
    });
  });

  it("resolves nullable anyOf output wrapper to underlying type (Replicate pattern)", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            properties: { prompt: { type: "string", "x-order": 0 } },
          },
          // Replicate wraps nullable outputs: { anyOf: [{ type: "null" }, { ...actual }] }
          Output: {
            anyOf: [
              { type: "null" },
              { type: "string", format: "uri", description: "Generated image" },
            ],
          },
        },
      },
    };

    const result = mapReplicateSchema(schema, "A text-to-image model");

    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]).toMatchObject({ name: "output", type: "image" });
  });

  it("resolves nullable anyOf object output with named URI properties (Trellis 2 real schema pattern)", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            required: ["image"],
            properties: {
              image: { type: "string", format: "uri", "x-order": 0 },
            },
          },
          Output: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                properties: {
                  model_file: {
                    anyOf: [
                      { type: "null" },
                      {
                        type: "string",
                        format: "uri",
                        description: "3D model",
                      },
                    ],
                  },
                  video: {
                    anyOf: [
                      { type: "null" },
                      {
                        type: "string",
                        format: "uri",
                        description: "Video preview",
                      },
                    ],
                  },
                  no_background_image: {
                    anyOf: [
                      { type: "null" },
                      {
                        type: "string",
                        format: "uri",
                        description: "Background removed",
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.outputs).toHaveLength(3);
    expect(result.outputs[0]).toMatchObject({
      name: "model_file",
      type: "blob",
    });
    expect(result.outputs[1]).toMatchObject({ name: "video", type: "video" });
    expect(result.outputs[2]).toMatchObject({
      name: "no_background_image",
      type: "image",
    });
  });

  it("maps object outputs with named URI properties to multiple named outputs (Trellis 2 pattern)", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            required: ["image"],
            properties: {
              image: { type: "string", format: "uri", "x-order": 0 },
            },
          },
          Output: {
            type: "object",
            properties: {
              model_file: {
                type: "string",
                format: "uri",
                description: "Generated 3D model",
              },
              video: {
                type: "string",
                format: "uri",
                description: "Video preview",
              },
              no_background_image: {
                type: "string",
                format: "uri",
                description: "Image with background removed",
              },
            },
          },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.outputs).toHaveLength(3);
    // "model_file" has no blob keyword → blob
    expect(result.outputs[0]).toMatchObject({
      name: "model_file",
      type: "blob",
    });
    // "video" → video
    expect(result.outputs[1]).toMatchObject({ name: "video", type: "video" });
    // "no_background_image" → image
    expect(result.outputs[2]).toMatchObject({
      name: "no_background_image",
      type: "image",
    });
  });

  it("handles object and json outputs", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            properties: {
              text: { type: "string", "x-order": 0 },
            },
          },
          Output: {
            type: "object",
            description: "Structured response",
          },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.outputs[0]).toMatchObject({
      name: "output",
      type: "json",
    });
  });

  it("returns fallback output when schema has no Output definition", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            properties: {
              prompt: { type: "string", "x-order": 0 },
            },
          },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.outputs[0]).toMatchObject({
      name: "output",
      type: "any",
    });
  });

  it("handles empty or missing input schema", () => {
    const result = mapReplicateSchema({});

    expect(result.inputs).toEqual([]);
    expect(result.outputs[0]).toMatchObject({
      name: "output",
      type: "any",
    });
  });

  it("maps array inputs without URI format to json", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: { type: "string" },
                description: "List of tags",
                "x-order": 0,
              },
            },
          },
          Output: { type: "string" },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.inputs[0]).toMatchObject({
      name: "tags",
      type: "json",
    });
  });

  it("uses model description to detect output blob type", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            properties: {
              prompt: { type: "string", "x-order": 0 },
            },
          },
          Output: {
            type: "array",
            items: { type: "string", format: "uri" },
            title: "Output",
          },
        },
      },
    };

    // Without model description → falls back to "blob"
    const withoutDesc = mapReplicateSchema(schema);
    expect(withoutDesc.outputs[0].type).toBe("blob");

    // With model description mentioning "image" → detects "image"
    const withImageDesc = mapReplicateSchema(
      schema,
      "A text-to-image generative model"
    );
    expect(withImageDesc.outputs[0].type).toBe("image");

    // With model description mentioning "video" → detects "video"
    const withVideoDesc = mapReplicateSchema(
      schema,
      "Generate stunning videos from text prompts"
    );
    expect(withVideoDesc.outputs[0].type).toBe("video");

    // With model description mentioning "audio" → detects "audio"
    const withAudioDesc = mapReplicateSchema(
      schema,
      "Text-to-speech audio generation"
    );
    expect(withAudioDesc.outputs[0].type).toBe("audio");
  });

  it("maps plain string output", () => {
    const schema = {
      components: {
        schemas: {
          Input: {
            type: "object",
            properties: {
              prompt: { type: "string" },
            },
          },
          Output: {
            type: "string",
            description: "Generated text",
          },
        },
      },
    };

    const result = mapReplicateSchema(schema);

    expect(result.outputs[0]).toMatchObject({
      name: "output",
      type: "string",
      description: "Generated text",
    });
  });
});
