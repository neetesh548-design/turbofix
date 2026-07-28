import { describe, expect, it } from 'vitest';
import { isTokenExpired, readAuth, safeRedirectPath } from '../utils/auth';

const jwt = (payload) => `x.${btoa(JSON.stringify(payload))}.x`;

describe('client authentication state', () => {
  it('accepts only explicit demo roles and valid unexpired sessions', () => {
    expect(isTokenExpired('demo:operator')).toBe(false);
    expect(isTokenExpired('demo:owner')).toBe(false);
    expect(isTokenExpired('demo:supervisor')).toBe(false);
    expect(isTokenExpired('demo:admin')).toBe(true);
    expect(isTokenExpired('demo-token-123')).toBe(true);
    expect(isTokenExpired(jwt({ exp: 2 }), 1000)).toBe(false);
    expect(isTokenExpired(jwt({ exp: 1 }), 1000)).toBe(true);
  });

  it('never reports signed in without both a valid token and user', () => {
    const values = new Map([['tf_token', 'demo:operator']]);
    expect(readAuth({ getItem: (key) => values.get(key) || null })).toEqual({ authed: false, user: null });
    values.set('tf_user', JSON.stringify({ name: 'Demo Operator', role: 'operator' }));
    expect(readAuth({ getItem: (key) => values.get(key) || null }).authed).toBe(true);
  });

  it('keeps post-login redirects inside the app', () => {
    expect(safeRedirectPath('/dashboard.html')).toBe('/dashboard.html');
    expect(safeRedirectPath('/TurboFix/tickets.html?status=open', '/TurboFix/')).toBe('/tickets.html?status=open');
    expect(safeRedirectPath('https://bad.example/path')).toBe('/dashboard.html');
    expect(safeRedirectPath('//bad.example/path')).toBe('/dashboard.html');
    expect(safeRedirectPath('/login.html')).toBe('/dashboard.html');
  });
});
