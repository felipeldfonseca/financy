import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, uniqueEmail, VALID_PASSWORD } from './utils/app';

const DEPLOYED_FRONTEND = 'https://financy-frontend.vercel.app';

describe('Application (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // configureApp reads this when building the CORS allow-list.
    process.env.FRONTEND_URL = DEPLOYED_FRONTEND;
    app = await createTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('serves the health endpoint under the API prefix', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok' });
    expect(response.body).toHaveProperty('timestamp');
  });

  describe('CORS', () => {
    /**
     * Regression guard: the deployed frontend origin was once replaced by a
     * hardcoded localhost value, which blocked every browser call to the API.
     */
    it('allows the deployed frontend origin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Origin', DEPLOYED_FRONTEND)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(DEPLOYED_FRONTEND);
    });

    it('allows local development origins', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:3001')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    });

    it('does not allow an unknown origin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Origin', 'https://attacker.example')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('answers the preflight a browser sends before POSTing credentials', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/v1/auth/register')
        .set('Origin', DEPLOYED_FRONTEND)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type');

      expect(response.status).toBeLessThan(300);
      expect(response.headers['access-control-allow-origin']).toBe(DEPLOYED_FRONTEND);
    });
  });

  describe('Telegram webhook', () => {
    const update = {
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: 1, is_bot: false, first_name: 'Forged' },
        chat: { id: 1, type: 'private' },
        date: 1786000000,
        text: 'Spent 999 on something',
      },
    };

    it('rejects updates that do not carry the shared secret', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/telegram')
        .send(update)
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/telegram')
        .set('X-Telegram-Bot-Api-Secret-Token', 'guessed-secret')
        .send(update)
        .expect(401);
    });

    it('keeps the setup endpoint behind authentication', async () => {
      await request(app.getHttpServer()).post('/api/v1/webhooks/telegram/setup').expect(401);
    });
  });

  describe('malicious input', () => {
    it('treats SQL injection attempts as ordinary text', async () => {
      const registration = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail('injection'),
          firstName: 'Robert',
          lastName: 'Tables',
          password: VALID_PASSWORD,
        })
        .expect(201);

      const token = registration.body.access_token;
      const injection = "'; DROP TABLE transactions; --";

      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 10,
          description: injection,
          type: 'expense',
          category: 'food',
        })
        .expect(201);

      await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({ search: injection })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // The table survives, so the payload was bound as a parameter.
      const list = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(list.body.transactions.some((t: any) => t.description === injection)).toBe(true);
    });
  });
});
