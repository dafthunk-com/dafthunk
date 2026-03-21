export function getSandbox() {
  throw new Error(
    "@cloudflare/sandbox is not available outside Workers runtime"
  );
}
