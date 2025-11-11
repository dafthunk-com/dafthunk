---
name: integration-generator
description: Generate new OAuth integration providers for Dafthunk with backend providers, type definitions, frontend configurations, and integration nodes
---

# Integration Generator

Generate OAuth integration providers for Dafthunk: research provider APIs, create backend OAuth provider, add type definitions, configure frontend, and optionally create integration nodes.

## Step 1: Research Provider and Register OAuth App

**Research the OAuth flow:**
- Use WebSearch/WebFetch to find official OAuth documentation
- Look for "OAuth 2.0", "Developer Apps", or "API Authentication" sections
- Identify authorization, token, and user info endpoints
- Note required scopes and token format (refresh support, expiration)
- Check token response structure and user info fields

**Register OAuth application:**
- Create a developer account on the provider's platform
- Register a new OAuth application/client
- Set redirect URI to: `http://localhost:3001/oauth/{provider-id}/connect` (dev)
- Note the generated Client ID and Client Secret
- Configure required scopes/permissions

**Present for confirmation:**
```markdown
Based on {Provider} OAuth documentation:

**Provider**: {Provider Name}
**ID**: `{provider-id}` (kebab-case)
**Endpoints**:
- Authorization: https://...
- Token: https://...
- User Info: https://...

**Scopes**: scope1, scope2
**Token Refresh**: Supported/Not supported
**Token Expiration**: {expires_in seconds} / Never expires

**OAuth App Registered**:
- Client ID: {id}
- Client Secret: {secret}
- Redirect URI: http://localhost:3001/oauth/{provider-id}/connect

Ready to implement?
```

## Step 2: Add Backend Types

**File:** `apps/api/src/oauth/types.ts`

```typescript
/**
 * {Provider} OAuth token response
 */
export interface {Provider}Token {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

/**
 * {Provider} user information
 */
export interface {Provider}User {
  id: string | number;
  email?: string;
  name?: string;
  // Add provider-specific fields
}
```

## Step 3: Create Provider Class

**File:** `apps/api/src/oauth/providers/{Provider}Provider.ts`

```typescript
import { OAuthProvider } from "../OAuthProvider";
import type { {Provider}Token, {Provider}User } from "../types";

export class {Provider}Provider extends OAuthProvider<{Provider}Token, {Provider}User> {
  readonly name = "{provider-id}";
  readonly displayName = "{Provider Name}";
  readonly authorizationEndpoint = "https://...";
  readonly tokenEndpoint = "https://...";
  readonly userInfoEndpoint = "https://...";
  readonly scopes = ["scope1", "scope2"];

  readonly refreshEnabled = true;  // false if no refresh support
  readonly refreshEndpoint = "https://...";  // only if refreshEnabled

  protected formatIntegrationName(user: {Provider}User): string {
    return user.name || user.email || "User";
  }

  protected formatUserMetadata(user: {Provider}User): Record<string, any> {
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
    };
  }

  protected extractAccessToken(token: {Provider}Token): string {
    return token.access_token;
  }

  protected extractRefreshToken(token: {Provider}Token): string | undefined {
    return token.refresh_token;
  }

  protected extractExpiresAt(token: {Provider}Token): Date | undefined {
    return token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000)
      : undefined;
  }
}
```

## Step 4: Register Backend Provider

**File:** `apps/api/src/oauth/registry.ts`

```typescript
import { {Provider}Provider } from "./providers/{Provider}Provider";

const providers = {
  // ... existing providers
  "{provider-id}": new {Provider}Provider(),
} as const;
```

## Step 5: Update Shared Types

**File:** `packages/types/src/integration.ts`

Add to `IntegrationProvider` union and `OAUTH_PROVIDERS` array:

```typescript
export type IntegrationProvider =
  | "existing-provider"
  | "{provider-id}"
  | "other-provider";

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  // ... existing providers
  {
    id: "{provider-id}",
    name: "{Provider Name}",
    description: "Connect your {Provider} account to...",
    supportsOAuth: true,
    oauthEndpoint: "/oauth/{provider-id}/connect",
  },
];
```

## Step 6: Create Frontend Provider

