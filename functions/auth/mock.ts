/// <reference types="@cloudflare/workers-types" />
import { Env } from './jwt';

export interface MockUser {
  id: string;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export const MOCK_USER: MockUser = {
  id: 'mock-user-id',
  login: 'mock-user',
  name: 'Mock User',
  email: 'mock@example.com',
  avatar_url: 'https://avatars.githubusercontent.com/u/0',
};

export const isMockAuthEnabled = (env: Env): boolean => {
  return env.MOCK_AUTH === 'true' || env.MOCK_AUTH === '1';
};

export const createMockResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const createMockAuthResponse = () => {
  const token = 'mock-jwt-token';
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`,
    },
  });
}; 