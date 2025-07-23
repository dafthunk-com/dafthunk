import {
  addSecurityHeaders,
  generateNonce,
} from "../src/utils/security-headers";
import type { Data, Env } from "./[[path]].ts";

/**
 * Security middleware that applies security headers to all responses
 * and injects nonce into HTML responses
 */
async function securityMiddleware(context: EventContext<Env, any, Data>) {
  // Generate nonce for this request
  const nonce = generateNonce();

  // Store nonce in context for use by the main handler
  context.data.nonce = nonce;

  // Get the response from the next handler
  const response = await context.next();

  // Apply security headers with nonce configuration
  return addSecurityHeaders(response, {
    nonce,
    environment:
      process.env.NODE_ENV === "development" ? "development" : "production",
    enforceHttps: true,
  });
}

export const onRequest = [securityMiddleware];
