#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of all Photon nodes that need tests with their required parameters
const photonNodes = [
  {
    name: "photon-add-noise",
    params: { amount: 10 },
  },
  {
    name: "photon-adjust-brightness",
    params: { amount: 20 },
  },
  {
    name: "photon-adjust-contrast",
    params: { amount: 1.5 },
  },
  {
    name: "photon-adjust-hsl-lightness",
    params: { amount: 0.2 },
  },
  {
    name: "photon-adjust-hue",
    params: { degrees: 30 },
  },
  {
    name: "photon-adjust-saturation",
    params: { level: 0.5 },
  },
  {
    name: "photon-alter-rgb-channels",
    params: { redAmount: 10, greenAmount: -5, blueAmount: 15 },
  },
  {
    name: "photon-apply-filter",
    params: { filterName: "vintage" },
  },
  {
    name: "photon-blend-images",
    params: { blendImage: "testImageData", blendMode: "overlay" },
    errorMessage: "Base image is missing or invalid.",
  },
  {
    name: "photon-crop",
    params: { x: 0, y: 0, width: 16, height: 16 },
  },
  {
    name: "photon-edge-detection",
    params: {},
  },
  {
    name: "photon-emboss",
    params: {},
  },
  {
    name: "photon-flip-image",
    params: { direction: "horizontal" },
  },
  {
    name: "photon-gaussian-blur",
    params: { radius: 5 },
  },
  {
    name: "photon-grayscale",
    params: {},
  },
  {
    name: "photon-image-info",
    params: {},
    specialOutput: "imagePassthrough",
  },
  {
    name: "photon-invert-colors",
    params: {},
  },
  {
    name: "photon-mix-with-color",
    params: { mixRed: 255, mixGreen: 0, mixBlue: 0, opacity: 0.5 },
  },
  {
    name: "photon-oil-painting",
    params: { radius: 3, intensity: 55.0 },
  },
  {
    name: "photon-pixelize",
    params: { pixelSize: 10 },
  },
  {
    name: "photon-resize",
    params: { width: 200, height: 200 },
  },
  {
    name: "photon-rotate-image",
    params: { angle: 90 },
  },
  {
    name: "photon-sepia",
    params: {},
  },
  {
    name: "photon-sharpen",
    params: {},
  },
  {
    name: "photon-threshold",
    params: { thresholdValue: 128 },
  },
  {
    name: "photon-watermark",
    params: { watermarkImage: "testImageData", x: 10, y: 10 },
    errorMessage: "Main image is missing or invalid.",
  },
];

// Template for Photon node tests
const generatePhotonTest = (nodeConfig) => {
  const nodeName = nodeConfig.name;
  const _testName = nodeName.replace(/-/g, "");
  const _displayName = nodeName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Fix class name generation - handle RGB correctly
  let className;
  if (nodeName === "photon-alter-rgb-channels") {
    className = "PhotonAlterRGBChannelsNode";
  } else {
    className =
      nodeName
        .split("-")
        .map((word) => {
          // Handle RGB as a special case
          if (word === "rgb") return "RGB";
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join("") + "Node";
  }

  const params = nodeConfig.params;
  const errorMessage =
    nodeConfig.errorMessage || "Input image is missing or invalid.";
  const specialOutput = nodeConfig.specialOutput;

  // Build inputs object for the test
  const inputsObj = {
    image: "testImageData",
    ...params,
  };

  // Handle special cases for nodes with multiple image inputs
  if (nodeName === "photon-blend-images") {
    inputsObj.baseImage = "testImageData";
    inputsObj.blendImage = "testImageData";
    delete inputsObj.image;
  } else if (nodeName === "photon-watermark") {
    inputsObj.mainImage = "testImageData";
    inputsObj.watermarkImage = "testImageData";
    delete inputsObj.image;
  }

  const inputsString = JSON.stringify(inputsObj, null, 2).replace(
    /"testImageData"/g,
    "testImageData"
  );

  // Handle special output cases
  const outputCheck = specialOutput
    ? `expect(result.outputs?.${specialOutput}).toBeDefined();
    expect(result.outputs?.${specialOutput}.data).toBeDefined();
    expect(result.outputs?.${specialOutput}.mimeType).toBe("image/png");
    expect(result.outputs?.${specialOutput}.data.length).toBeGreaterThan(0);`
    : `expect(result.outputs?.image).toBeDefined();
    expect(result.outputs?.image.data).toBeDefined();
    expect(result.outputs?.image.mimeType).toBe("image/png");
    expect(result.outputs?.image.data.length).toBeGreaterThan(0);`;

  return `import { expect, it, describe } from "vitest";
import { Node } from "@dafthunk/types";
import { ${className} } from "./${nodeName}-node";
import { NodeContext } from "../types";
import { testImageData } from "../../../test/fixtures/image-fixtures";

describe("${className}", () => {
  it("should process image", async () => {
    const nodeId = "${nodeName}";
    const node = new ${className}({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: ${inputsString},
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    ${outputCheck}
  });

  it("should handle missing image", async () => {
    const nodeId = "${nodeName}";
    const node = new ${className}({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("${errorMessage}");
  });
});
`;
};

// Generate all Photon node tests
photonNodes.forEach((nodeConfig) => {
  const testContent = generatePhotonTest(nodeConfig);
  const testPath = path.join(
    __dirname,
    "..",
    "src",
    "nodes",
    "image",
    `${nodeConfig.name}-node.test.ts`
  );

  fs.writeFileSync(testPath, testContent);
  console.log(`Generated test for ${nodeConfig.name}`);
});

console.log(`\nGenerated ${photonNodes.length} Photon node tests`);
