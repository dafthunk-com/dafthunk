# Bundled fonts

Static TTFs used to render text in SVG → raster nodes (e.g. `svg-to-png-node`).
resvg-wasm has no access to system fonts in the Workers runtime, so font bytes
must be supplied explicitly via `font.fontBuffers`.

## Why these are here

- Format is **TTF** (not WOFF2): resvg/usvg reads TTF/OTF/TTC only.
- Weights are **400 Regular + 700 Bold** (Noto Emoji: 400 only). Italics are not
  bundled; resvg synthesizes them when needed.
- Source: original static instances from the `@expo-google-fonts/*` npm packages.
  Each family ships its own license in `<family>/LICENSE` (all SIL OFL 1.1).

## Families

| Directory           | Family             | Generic slot   |
| ------------------- | ------------------ | -------------- |
| `inter`             | Inter              | sans-serif     |
| `roboto`            | Roboto             | sans-serif     |
| `montserrat`        | Montserrat         | sans-serif     |
| `noto-sans`         | Noto Sans          | sans-serif     |
| `lora`              | Lora               | serif          |
| `noto-serif`        | Noto Serif         | serif          |
| `libre-baskerville` | Libre Baskerville  | serif          |
| `jetbrains-mono`    | JetBrains Mono     | monospace      |
| `roboto-mono`       | Roboto Mono        | monospace      |
| `noto-sans-mono`    | Noto Sans Mono     | monospace      |
| `noto-emoji`        | Noto Emoji (mono)  | emoji/symbols  |

## How they load

The TTF binaries are **not committed** (this directory's `*/` subfolders are
gitignored). They are fetched on demand from the `@expo-google-fonts/*` packages:

```bash
pnpm --filter '@dafthunk/runtime' fonts:fetch   # download TTFs into src/fonts/
```

From there they are uploaded to the **RESSOURCES** R2 bucket under the
`fonts/<dir>/<file>` prefix and fetched at render time (see `utils/fonts.ts` and
`svg-to-png-node`). They are never bundled into the Worker. Seed R2 with:

```bash
pnpm --filter '@dafthunk/api' fonts:seed        # local (runs fonts:fetch first)
pnpm --filter '@dafthunk/api' fonts:prod:seed   # production
```

To add a font: add an entry to `FONT_REGISTRY` (`utils/fonts.ts`) and to the
`FONTS` list in `scripts/fetch-fonts.mjs`, then re-seed. CI runs `fonts:fetch`
before the render tests, which otherwise skip when the binaries are absent.
