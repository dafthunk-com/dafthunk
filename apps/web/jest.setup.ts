import '@testing-library/jest-dom';

// Mock the Request global for Next.js route handlers
class MockRequest extends Request {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init);
  }
}
global.Request = MockRequest as typeof Request;

// Mock the crypto.randomUUID globally
global.crypto = {
  ...global.crypto,
  randomUUID: () => '123e4567-e89b-12d3-a456-426614174000' as `${string}-${string}-${string}-${string}-${string}`,
} as typeof global.crypto; 