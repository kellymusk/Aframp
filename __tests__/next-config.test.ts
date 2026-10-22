import { describe, it, expect } from 'vitest';

// Mirror of the validation logic in next.config.mjs so it can be unit tested
// without importing the Next.js config module (which has side effects).
function validateApiUrl(rawValue: string | undefined): URL {
  if (!rawValue) {
    throw new Error('NEXT_API_URL is not set');
  }

  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(`NEXT_API_URL is not a valid absolute URL: "${rawValue}"`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`NEXT_API_URL must use http or https, got "${parsed.protocol}"`);
  }

  return parsed;
}

describe('NEXT_API_URL validation', () => {
  it('accepts an absolute https URL', () => {
    const parsed = validateApiUrl('https://api.example.com');
    expect(parsed.origin).toBe('https://api.example.com');
  });

  it('accepts an absolute http URL', () => {
    const parsed = validateApiUrl('http://localhost:8000');
    expect(parsed.origin).toBe('http://localhost:8000');
  });

  it('rejects a missing value', () => {
    expect(() => validateApiUrl(undefined)).toThrow(/not set/);
  });

  it('rejects a relative URL', () => {
    expect(() => validateApiUrl('/backend')).toThrow(/not a valid absolute URL/);
  });

  it('rejects a non-http(s) protocol', () => {
    expect(() => validateApiUrl('ftp://api.example.com')).toThrow(/must use http or https/);
  });

  it('rejects a malformed URL', () => {
    expect(() => validateApiUrl('not a url')).toThrow(/not a valid absolute URL/);
  });
});
