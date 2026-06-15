// Uploads the bundled font TTFs to the RESSOURCES R2 bucket under the
// `fonts/<dir>/<file>` prefix.
//
// Usage:
//   node scripts/seed-fonts.mjs <bucket-name> <--local|--remote>
//
// Driven by the files in packages/runtime/src/fonts; the SVG render node fetches
// them by the same key derived from FONT_REGISTRY.

import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");
const fontsDir = resolve(apiDir, "../../packages/runtime/src/fonts");

const [bucket, scope] = process.argv.slice(2);
if (!bucket || (scope !== "--local" && scope !== "--remote")) {
  console.error(
    "Usage: node scripts/seed-fonts.mjs <bucket-name> <--local|--remote>"
  );
  process.exit(1);
}

function* ttfFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* ttfFiles(full);
    } else if (entry.endsWith(".ttf")) {
      yield full;
    }
  }
}

const files = [...ttfFiles(fontsDir)];
if (files.length === 0) {
  console.error(`No .ttf files found under ${fontsDir}`);
  process.exit(1);
}

console.log(`Seeding ${files.length} fonts to ${bucket} (${scope})`);
for (const file of files) {
  // key mirrors FONT_REGISTRY: fonts/<dir>/<file>
  const key = `fonts/${relative(fontsDir, file)}`;
  process.stdout.write(`  ${key} ... `);
  execFileSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "r2",
      "object",
      "put",
      `${bucket}/${key}`,
      `--file=${file}`,
      scope,
    ],
    { cwd: apiDir, stdio: ["ignore", "ignore", "inherit"] }
  );
  console.log("ok");
}
console.log("Done.");
