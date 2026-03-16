import { edge_detection } from "@cf-wasm/photon";
import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { executePhotonOperation } from "./execute-photon-operation";

/**
 * This node applies edge detection to an input image using the Photon library.
 */
export class PhotonEdgeDetectionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "photon-edge-detection",
    name: "Edge Detection",
    type: "photon-edge-detection",
    description: "Highlights edges in an image using Photon.",
    tags: ["Image", "Photon", "Effect", "EdgeDetection"],
    icon: "minimize-2",
    documentation: "This node highlights edges in an image using Photon.",
    inlinable: true,
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The input image to apply edge detection to.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The edge-detected image (PNG format).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { image } = context.inputs as { image?: ImageParameter };
    return executePhotonOperation(this, image, (img) => {
      edge_detection(img);
      return img.get_bytes();
    });
  }
}
