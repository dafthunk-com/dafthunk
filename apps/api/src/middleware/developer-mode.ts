import { Context } from "hono";

import { ApiContext } from "../context";

export const developerModeMiddleware = async (
  c: Context<ApiContext>,
  next: () => Promise<void>
) => {
  const jwtPayload = c.get("jwtPayload");

  if (!jwtPayload?.developerMode) {
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
