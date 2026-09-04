/**
 * The partner video models offered as palette entries, stated rather than
 * discovered.
 *
 * Cloudflare publishes no list API for the unified (`author/model`) catalog.
 * Its search endpoint serves the 65 models Workers AI hosts — no video among
 * them, on every page and under every filter — while reporting a total of 303
 * that includes these. The only machine-readable enumeration is the
 * documentation index, and a regex over a rendered page is not a dependency
 * worth having in the palette: it breaks on a restyle, silently, in
 * production.
 *
 * So the list is here, in source, where a reader can see what the editor
 * offers and a diff shows when it changes. Adding a model is one entry; the
 * ports still come from that model's published schema at runtime, which is
 * the same document the editor fetches when someone pastes an identifier by
 * hand, so this file never has to describe a model's shape.
 *
 * One model per generation, not one per identifier. The catalog publishes
 * twenty-seven video models, most of which are a second axis on a model
 * already here: a superseded version, or a `-fast`, `-mini`, `-turbo` or
 * `-preview` variant that trades quality for price. A palette of near
 * duplicates makes the choice harder rather than richer, so each vendor's
 * current flagship is listed and the rest are left to the generic gateway
 * node, which runs any identifier a person pastes into it.
 *
 * Every entry has been run. Alibaba's two — `wan-3.0` and `hh1.1-i2v` — were
 * listed and are gone again: both answer a valid minimum payload with a bare
 * `Model execution failed (Error)` and HTTP 500, about 300ms in, which is too
 * fast to be a generation attempt. The provider resolves and then fails, so
 * there is nothing here to send differently. They can come back when
 * Cloudflare's side does.
 *
 * That leaves nothing labelled `Image-to-Video`, which reads worse than it
 * is: Veo and Gen 4.5 both take an image input, so animating a still is still
 * something the palette can do — the label is Cloudflare's primary task, not
 * the limit of what the model accepts.
 *
 * Only video is listed at all: it is the one capability Workers AI cannot
 * serve, and every other partner model duplicates something available inline
 * and cheaper.
 */
export interface GatewayModelEntry {
  /** `author/model` — what the gateway and the docs both address it by. */
  id: string;
  /** Display author, e.g. `Alibaba`. */
  author: string;
  /** Cloudflare's task label, which drives the tag and the icon. */
  task: "Text-to-Video" | "Image-to-Video";
  /** One line for the palette, as the catalog describes the model. */
  description: string;
}

export const GATEWAY_MODELS: readonly GatewayModelEntry[] = [
  {
    id: "bytedance/seedance-2.5",
    author: "ByteDance",
    task: "Text-to-Video",
    description:
      "ByteDance's next-generation video model with a unified multimodal reference-to-video architecture. Generates video from text, up to 30 reference images, 10 reference videos, and 10 reference audio clips — including audio-only input with no image or video required. Supports first/last-frame image-to-video, video editing, video extension, intelligent duration (including automatic selection), and adaptive aspect ratio.",
  },
  {
    id: "google/veo-3.1",
    author: "Google",
    task: "Text-to-Video",
    description:
      "Google's latest video generation model with improved quality, motion, and audio generation.",
  },
  {
    id: "runwayml/gen-4.5",
    author: "RunwayML",
    task: "Text-to-Video",
    description:
      "RunwayML's video generation model supporting both text-to-video and image-to-video with customizable duration, aspect ratio, and content moderation controls.",
  },
  {
    id: "xai/grok-imagine-video",
    author: "xAI",
    task: "Text-to-Video",
    description:
      "xAI's video generation model. Generates, edits, and extends videos from text and image inputs with native synchronized audio including dialogue, sound effects, and music. Supports multiple creative modes (normal, fun, custom).",
  },
];
