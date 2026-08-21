import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, uniqueEmail, VALID_PASSWORD } from './utils/app';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  const register = (overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail(),
        firstName: 'Test',
        lastName: 'User',
        password: VALID_PASSWORD,
        ...overrides,
      });

  describe('registration', () => {
    it('creates an account and returns a usable token', async () => {
      const response = await register().expect(201);

      expect(response.body.user).toMatchObject({
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        // Regression guard: this column was missing in production for months,
        // which made every registration fail.
        onboardingCompleted: false,
      });
      expect(response.body.access_token).toEqual(expect.any(String));
      expect(response.body.token_type).toBe('Bearer');
      // Password material must never travel back to the client.
      expect(JSON.stringify(response.body.user)).not.toContain(VALID_PASSWORD);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('lowercases the email so accounts cannot be duplicated by casing', async () => {
      const email = uniqueEmail('Casing');

      await register({ email: email.toUpperCase() }).expect(201);
      await register({ email: email.toLowerCase() }).expect(409);
    });

    it('rejects a duplicate email with 409', async () => {
      const email = uniqueEmail('duplicate');

      await register({ email }).expect(201);
      await register({ email }).expect(409);
    });

    it.each([
      ['too short', 'Ab1@'],
      ['no uppercase', 'senha@123'],
      ['no digit', 'Senha@abc'],
      ['no special character', 'Senha1234'],
    ])('rejects a password with %s', async (_case, password) => {
      await register({ password }).expect(400);
    });

    it('rejects a malformed email', async () => {
      await register({ email: 'not-an-email' }).expect(400);
    });

    it('rejects unknown fields instead of silently ignoring them', async () => {
      await register({ isActive: false, role: 'admin' }).expect(400);
    });
  });

  describe('login', () => {
    it('accepts the registered credentials and rejects a wrong password', async () => {
      const email = uniqueEmail('login');
      await register({ email }).expect(201);

      const success = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: VALID_PASSWORD })
        .expect(200);

      expect(success.body.access_token).toEqual(expect.any(String));

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Errada@123' })
        .expect(401);
    });

    it('rejects an unknown account without revealing that it does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail('ghost'), password: VALID_PASSWORD })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('Telegram link status', () => {
    const linkTelegram = (token: string, body: Record<string, unknown>) =>
      request(app.getHttpServer())
        .post('/api/v1/users/link-telegram')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    const getProfile = (token: string) =>
      request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`);

    /**
     * Regression guard: isTelegramLinked is computed by a @Transform from
     * telegramUserId, and the global serializer used to run that transform a
     * second time while flattening the response — by then the DTO no longer
     * carries telegramUserId (it is excluded), so the second pass overwrote
     * true with false and the app showed every linked account as "not
     * connected".
     */
    it('reports a linked account as linked, without leaking the telegram id', async () => {
      const registration = await register({ email: uniqueEmail('tg-linked') }).expect(201);
      const token = registration.body.access_token;

      const linked = await linkTelegram(token, {
        telegramUserId: `990${Date.now()}`,
        telegramUsername: 'linked_user',
      }).expect(201);

      expect(linked.body.isTelegramLinked).toBe(true);
      expect(linked.body).not.toHaveProperty('telegramUserId');

      const profile = await getProfile(token).expect(200);

      expect(profile.body.user.isTelegramLinked).toBe(true);
      expect(profile.body.user.telegramUsername).toBe('linked_user');
      // The raw telegram id is bot-internal; only the boolean leaves the API.
      expect(profile.body.user).not.toHaveProperty('telegramUserId');
    });

    it('reports an account that never linked as not linked', async () => {
      const registration = await register({ email: uniqueEmail('tg-never') }).expect(201);

      const profile = await getProfile(registration.body.access_token).expect(200);

      expect(profile.body.user.isTelegramLinked).toBe(false);
    });

    /**
     * A Telegram account with no public @username links with only the id set.
     * Asking for a fresh token in that state must refuse — not treat the link
     * as "partial" and silently destroy it, which is what used to happen.
     */
    it('refuses a new linking token while linked, keeping the link intact', async () => {
      const registration = await register({ email: uniqueEmail('tg-no-username') }).expect(201);
      const token = registration.body.access_token;

      await linkTelegram(token, { telegramUserId: `991${Date.now()}` }).expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/users/generate-telegram-link-token')
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      const profile = await getProfile(token).expect(200);
      expect(profile.body.user.isTelegramLinked).toBe(true);
    });
  });

  describe('protected routes', () => {
    it('requires a token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/profile').expect(401);
      await request(app.getHttpServer()).get('/api/v1/transactions').expect(401);
    });

    it('rejects a forged or malformed token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer not.a.real.token')
        .expect(401);
    });

    it('serves the profile and refreshes the token for a signed-in user', async () => {
      const email = uniqueEmail('profile');
      const registration = await register({ email }).expect(201);
      const token = registration.body.access_token;

      const profile = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profile.body.user.email).toBe(email.toLowerCase());

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
    });
  });
});
