import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { createStaticHandler } from "react-router";

import { type AppRouteObject, routes } from "./routes";

export async function render(req: Request) {
  const handler = createStaticHandler(routes);
  const context = await handler.query(req);

  // Check for redirects or other server-side responses
  if (context instanceof Response) {
    throw context; // Let the server handle the Response directly
  }

  let headHtml = "";
  if (context.matches) {
    const leafMatch = context.matches[context.matches.length - 1];
    if (leafMatch && leafMatch.route) {
      const routeDefinition = leafMatch.route as AppRouteObject;
      const routeHandle = routeDefinition.handle;

      if (routeHandle?.head) {
        if (typeof routeHandle.head === "function") {
          const headElement = routeHandle.head(leafMatch.params, {
            url: new URL(req.url),
            location: context.location,
          });
          headHtml = renderToString(<StrictMode>{headElement}</StrictMode>);
        } else {
          // If routeHandle.head is a React.ReactElement
          headHtml = renderToString(
            <StrictMode>{routeHandle.head as React.ReactElement}</StrictMode>
          );
        }
      }
    }
  }

  // For CSR body, we don't render the main app to string here.
  // The 'html' for the body will be handled by the client.
  // We only return headHtml and the context (which might contain status codes or loader data).
  return { headHtml, context };
}
