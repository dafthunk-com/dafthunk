import {
  addSecurityHeaders,
  generateNonce,
} from "../../src/utils/security-headers";

export interface SecurityMiddlewareContext {
  nonce: string;
}

/**
 * Security middleware that applies security headers to all responses
 * and generates nonce for CSP
 */
export function createSecurityMiddleware<T extends Record<string, any>>(
  handler: (
    request: Request,
    env: T,
    context: SecurityMiddlewareContext
  ) => Promise<Response>
) {
  return async (request: Request, env: T): Promise<Response> => {
    // Generate nonce for this request
    const nonce = generateNonce();

    const context: SecurityMiddlewareContext = { nonce };

    try {
      // Call the main handler
      const response = await handler(request, env, context);

      // Apply security headers with nonce configuration
      return addSecurityHeaders(response, {
        nonce,
        environment:
          process.env.NODE_ENV === "development" ? "development" : "production",
        enforceHttps: true,
      });
    } catch (error) {
      // If an error occurs, still apply security headers to any Response errors
      if (error instanceof Response) {
        return addSecurityHeaders(error, {
          nonce,
          environment:
            process.env.NODE_ENV === "development"
              ? "development"
              : "production",
          enforceHttps: true,
        });
      }

      // Re-throw non-Response errors
      throw error;
    }
  };
}
