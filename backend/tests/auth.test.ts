import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app';
import { pool, query } from '../src/db';
import { resetRateLimits } from '../src/middleware/rateLimit';
import { hashToken, SESSION_COOKIE_NAME } from '../src/middleware/auth';

describe('Auth & Session Integration Tests', () => {
  const testEmail = `test.user.${Date.now()}@voltshare.in`;
  const testPassword = 'StrongPassword123!';
  let validSessionCookie: string = '';

  beforeEach(() => {
    resetRateLimits();
  });

  after(async () => {
    // Clean up test data
    try {
      await query('DELETE FROM public.users WHERE email LIKE $1', ['test.user.%@voltshare.in']);
    } catch (_) {}
    await pool.end();
  });

  test('1. Protected route refuses unauthenticated requests with 401', async () => {
    const resMe = await request(app).get('/api/auth/me');
    assert.strictEqual(resMe.status, 401);
    assert.match(resMe.body.error, /Unauthorized/);

    const resWallet = await request(app).get('/api/wallet');
    assert.strictEqual(resWallet.status, 401);
    assert.match(resWallet.body.error, /Unauthorized/);
  });

  test('2. Signup then Login succeeds with valid email and password', async () => {
    // A. Signup
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: testEmail,
        password: testPassword,
        fullName: 'Test Prosumer',
      });

    assert.strictEqual(signupRes.status, 201);
    assert.strictEqual(signupRes.body.user.email, testEmail.toLowerCase());
    assert.ok(signupRes.body.token, 'Signup should return session token');

    // Verify session cookie was set
    const signupCookies = signupRes.headers['set-cookie'];
    assert.ok(signupCookies, 'Set-Cookie header should be present');
    const cookieHeader = Array.isArray(signupCookies) ? signupCookies.join('; ') : signupCookies;
    assert.ok(cookieHeader.includes(SESSION_COOKIE_NAME), 'Session cookie should be named vs_session');
    assert.ok(cookieHeader.includes('HttpOnly'), 'Cookie must be HttpOnly');

    // B. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail.toUpperCase(), // Test case-insensitivity
        password: testPassword,
      });

    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.user.email, testEmail.toLowerCase());

    const loginCookies = loginRes.headers['set-cookie'];
    validSessionCookie = Array.isArray(loginCookies) ? loginCookies[0] : loginCookies;

    // C. Current user endpoint (/me) with session cookie
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', validSessionCookie);

    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.email, testEmail.toLowerCase());
    assert.strictEqual(meRes.body.user.full_name, 'Test Prosumer');
  });

  test('3. Wrong password is rejected with generic error', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'CompletelyWrongPassword!',
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Invalid email or password');
  });

  test('4. Unknown email is rejected with identical generic error', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent.user@voltshare.in',
        password: 'SomeRandomPassword123!',
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Invalid email or password');
  });

  test('5. Expired session is rejected by middleware', async () => {
    // Generate an expired session directly in the database
    const expiredRawToken = 'expired000000000000000000000000000000000000000000000000000000000';
    const expiredTokenHash = hashToken(expiredRawToken);

    const userRes = await query('SELECT id FROM public.users WHERE email = $1', [testEmail.toLowerCase()]);
    const userId = userRes.rows[0].id;

    await query(
      `INSERT INTO public.sessions (id, user_id, token_hash, expires_at, created_at)
       VALUES (gen_random_uuid(), $1, $2, now() - INTERVAL '1 hour', now() - INTERVAL '2 hours')`,
      [userId, expiredTokenHash]
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${expiredRawToken}; Path=/; HttpOnly`);

    assert.strictEqual(res.status, 401);
    assert.match(res.body.error, /Unauthorized/);
  });

  test('6. Logout invalidates the session and deletes the database row', async () => {
    // Login to get a fresh session
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    assert.strictEqual(loginRes.status, 200);
    const token = loginRes.body.token;
    const cookie = loginRes.headers['set-cookie'][0];

    // Confirm session exists in database
    const tokenHash = hashToken(token);
    const beforeRes = await query('SELECT id FROM public.sessions WHERE token_hash = $1', [tokenHash]);
    assert.strictEqual(beforeRes.rows.length, 1, 'Session row should exist in database before logout');

    // Call logout endpoint
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie);

    assert.strictEqual(logoutRes.status, 200);
    assert.strictEqual(logoutRes.body.message, 'Logged out successfully');

    // Verify session row was removed from database
    const afterRes = await query('SELECT id FROM public.sessions WHERE token_hash = $1', [tokenHash]);
    assert.strictEqual(afterRes.rows.length, 0, 'Session row must be deleted after logout');

    // Calling /me with that token must now fail with 401
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    assert.strictEqual(meRes.status, 401);
  });
});
