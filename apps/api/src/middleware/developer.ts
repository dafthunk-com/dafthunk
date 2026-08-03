import { Context } from "hono";

import { ApiContext } from "../context";

/**
 * Gates a route behind the user's developer-mode flag.
 * Must be used after jwtMiddleware so `jwtPayload` is available.
 *
 * The flag is read from the JWT rather than D1, so it lags a profile change by
 * up to the access-token lifetime. The profile toggle re-mints the token to
 * close that window; see `handleEarlyAccessToggle` in the app.
 */
export const developerModeMiddleware = async (
  c: Context<ApiContext>,
  next: () => Promise<void>
) => {
  const jwtPayload = c.get("jwtPayload");

  if (!jwtPayload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!jwtPayload.developerMode) {
    return c.json(
      {
        error:
          "This feature is under development and accessible only to developers.",
      },
      403
    );
  }

  await next();
};