**File:** `apps/web/src/integrations/providers/{provider-id}.ts`

```typescript
import {IconName} from "lucide-react/icons/{icon-name}";
import type { ProviderConfig } from "../types";

export const {provider}Provider: ProviderConfig = {
  id: "{provider-id}",
  name: "{Provider Name}",
  description: "Connect your {Provider} account...",
  icon: {IconName},
  supportsOAuth: true,
  oauthEndpoint: "/oauth/{provider-id}/connect",
  successMessage: "{Provider} integration connected successfully",
};
```

## Step 7: Register Frontend Provider

**File:** `apps/web/src/integrations/providers/index.ts`

```typescript
import { {provider}Provider } from "./{provider-id}";

export const PROVIDER_REGISTRY: Record<IntegrationProvider, ProviderConfig> = {
  // ... existing providers
  "{provider-id}": {provider}Provider,
};
```

## Step 8: Configure Environment

**File:** `apps/api/.dev.vars`

```bash
INTEGRATION_{PROVIDER}_CLIENT_ID=your_client_id
INTEGRATION_{PROVIDER}_CLIENT_SECRET=your_client_secret
```

## Step 9: Update Integration Routes

**File:** `apps/api/src/routes/integrations.ts`

Add provider availability check:

```typescript
if (
  env.INTEGRATION_{PROVIDER}_CLIENT_ID &&
  env.INTEGRATION_{PROVIDER}_CLIENT_SECRET
) {
  availableProviders.push("{provider-id}");
}
```

## Step 10: Test OAuth Flow

```bash
pnpm typecheck
pnpm dev
```

Navigate to integrations page, click "Connect {Provider}", complete OAuth flow, verify integration appears in list.

## Optional: Create Integration Nodes

**File:** `apps/api/src/nodes/{provider-id}/{action}-{provider-id}-node.ts`

```typescript
import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

export class {Action}{Provider}Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "{action}-{provider-id}",
    name: "{Action} ({Provider})",
    type: "{action}-{provider-id}",
    description: "{Action description}",
    tags: ["{Category}", "{Provider}"],
    icon: "icon-name",
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "{Provider} integration to use",
        hidden: true,
        required: true,
      },
      // Add action-specific inputs
    ],
    outputs: [
      // Add action-specific outputs
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId } = context.inputs;

      // Get integration (auto-refreshes token)
      const integration = await context.getIntegration(integrationId);

      // Call provider API
      const response = await fetch("https://api.{provider}.com/...", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integration.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ /* request */ }),
      });

      if (!response.ok) {
        return this.createErrorResult(`API call failed: ${await response.text()}`);
      }

      const data = await response.json();
      return this.createSuccessResult({ /* outputs */ });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
```

Register in `apps/api/src/nodes/cloudflare-node-registry.ts`:

```typescript
import { {Action}{Provider}Node } from "./{provider-id}/{action}-{provider-id}-node";

this.registerImplementation({Action}{Provider}Node);
```

## Optional: Create Frontend Widget

**File:** `apps/web/src/components/workflow/widgets/integration-selector.tsx`

```typescript
export const {provider}Widget = createIntegrationWidget("{provider-id}", [
  "{action1}-{provider-id}",
  "{action2}-{provider-id}",
]);
```

Register in `apps/web/src/components/workflow/widgets/index.ts`:

```typescript
import { {provider}Widget } from "./integration-selector";

export const widgetRegistry = {
  ...{provider}Widget,
};
```

## Common Patterns

**HTTP Basic Auth (e.g., Reddit):**
```typescript
protected getTokenHeaders(clientId: string, clientSecret: string): Record<string, string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}
```

**No Token Expiration (e.g., GitHub):**
```typescript
readonly refreshEnabled = false;

protected extractExpiresAt(token: {Provider}Token): Date | undefined {
  return undefined;
}
```

**Custom Auth Parameters (e.g., Google):**
```typescript
protected customizeAuthUrl(url: URL): void {
  url.searchParams.set("access_type", "offline");
}
```

## Summary

After completion, list:
- Files created (backend types, provider, frontend config)
- Environment variables required
- OAuth flow test results
- Optional nodes/widgets created
