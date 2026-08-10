import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, uniqueEmail, VALID_PASSWORD } from './utils/app';

/**
 * The throttler was configured months ago but its guard was never registered,
 * so the limits existed only on paper and login accepted unlimited attempts.
 * These tests keep the guard wired up.
 *
 * Each spec file boots its own application, so the counters start clean here
 * and this suite cannot exhaust the budget of any other.
 */
describe('Rate limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('stops repeated password guessing on the login endpoint', async () => {
    const email = uniqueEmail('bruteforce');

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, firstName: 'Brute', lastName: 'Force', password: VALID_PASSWORD })
      .expect(201);

    const statuses: number[] = [];

    // The limit is ten a minute; a few more attempts must be turned away.
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: `Wrong@${attempt}` });

      statuses.push(response.status);
    }

    expect(statuses).toContain(429);
    expect(statuses.filter((status) => status === 401).length).toBeLessThanOrEqual(10);
  });

  it('keeps rejecting the attacker even with the correct password', async () => {
    // The previous test exhausted this address's budget; the limiter must not
    // let a guessed-right password through afterwards.
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail('other'), password: VALID_PASSWORD });

    expect(response.status).toBe(429);
  });

  it('answers with a retry hint rather than a bare failure', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail('hint'), password: VALID_PASSWORD });

    expect(response.status).toBe(429);
    expect(response.headers).toHaveProperty('retry-after');
  });

  it('cannot be bypassed by forging X-Forwarded-For', async () => {
    // In production the proxy appends the real client address as the last
    // entry, so only that one counts. Prepending fake values — what an
    // attacker controls — must not buy a fresh budget.
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 14; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', `10.0.0.${attempt}, 203.0.113.7`)
        .send({ email: uniqueEmail('spoof'), password: VALID_PASSWORD });

      statuses.push(response.status);
    }

    expect(statuses).toContain(429);
  });

  it('leaves ordinary endpoints usable', async () => {
    // Health checks and normal browsing share a far more generous budget.
    for (let attempt = 0; attempt < 15; attempt += 1) {
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    }
  });
});
