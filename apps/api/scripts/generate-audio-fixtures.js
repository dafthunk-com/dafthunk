#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the MP3 file and convert it to a Uint8Array
const mp3Path = path.join(
  __dirname,
  "..",
  "test",
  "fixtures",
  "en-us-hello.mp3"
);
const mp3Bytes = fs.readFileSync(mp3Path);

// Generate the fixture file content
const fixtureContent = `// Auto-generated from en-us-hello.mp3
export const enUsHelloBytes = new Uint8Array([
  ${Array.from(mp3Bytes).join(", ")}
]);

// Export audio data in a format suitable for testing
export const testAudioData = {
  data: enUsHelloBytes,
  mimeType: "audio/mpeg",
};
`;

// Write the fixture file
const fixturePath = path.join(
  __dirname,
  "..",
  "test",
  "fixtures",
  "audio-fixtures.ts"
);
fs.writeFileSync(fixturePath, fixtureContent);

console.log(`Generated audio fixtures at: ${fixturePath}`);
console.log(`Audio file size: ${mp3Bytes.length} bytes`);
