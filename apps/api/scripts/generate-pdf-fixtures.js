#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the hello.pdf file
const pdfPath = path.join(__dirname, "..", "test", "fixtures", "hello.pdf");
const pdfBytes = fs.readFileSync(pdfPath);

// Generate the fixture file content
const fixtureContent = `// Auto-generated from hello.pdf
export const helloPdfBytes = new Uint8Array([
  ${Array.from(pdfBytes).join(", ")}
]);

// Export PDF data in a format suitable for testing
export const testPdfData = {
  data: helloPdfBytes,
  mimeType: "application/pdf",
};
`;

// Write the fixture file
const fixturePath = path.join(
  __dirname,
  "..",
  "test",
  "fixtures",
  "pdf-fixtures.ts"
);
fs.writeFileSync(fixturePath, fixtureContent);

console.log(`Generated PDF fixtures at: ${fixturePath}`);
console.log(`PDF size: ${pdfBytes.length} bytes`);
