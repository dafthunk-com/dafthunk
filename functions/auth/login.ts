/// <reference types="@cloudflare/workers-types" />
import { Env } from './jwt';
import { generateAuthorizationUrl, generateState, getProviderConfig } from './providers';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    // Get the provider from the query parameters
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider');
        
    if (!provider) {
      return new Response(JSON.stringify({ error: 'Provider is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if the provider is supported and environment variables are set
    const config = getProviderConfig(provider, env);
    if (!config) {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for required environment variables
    if (!env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (provider === 'github' && (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET)) {
      console.error('GitHub OAuth credentials are not set');
      return new Response(JSON.stringify({ error: 'Server configuration error for GitHub OAuth' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate a random state for CSRF protection
    const state = generateState();
    
    // Get the redirect URI from the request or use a default
    // Include the provider in the callback URL
    const redirectUri = `${url.origin}/auth/callback?provider=${provider}`;
    
    // Generate the authorization URL
    const authUrl = generateAuthorizationUrl(provider, redirectUri, state, env);
    
    if (!authUrl) {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`Redirecting to OAuth provider (${provider}):`, authUrl);
    
    // Set the state in a cookie and redirect directly to the authorization URL
    return new Response(null, {
      status: 302, // HTTP redirect
      headers: {
        'Location': authUrl,
        'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`
      }
    });
  } catch (error) {
    console.error('Error in login function:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}; 