import type { Response as ExpressResponse } from "express";

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  /** Environment mode */
  environment?: "development" | "production";
  /** Nonce for script-src CSP directive */
  nonce?: string;
  /** Enforce HTTPS via HSTS */
  enforceHttps?: boolean;
  /** Custom CSP directives */
  customCsp?: Record<string, string | string[]>;
}

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Inject nonce into script tags in HTML
 */
export function injectNonceIntoHTML(html: string, nonce: string): string {
  return html.replace(
    /<script(?![^>]*nonce)([^>]*)>/g,
    `<script nonce="${nonce}"$1>`
  );
}

/**
 * Get security headers for HTTP responses
 * Protects against clickjacking, XSS, MIME confusion, and other attacks
 */
function getSecurityHeaders(
  config: SecurityHeadersConfig = {}
): Record<string, string> {
  const {
    enforceHttps = true,
    customCsp = {},
    environment = "production",
    nonce,
  } = config;

  // Base CSP configuration
  const baseCsp = {
    "default-src": "'self'",
    "script-src": nonce
      ? `'self' 'nonce-${nonce}' https://static.cloudflareinsights.com https://cdn.jsdelivr.net blob:`
      : "'self' https://static.cloudflareinsights.com https://cdn.jsdelivr.net blob:", // React/Vite compatibility + Cloudflare Insights + Monaco Editor
    "style-src": "'self' 'unsafe-inline' https://cdn.jsdelivr.net", // Tailwind/CSS-in-JS support + Monaco Editor
    "img-src":
      environment === "development"
        ? "'self' data: https: http://localhost:*" // Allow localhost HTTP in dev
        : "'self' data: https:",
    "font-src": "'self' data: https://cdn.jsdelivr.net",
    "connect-src":
      environment === "development"
        ? "'self' ws://localhost:* http://localhost:* https://api.dafthunk.com blob:" // Allow Vite HMR WebSocket connections in dev + blob URLs for Three.js
        : "'self' https://api.dafthunk.com wss://api.dafthunk.com blob:", // Allow API connections (HTTP + WebSocket) + blob URLs for Three.js
    "media-src":
      environment === "development"
        ? "'self' https://api.dafthunk.com http://localhost:*" // Allow localhost HTTP in dev
        : "'self' https://api.dafthunk.com", // Allow audio/video from API
    "frame-src": "'self' https://www.youtube.com", // Allow self-iframes and YouTube embeds
    "frame-ancestors": "'self' https://www.dafthunk.com", // Allow self-iframes, prevent external clickjacking
    "worker-src": "'self' blob: https://cdn.jsdelivr.net", // Allow Monaco Editor workers
    "base-uri": "'self'",
    "form-action": "'self'",
    "object-src": "'none'",
  };

  // Only add upgrade-insecure-requests in production when HTTPS is enforced
  if (enforceHttps && environment === "production") {
    baseCsp["upgrade-insecure-requests"] = true;
  }

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

/** Apply security headers to Web API Response */
function applySecurityHeadersToResponse<T extends Response | ExpressResponse>(
  response: T,
  config?: SecurityHeadersConfig
): T {
  if (response instanceof Response) {
    const headers = getSecurityHeaders(config);

    const newHeaders = new Headers(response.headers);
    Object.entries(headers).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    }) as T;
  } else {
    const headers = getSecurityHeaders(config);
    response.set(headers);
    return response;
  }
}

/** Check if response should have security headers (HTML and error responses) */
function shouldApplySecurityHeaders(
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

/**
 * Apply security headers to responses
 */
export function addSecurityHeaders<T extends Response | ExpressResponse>(
  response: T,
  config?: SecurityHeadersConfig
): T {
  let contentType: string | undefined;
  let statusCode: number | undefined;

  if (response instanceof Response) {
    contentType = response.headers.get("content-type") ?? undefined;
    statusCode = response.status;
  } else {
    contentType = response.get("content-type") ?? undefined;
    statusCode = response.statusCode;
  }

  if (shouldApplySecurityHeaders(contentType, statusCode)) {
    return applySecurityHeadersToResponse(response, config);
  }

  return response;
}
