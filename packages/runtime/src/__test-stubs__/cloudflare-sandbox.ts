// Mirrors the real getSandbox(ns, id, options?) signature so call sites stay
// type-checkable when Vitest aliases @cloudflare/sandbox to this stub.
export function getSandbox(
  _ns: unknown,
  _id: string,
  _options?: unknown
): never {
  throw new Error(
    "@cloudflare/sandbox is not available outside Workers runtime"
  );
}
