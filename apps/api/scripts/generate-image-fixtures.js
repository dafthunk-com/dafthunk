#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the lenna.png file
const lennaPath = path.join(__dirname, "..", "test", "fixtures", "lenna.png");
const lennaBytes = fs.readFileSync(lennaPath);

// Generate the fixture file content
const fixtureContent = `// Auto-generated from lenna.png
export const lennaBytes = new Uint8Array([
  ${Array.from(lennaBytes).join(", ")}
]);

// Export image data in a format suitable for testing
export const testImageData = {
  data: lennaBytes,
  mimeType: "image/png",
};
`;

// Write the fixture file
const fixturePath = path.join(
  __dirname,
  "..",
  "test",
  "fixtures",
  "image-fixtures.ts"
);
fs.writeFileSync(fixturePath, fixtureContent);

console.log(`Generated image fixtures at: ${fixturePath}`);
console.log(`Image size: ${lennaBytes.length} bytes`);
