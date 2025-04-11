# Stateless Authentication with JWT and OAuth2 Authorization Code Flow

## Overview

This implementation provides a stateless authentication system using OAuth2 providers (GitHub, Google) with the Authorization Code flow. The system leverages JSON Web Tokens (JWT) to maintain a stateless session on the server side.

## Features

- **Multi-Provider OAuth2 Integration:** Authentication through multiple OAuth2 providers (GitHub, Google).
- **Stateless Authentication:** Uses JWTs to avoid server-side session storage.
- **Enhanced Security:** Implements strong security measures including secure cookies and CSRF mitigation.
- **User Identity Management:** Supports linking multiple OAuth accounts to a single user identity via email.

## Implementation Details

### Directory Structure

```
functions/auth/
├── jwt.ts             # JWT utilities for creating and verifying tokens
├── providers.ts       # OAuth2 provider configurations
├── middleware.ts      # Authentication middleware
├── login.ts           # Login endpoint to initiate OAuth2 flow
├── callback.ts        # Callback endpoint to handle OAuth2 callback
├── logout.ts          # Logout endpoint to clear authentication
├── protected.ts       # Example of a protected endpoint
└── README.md          # Documentation
```

### User Database Schema

The user table uses UUIDs as primary keys and supports multiple OAuth providers:

```typescript
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  email: text("email").unique(), // Unique constraint on email
  provider: text("provider").$type<ProviderType>().notNull(),
  // Provider-specific IDs
  githubId: text("github_id"),
  googleId: text("google_id"),
  // Add more provider IDs as needed
  plan: text("plan").$type<PlanType>().notNull().default(Plan.TRIAL),
  role: text("role").$type<RoleType>().notNull().default(Role.USER),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

This schema allows:

- Using UUIDs as primary keys instead of provider-specific IDs
- Storing provider-specific IDs in dedicated fields
- Linking multiple OAuth accounts to a single user via email
- Maintaining a unique constraint on email addresses

### Authentication Flow

1. **User Login**

   - User clicks the 'Login with OAuth Provider' button.
   - The frontend navigates to `/auth/login?provider=[provider]`.
   - The backend generates a state parameter and redirects directly to the OAuth provider's authorization endpoint.
   - The provider parameter is included in the callback URL to ensure it's available during the callback.

2. **Authorization Code Exchange**

   - User authenticates with the OAuth provider.
   - The provider redirects to your app with an authorization code.
   - The backend exchanges the code for an access token.
   - The backend fetches user information from the provider's API.

3. **User Identity Management**

   - The backend checks if a user with the provider-specific ID already exists.
   - If not, it checks if a user with the same email already exists.
   - If a user is found, it updates the user record with the new provider-specific ID.
   - If no user is found, it creates a new user with a UUID.

4. **JWT Creation and Storage**

   - The backend generates a JWT containing user information.
   - The JWT is signed with a secret key.
   - The signed JWT is sent to the frontend via a secure, HTTP-only cookie.

5. **Authenticated API Calls**
   - The frontend includes the JWT in the Authorization header or cookie for authenticated API requests.
   - The backend verifies the JWT on each request without maintaining session state.

### API Endpoints

#### 1. `/auth/login`

- **Method:** `GET`
- **Description:** Initiates the OAuth2 flow by redirecting the user to the provider's authorization URL.
- **Query Parameters:**
  - `provider`: The OAuth2 provider (e.g., `github`, `google`).
- **Response:**
  - Redirects the user directly to the OAuth provider's authorization URL.
  - Sets a secure cookie with the state parameter for CSRF protection.

#### 2. `/auth/callback`

- **Method:** `GET`
- **Description:** Handles the OAuth2 callback with the authorization code.
- **Query Parameters:**
  - `code`: The authorization code from the OAuth provider.
  - `state`: The state parameter for CSRF protection.
  - `provider`: The OAuth2 provider (included in the redirect_uri during login).
- **Response:**
  - Redirects to the frontend with a secure cookie containing the JWT.

#### 3. `/auth/logout`

- **Method:** `POST`
- **Description:** Clears the JWT cookie.
- **Response:**
  - Returns a JSON object with a success message.
  - Clears the JWT cookie.

#### 4. `/auth/protected`

- **Method:** `GET`
- **Description:** Example of a protected API route.
- **Authorization:** Requires a valid JWT in the `Authorization` header or cookie.
- **Response:** Returns data only if the JWT is valid.

#### 5. `/auth/user`

- **Method:** `GET`
- **Description:** Returns the authenticated user's information.
- **Authorization:** Requires a valid JWT in the `Authorization` header or cookie.
- **Response:**
  - Returns a JSON object with the user's information:
    ```json
    {
      "user": {
        "id": "123456",
        "name": "John Doe",
        "email": "john@example.com",
        "provider": "github"
      }
    }
    ```

#### 6. `/auth/renewal`

- **Method:** `GET`
- **Description:** Automatically renews the JWT token before it expires.
- **Authorization:** Requires a valid JWT in the `Authorization` header or cookie.
- **Response:**
  - If token is about to expire (less than 5 minutes remaining):
    ```json
    {
      "message": "Token renewed successfully",
      "renewed": true,
      "tokenInfo": {
        "expiresIn": 900,
        "issuedAt": 1647345678,
        "expiresAt": 1647346578
      }
    }
    ```
  - If token still has more than 5 minutes remaining:
    ```json
    {
      "message": "Token is still valid",
      "renewed": false,
      "tokenInfo": {
        "expiresIn": 450,
        "issuedAt": 1647345678,
        "expiresAt": 1647346128
      }
    }
    ```
  - Sets a new secure cookie with the renewed JWT if renewed.

## Security Considerations

### JWT Best Practices

- Uses short-lived JWTs (15 minutes) to minimize the risk of compromised tokens.
- Implements secure, HTTP-only cookies with SameSite=Strict for storing JWTs.

### CSRF Mitigation

- Uses a state parameter for CSRF protection during the OAuth2 flow.
- Utilizes `SameSite=Strict` cookies when storing the JWT.

## Environment Variables

The following environment variables are required:

- `JWT_SECRET`: Secret key for signing JWTs.
- `GITHUB_CLIENT_ID`: GitHub OAuth2 client ID.
- `GITHUB_CLIENT_SECRET`: GitHub OAuth2 client secret.
- `GOOGLE_CLIENT_ID`: Google OAuth2 client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth2 client secret.

## Usage

1. Set up the required environment variables in your Cloudflare Pages project.
2. Deploy the functions to Cloudflare Pages.
3. Implement the frontend to initiate the OAuth2 flow and handle the authenticated state.

## Example Frontend Integration

```typescript
// Example of initiating the OAuth2 flow
function loginWithProvider(provider: "github" | "google") {
  // Direct navigation to the login endpoint, which will redirect to the provider
  window.location.href = `/auth/login?provider=${provider}`;
}

// Example of checking authentication status
async function checkAuth() {
  try {
    const response = await fetch("/auth/protected");
    if (response.ok) {
      const data = await response.json();
      console.log("Authenticated user:", data.user);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Authentication check failed:", error);
    return false;
  }
}

// Example of logging out
async function logout() {
  await fetch("/auth/logout", { method: "POST" });
  window.location.href = "/";
}

// Example of getting the user information
async function getUserInfo() {
  try {
    const response = await fetch("/auth/user");
    if (response.ok) {
      const data = await response.json();
      console.log("User info:", data.user);
      return data.user;
    }
    return null;
  } catch (error) {
    console.error("Failed to get user info:", error);
    return null;
  }
}
```
