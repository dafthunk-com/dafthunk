/**
 * Where to send someone back to after they link an account.
 *
 * The OAuth callback always redirects to the integrations page — the return
 * path cannot ride along in the state parameter without touching every
 * provider implementation. So it is parked in `sessionStorage` on the way out
 * and picked up on the way back.
 *
 * `sessionStorage` rather than `localStorage`: this is one round trip in one
 * tab, and a stale return path surviving a browser restart would teleport
 * someone into a session they had forgotten about.
 */
const KEY = "dafthunk:oauth-return-to";

export function rememberOAuthReturn(path: string): void {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // Private browsing, or storage disabled. Losing the return path costs a
    // click; throwing here would cost the connection.
  }
}

/** Reads and clears the stored path — a return is only ever taken once. */
export function takeOAuthReturn(): string | null {
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return path;
  } catch {
    return null;
  }
}
