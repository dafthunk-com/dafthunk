// Downloads the static font TTFs into src/fonts/<dir>/ from the
// @expo-google-fonts/* npm packages. The binaries are gitignored — this script
// is the reproducible source of truth, run before seeding R2 (and in CI before
// the render tests). To add a font, add an entry here and to FONT_REGISTRY.

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = resolve(__dirname, "../src/fonts");

// [dir, npm package, weight tokens to extract]
const FONTS = [
  ["inter", "inter", ["400Regular", "700Bold"]],
  ["roboto", "roboto", ["400Regular", "700Bold"]],
  ["montserrat", "montserrat", ["400Regular", "700Bold"]],
  ["noto-sans", "noto-sans", ["400Regular", "700Bold"]],
  ["lora", "lora", ["400Regular", "700Bold"]],
  ["noto-serif", "noto-serif", ["400Regular", "700Bold"]],
  ["libre-baskerville", "libre-baskerville", ["400Regular", "700Bold"]],
  ["jetbrains-mono", "jetbrains-mono", ["400Regular", "700Bold"]],
  ["roboto-mono", "roboto-mono", ["400Regular", "700Bold"]],
  ["noto-sans-mono", "noto-sans-mono", ["400Regular", "700Bold"]],
  ["noto-emoji", "noto-emoji", ["400Regular"]],
];

async function tarballUrl(pkg) {
  const res = await fetch(
    `https://registry.npmjs.org/@expo-google-fonts/${pkg}/latest`
  );
  if (!res.ok) throw new Error(`registry ${pkg}: ${res.status}`);
  return (await res.json()).dist.tarball;
}

function findFiles(dir, predicate, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) findFiles(full, predicate, out);
    else if (predicate(entry.name)) out.push(full);
  }
  return out;
}

const work = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "fonts-"));
try {
  for (const [dir, pkg, weights] of FONTS) {
    process.stdout.write(`${pkg} ... `);
    const tarball = await tarballUrl(pkg);
    const bytes = Buffer.from(await (await fetch(tarball)).arrayBuffer());
    const tgz = join(work, `${pkg}.tgz`);
    writeFileSync(tgz, bytes);

    const extracted = join(work, pkg);
    mkdirSync(extracted, { recursive: true });
    execFileSync("tar", ["xzf", tgz, "-C", extracted]);

    const dest = join(fontsDir, dir);
    mkdirSync(dest, { recursive: true });

    // The font's own license (SIL OFL / Apache), not the npm package's MIT.
    const license =
      findFiles(extracted, (n) => n === "LICENSE_FONT")[0] ??
      findFiles(extracted, (n) => /^license/i.test(n))[0];
    if (license) copyFileSync(license, join(dest, "LICENSE"));

    for (const weight of weights) {
      const src = findFiles(extracted, (n) => n.endsWith(`${weight}.ttf`))[0];
      if (!src) {
        process.stdout.write(`(missing ${weight}) `);
        continue;
      }
      copyFileSync(src, join(dest, basename(src)));
    }
    console.log("ok");
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`Fonts fetched to ${fontsDir}`);
