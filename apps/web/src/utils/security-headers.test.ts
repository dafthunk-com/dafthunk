import { describe, expect, it } from "vitest";

import { generateNonce, injectNonceIntoHTML } from "./security-headers";

describe("Security headers functionality", () => {
  describe("generateNonce", () => {
    it("should generate a unique nonce each time", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      expect(nonce1).toBeTruthy();
      expect(nonce2).toBeTruthy();
      expect(nonce1).not.toBe(nonce2);
    });

    it("should generate a base64-encoded string", () => {
      const nonce = generateNonce();

      // Base64 string should only contain valid base64 characters
      expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });

  describe("injectNonceIntoHTML", () => {
    const testNonce = "test-nonce-123";

    it("should inject nonce into simple script tag", () => {
      const html = '<script src="/test.js"></script>';
      const result = injectNonceIntoHTML(html, testNonce);

      expect(result).toBe(
        `<script nonce="${testNonce}" src="/test.js"></script>`
      );
    });

    it("should inject nonce into script tag with type module", () => {
      const html = '<script type="module" src="/test.js"></script>';
      const result = injectNonceIntoHTML(html, testNonce);

      expect(result).toBe(
        `<script nonce="${testNonce}" type="module" src="/test.js"></script>`
      );
    });

    it("should inject nonce into script tag with multiple attributes", () => {
      const html =
        '<script type="module" crossorigin src="/assets/index-CeBMaJSY.js"></script>';
      const result = injectNonceIntoHTML(html, testNonce);

      expect(result).toBe(
        `<script nonce="${testNonce}" type="module" crossorigin src="/assets/index-CeBMaJSY.js"></script>`
      );
    });

    it("should inject nonce into inline script tag", () => {
      const html = '<script type="module">console.log("test");</script>';
      const result = injectNonceIntoHTML(html, testNonce);

      expect(result).toBe(
        `<script nonce="${testNonce}" type="module">console.log("test");</script>`
      );
    });

    it("should inject nonce into complex inline script", () => {
      const html = `<script type="module">import { injectIntoGlobalHook } from "/@react-refresh";
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;</script>`;
      const result = injectNonceIntoHTML(html, testNonce);

      expect(result).toContain(`<script nonce="${testNonce}" type="module">`);
    });

    it("should not modify script tags that already have nonce", () => {
      const html = '<script nonce="existing-nonce" src="/test.js"></script>';
      const result = injectNonceIntoHTML(html, testNonce);

      expect(result).toBe(html); // Should remain unchanged
    });

    it("should handle multiple script tags correctly", () => {
      const html = `
        <script src="/test1.js"></script>
        <script nonce="existing" src="/test2.js"></script>
        <script type="module" src="/test3.js"></script>
      `;
      const result = injectNonceIntoHTML(html, testNonce);

      expect(result).toContain(
        `<script nonce="${testNonce}" src="/test1.js"></script>`
      );
      expect(result).toContain(
        `<script nonce="existing" src="/test2.js"></script>`
      );
      expect(result).toContain(
        `<script nonce="${testNonce}" type="module" src="/test3.js"></script>`
      );
    });

    it("should handle the actual HTML from development mode", () => {
      const html = `<!doctype html>
<html lang="en">
  <head>
    <script type="module">import { injectIntoGlobalHook } from "/@react-refresh";
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;</script>

    <script type="module" src="/@vite/client"></script>

    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dafthunk</title><meta name="description" content="Workflow execution platform." data-managed-tag="true"/><meta property="og:title" content="Dafthunk" data-managed-tag="true"/><meta property="og:description" content="Workflow execution platform." data-managed-tag="true"/><meta property="og:type" content="website" data-managed-tag="true"/><meta name="twitter:card" content="summary_large_image" data-managed-tag="true"/><meta name="twitter:title" content="Dafthunk" data-managed-tag="true"/><meta name="twitter:description" content="Workflow execution platform." data-managed-tag="true"/>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/entry-client.tsx"></script>
  </body>
</html>`;

      const result = injectNonceIntoHTML(html, testNonce);

      // Should inject nonce into all three script tags
      const scriptMatches = result.match(/<script[^>]*>/g);
      expect(scriptMatches).toHaveLength(3);

      // All script tags should have the nonce
      scriptMatches?.forEach((tag) => {
        expect(tag).toContain(`nonce="${testNonce}"`);
      });
    });

    it("should not affect non-script tags", () => {
      const html = `
        <div>content</div>
        <script src="/test.js"></script>
        <link rel="stylesheet" href="/style.css">
      `;
      const result = injectNonceIntoHTML(html, testNonce);

      expect(result).toContain("<div>content</div>");
      expect(result).toContain('<link rel="stylesheet" href="/style.css">');
      expect(result).toContain(
        `<script nonce="${testNonce}" src="/test.js"></script>`
      );
    });
  });
});
