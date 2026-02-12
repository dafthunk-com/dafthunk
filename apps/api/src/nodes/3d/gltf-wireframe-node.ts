import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { Document, NodeIO, Primitive } from "@gltf-transform/core";
import { z } from "zod";

/**
 * Adds wireframe edge geometry to a glTF model
 * Creates line primitives from triangle edges and adds them as a separate mesh layer
 */
export class GltfWireframeNode extends ExecutableNode {
  private static readonly wireframeInputSchema = z.object({
    gltf: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.string(),
    }),
    lineColor: z
      .tuple([
        z.number().min(0).max(1),
        z.number().min(0).max(1),
        z.number().min(0).max(1),
      ])
      .optional()
      .default([0.0, 0.0, 0.0]),
    lineWidth: z.number().positive().optional().default(1),
  });

  public static readonly nodeType: NodeType = {
    id: "gltf-wireframe",
    name: "Transform to glTF Wireframe",
    type: "gltf-wireframe",
    description: "Convert a glTF model to wireframe (edges only, no faces)",
    tags: ["3D", "glTF", "Visualization", "Wireframe"],
    icon: "box",
    documentation:
      "Converts a glTF model to wireframe visualization by extracting edges as line primitives. Original faces and textures are removed, leaving only the geometry skeleton.",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "gltf",
        type: "gltf",
        description: "The glTF model to add wireframe to",
        required: true,
      },
      {
        name: "lineColor",
        type: "json",
        description:
          "RGB color for wireframe lines as [r, g, b] (0-1 range), default: [0, 0, 0] (black)",
        required: false,
        hidden: true,
      },
      {
        name: "lineWidth",
        type: "number",
        description: "Line width multiplier (default: 1)",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "gltf",
        type: "gltf",
        description: "glTF model with wireframe edges added",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = GltfWireframeNode.wireframeInputSchema.parse(
        context.inputs
      );
      const { gltf, lineColor, lineWidth } = validatedInput;

      // Parse the glTF document
      const io = new NodeIO();
      const doc = await io.readBinary(gltf.data);

      // Add wireframe geometry to the model
      this.addWireframeToDocument(doc, lineColor, lineWidth);

      // Export as GLB binary format
      const glbData = await io.writeBinary(doc);

      return this.createSuccessResult({
        gltf: {
          data: glbData,
          mimeType: "model/gltf-binary" as const,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ");
        return this.createErrorResult(`Validation error: ${errorMessages}`);
      }

      return this.createErrorResult(
        `Failed to add wireframe: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert glTF document to wireframe-only
   * Extracts edges from all primitives and replaces original geometry with line primitives
   */
  private addWireframeToDocument(
    doc: Document,
    lineColor: readonly [number, number, number],
    _lineWidth: number
  ): void {
    const root = doc.getRoot();
    const meshes = root.listMeshes();

    // Get or create a single buffer for the document (GLB requires 0-1 buffers)
    let buffer = root.listBuffers()[0];
    if (!buffer) {
      buffer = doc.createBuffer();
    }

    // Create a wireframe material (unlit, colored lines)
    const wireframeMaterial = doc
      .createMaterial()
      .setBaseColorFactor([...lineColor, 1.0])
      .setEmissiveFactor([...lineColor])
      .setDoubleSided(true);

    // Process each mesh - extract edges and replace with wireframe-only
    meshes.forEach((mesh) => {
      const primitives = mesh.listPrimitives();
      const edgeSet = new Set<string>();
      const edgeIndices: number[] = [];
      const edgePositions: number[] = [];
      const edgeUVs: number[] = [];
      const positionMap = new Map<string, number>();
      const firstPrimitive = primitives[0];

      // Get UV data from the first primitive if available
      const uvAccessor = firstPrimitive?.getAttribute("TEXCOORD_0");
      const uvData = uvAccessor?.getArray() as Float32Array | null;

      // Collect all unique edges from all primitives
      primitives.forEach((primitive) => {
        const indices = this.getIndices(primitive);
        const positions = this.getPositions(primitive);

        if (!indices || !positions) return;

        // Extract edges from triangle indices
        for (let i = 0; i < indices.length; i += 3) {
          const i0 = indices[i];
          const i1 = indices[i + 1];
          const i2 = indices[i + 2];

          // Add three edges per triangle (v0-v1, v1-v2, v2-v0)
          this.addEdge(edgeSet, i0, i1);
          this.addEdge(edgeSet, i1, i2);
          this.addEdge(edgeSet, i2, i0);
        }
      });

      // Convert edges to position and UV data
      edgeSet.forEach((edgeKey) => {
        const [i0Str, i1Str] = edgeKey.split("-");
        const i0 = parseInt(i0Str);
        const i1 = parseInt(i1Str);

        // Get position key
        const pos0Key = this.getPrimitivePositionKey(firstPrimitive, i0);
        const pos1Key = this.getPrimitivePositionKey(firstPrimitive, i1);

        if (!pos0Key || !pos1Key) return;

        // Map positions and UVs if not already mapped
        if (!positionMap.has(pos0Key)) {
          const pos = this.getPositionFromPrimitive(firstPrimitive, i0);
          if (pos) {
            const newIndex = edgePositions.length / 3;
            positionMap.set(pos0Key, newIndex);
            edgePositions.push(pos[0], pos[1], pos[2]);

            // Add UV coordinates if available
            if (uvData) {
              edgeUVs.push(uvData[i0 * 2], uvData[i0 * 2 + 1]);
            }
          }
        }

        if (!positionMap.has(pos1Key)) {
          const pos = this.getPositionFromPrimitive(firstPrimitive, i1);
          if (pos) {
            const newIndex = edgePositions.length / 3;
            positionMap.set(pos1Key, newIndex);
            edgePositions.push(pos[0], pos[1], pos[2]);

            // Add UV coordinates if available
            if (uvData) {
              edgeUVs.push(uvData[i1 * 2], uvData[i1 * 2 + 1]);
            }
          }
        }

        // Add edge indices
        const idx0 = positionMap.get(pos0Key);
        const idx1 = positionMap.get(pos1Key);
        if (idx0 !== undefined && idx1 !== undefined) {
          edgeIndices.push(idx0, idx1);
        }
      });

      // Get the original material from the first primitive (if it has one)
      const originalMaterial = firstPrimitive?.getMaterial();

      // Remove all original face primitives
      primitives.forEach((primitive) => {
        mesh.removePrimitive(primitive);
      });

      // Create wireframe primitive if edges exist
      if (edgeIndices.length > 0) {
        // Create position accessor
        const positionAccessor = doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(edgePositions))
          .setBuffer(buffer);

        // Create index accessor for lines
        const indexAccessor = doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint32Array(edgeIndices))
          .setBuffer(buffer);

        // Create line primitive (mode 1 = LINES)
        const wireframePrimitive = doc
          .createPrimitive()
          .setMode(1) // LINE mode
          .setAttribute("POSITION", positionAccessor)
          .setIndices(indexAccessor);

        // Add UV coordinates if available
        if (edgeUVs.length > 0) {
          const uvAccessor = doc
            .createAccessor()
            .setType("VEC2")
            .setArray(new Float32Array(edgeUVs))
            .setBuffer(buffer);
          wireframePrimitive.setAttribute("TEXCOORD_0", uvAccessor);
        }

        // Apply the original material if it exists, otherwise use wireframe material
        if (originalMaterial) {
          wireframePrimitive.setMaterial(originalMaterial);
        } else {
          wireframePrimitive.setMaterial(wireframeMaterial);
        }

        // Add wireframe primitive as the only primitive in the mesh
        mesh.addPrimitive(wireframePrimitive);
      }
    });
  }

  /**
   * Get triangle indices from a primitive
   */
  private getIndices(primitive: Primitive): number[] | null {
    const indices = primitive.getIndices();
    if (!indices) return null;

    const array = indices.getArray();
    if (!array) return null;

    return Array.from(array);
  }

  /**
   * Get position data from a primitive
   */
  private getPositions(primitive: Primitive): Float32Array | null {
    const posAccessor = primitive.getAttribute("POSITION");
    if (!posAccessor) return null;

    return posAccessor.getArray() as Float32Array | null;
  }

  /**
   * Get a unique key for a position at a given index
   */
  private getPrimitivePositionKey(
    primitive: Primitive,
    index: number
  ): string | null {
    const pos = this.getPositionFromPrimitive(primitive, index);
    if (!pos) return null;

    return `${pos[0]},${pos[1]},${pos[2]}`;
  }

  /**
   * Get the position vector for a vertex index
   */
  private getPositionFromPrimitive(
    primitive: Primitive,
    index: number
  ): [number, number, number] | null {
    const positions = this.getPositions(primitive);
    if (!positions || index * 3 + 2 >= positions.length) return null;

    return [
      positions[index * 3],
      positions[index * 3 + 1],
      positions[index * 3 + 2],
    ];
  }

  /**
   * Add an edge to the set (avoiding duplicates)
   */
  private addEdge(edgeSet: Set<string>, i0: number, i1: number): void {
    // Create a canonical edge key (smaller index first)
    const key = i0 < i1 ? `${i0}-${i1}` : `${i1}-${i0}`;
    edgeSet.add(key);
  }
}
