# Authentication System for React App

This authentication system integrates with the stateless JWT-based authentication backend to provide secure access to your React application.

## Features

- OAuth2 authentication with GitHub
- Stateless JWT-based sessions
- Protected routes
- User profile management
- Automatic token handling

## Components

### AuthProvider

The `AuthProvider` is a context provider that manages authentication state throughout the application. It should be placed at the root of your application.

```tsx
// In App.tsx
import { AuthProvider } from "./lib/auth/authContext";

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

### ProtectedRoute

The `ProtectedRoute` component restricts access to authenticated users only. If a user is not authenticated, they will be redirected to the login page.

```tsx
// In your routes
import { ProtectedRoute } from "./lib/auth/protected-route";

// Example usage in routes
{
  path: "/protected-path",
  element: (
    <ProtectedRoute>
      <YourProtectedComponent />
    </ProtectedRoute>
  ),
}
```

### useAuth Hook

The `useAuth` hook provides access to authentication state and methods.

```tsx
import { useAuth } from "./lib/auth/authContext";

function YourComponent() {
  const { 
    user,             // The current user object or null
    isAuthenticated,  // Boolean indicating if user is authenticated
    isLoading,        // Boolean indicating if auth state is loading
    login,            // Function to initiate login
    logout,           // Function to logout
    refreshUser       // Function to refresh user data
  } = useAuth();
  
  // Your component logic
}
```

## Authentication Flow

1. User clicks "Sign in with GitHub" button
2. User is redirected to GitHub for authentication
3. After successful authentication, GitHub redirects back to your app
4. The backend exchanges the code for an access token and creates a JWT
5. The JWT is stored in an HTTP-only cookie
6. The user is now authenticated and can access protected routes

## API Services

### authService

The `authService` provides methods to interact with the authentication API:

- `checkAuth()`: Checks if the user is authenticated
- `getCurrentUser()`: Gets the current user information
- `loginWithProvider(provider)`: Initiates login with a provider
- `logout()`: Logs out the user

## Environment Variables

Make sure to set the following environment variables in your `.env` file:

```
VITE_WORKFLOW_API_URL=your_api_url
```

## Security Considerations

- JWT tokens are stored in HTTP-only cookies for security
- CSRF protection is implemented
- Secure, SameSite cookies are used
- Short-lived tokens minimize risk 