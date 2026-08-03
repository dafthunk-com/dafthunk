/**
 * Parameter type compatibility rules for workflow edges.
 *
 * Lives in `@dafthunk/utils` so the runtime validator, the editor's connection
 * check, and any tooling that reasons about edges share one definition. Three
 * copies of these rules existed before this module; they would have drifted the
 * first time someone added a `ParameterType`.
 */

/**
 * Types a `blob` parameter can connect to, in either direction. Note this is
 * not transitive: `blob -> image` is allowed, `image -> audio` is not.
 */
export const BLOB_COMPATIBLE_TYPES: ReadonlySet<string> = new Set([
  "image",
  "audio",
  "video",
  "document",
  "buffergeometry",
  "gltf",
]);

/**
 * True when an output of `sourceType` may connect to an input of `targetType`.
 *
 * There is no coercion: `number -> string` is rejected. `any` is a wildcard in
 * both directions, but `json` is not — that asymmetry is the single most common
 * mistake when authoring a graph by hand or by model.
 */
export function areTypesCompatible(
  sourceType: string,
  targetType: string
): boolean {
  if (sourceType === targetType) return true;
  if (sourceType === "any" || targetType === "any") return true;
  if (sourceType === "blob" && BLOB_COMPATIBLE_TYPES.has(targetType)) {
    return true;
  }
  if (targetType === "blob" && BLOB_COMPATIBLE_TYPES.has(sourceType)) {
    return true;
  }
  return false;
}

/**
 * A human-readable reason why two types cannot connect, or null when they can.
 *
 * Keeping the wording here means the editor tooltip, the validator message, and
 * any generated repair hint cannot disagree about why an edge is invalid.
 */
export function explainIncompatibility(
  sourceType: string,
  targetType: string
): string | null {
  if (areTypesCompatible(sourceType, targetType)) return null;

  if (sourceType === "json" && targetType === "string") {
    return `json cannot connect to string. Unlike "any", json is not a wildcard — insert a "to-string" node between them, or read a field out with "json-extract-string".`;
  }

  if (sourceType === "json") {
    return `json cannot connect to ${targetType}. Unlike "any", json is not a wildcard — convert it first, or use a source output already typed ${targetType}.`;
  }

  if (
    BLOB_COMPATIBLE_TYPES.has(sourceType) &&
    BLOB_COMPATIBLE_TYPES.has(targetType)
  ) {
    return `${sourceType} cannot connect directly to ${targetType}. Both are blob flavours, but only blob itself bridges them.`;
  }

  return `${sourceType} cannot connect to ${targetType}. Types must match exactly, or one side must be "any", or blob must pair with one of ${[...BLOB_COMPATIBLE_TYPES].join(", ")}. There is no automatic conversion between types.`;
}
