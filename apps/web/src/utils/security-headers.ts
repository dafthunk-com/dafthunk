/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  /** Enforce HTTPS via HSTS */
  enforceHttps?: boolean;
  /** Custom CSP directives */
  customCsp?: Record<string, string | string[]>;
  /** Environment mode */
  environment?: "development" | "production";
}

/**
 * Get security headers for HTTP responses
 * Protects against clickjacking, XSS, MIME confusion, and other attacks
 */
export function getSecurityHeaders(
  config: SecurityHeadersConfig = {}
): Record<string, string> {
  const {
    enforceHttps = true,
    customCsp = {},
    environment = "production",
  } = config;

  // Base CSP configuration
  const baseCsp = {
    "default-src": "'self'",
    "script-src":
      "'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com", // React/Vite compatibility + Cloudflare Insights
    "style-src": "'self' 'unsafe-inline'", // Tailwind/CSS-in-JS support
    "img-src": "'self' data: https:",
    "font-src": "'self' data:",
    "connect-src": "'self' https://api.dafthunk.com", // Allow API connections
    "media-src": "'self' https://api.dafthunk.com", // Allow audio/video from API
    "frame-src": "'self' https://www.youtube.com", // Allow self-iframes and YouTube embeds
    "frame-ancestors": "'self'", // Allow self-iframes, prevent external clickjacking
    "base-uri": "'self'",
    "form-action": "'self'",
    "object-src": "'none'",
    "upgrade-insecure-requests": true,
  };

  const mergedCsp = { ...baseCsp, ...customCsp };

  // Convert to CSP string
  const cspString = Object.entries(mergedCsp)
    .map(([directive, value]) => {
      if (typeof value === "boolean") {
        return value ? directive : "";
      }
      const valueStr = Array.isArray(value) ? value.join(" ") : value;
      return `${directive} ${valueStr}`;
    })
    .filter(Boolean)
    .join("; ");

  const headers: Record<string, string> = {
    "X-Frame-Options": "DENY", // Clickjacking protection
    "Content-Security-Policy": cspString,
    "X-Content-Type-Options": "nosniff", // MIME protection
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "1; mode=block", // Legacy XSS protection
  };

  // Add HSTS in production only
  if (enforceHttps && environment === "production") {
    headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains; preload";
  }

  return headers;
}

/** Apply security headers to Express response */
export function applySecurityHeaders(
  res: { set: (headers: Record<string, string>) => void },
  config?: SecurityHeadersConfig
): void {
  const headers = getSecurityHeaders(config);
  res.set(headers);
}

/** Apply security headers to Web API Response */
export function applySecurityHeadersToResponse(
  response: Response,
  config?: SecurityHeadersConfig
): Response {
  const headers = getSecurityHeaders(config);

  const newHeaders = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/** Check if response should have security headers (HTML and error responses) */
export function shouldApplySecurityHeaders(
  contentType?: string | null,
  statusCode?: number
): boolean {
  if (!contentType && statusCode && statusCode >= 400) {
    return true; // Error responses
  }

  if (contentType?.includes("text/html")) {
    return true;
  }

  return false;
}
