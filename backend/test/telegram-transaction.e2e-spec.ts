import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, uniqueEmail, VALID_PASSWORD } from './utils/app';
import { normalizeDashboardCategory } from '../src/transactions/category-normalizer';

/**
 * A receipt read by the bot produces a category the same way text messages do,
 * then that transaction has to show up correctly on the web dashboard. This
 * checks the seam the bot's confirm step relies on: a normalized category is
 * stored, filters find it, and the summary counts it — instead of everything
 * the bot creates landing in "Other".
 */
describe('Bot-created transactions on the dashboard (e2e)', () => {
  let app: INestApplication;
  let token: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  // Mirrors telegram.service buildTransactionPayload: whatever the model
  // answered becomes a dashboard key, stored in both fields.
  const asBotWould = (rawCategory: string, type = 'expense') => {
    const dashboardCategory = normalizeDashboardCategory(type, rawCategory);
    return {
      amount: 42.5,
      description: 'Grocery run',
      type,
      currency: 'BRL',
      category: dashboardCategory,
      dashboardCategory,
      date: '2026-08-06',
    };
  };

  beforeAll(async () => {
    app = await createTestApp();
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail('bot'), firstName: 'Bot', lastName: 'User', password: VALID_PASSWORD })
      .expect(201);
    token = registration.body.access_token;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('files a receipt whose model said "Food & Dining" under food, not other', async () => {
    // The model returned a human-readable name, the exact case the old code
    // stored verbatim and the dashboard could not group.
    const created = await request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set(auth())
      .send(asBotWould('Food & Dining'))
      .expect(201);

    expect(created.body.dashboardCategory).toBe('fooddining');

    const filtered = await request(app.getHttpServer())
      .get('/api/v1/transactions')
      .query({ dashboardCategory: 'fooddining' })
      .set(auth())
      .expect(200);

    expect(filtered.body.transactions.map((t: any) => t.id)).toContain(created.body.id);
  });

  it('files a pharmacy receipt under health, not other', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set(auth())
      .send({ ...asBotWould('Pharmacy'), description: 'Drugstore' })
      .expect(201);

    expect(created.body.dashboardCategory).toBe('healthfitness');
  });

  it('accepts a receipt the model already answered with a key', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set(auth())
      .send(asBotWould('transportation'))
      .expect(201);

    expect(created.body.dashboardCategory).toBe('transportation');
  });

  it('never stores a category the dashboard cannot place', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set(auth())
      .send(asBotWould('Some Unknown Merchant Type'))
      .expect(201);

    // Falls back to a real key rather than free text.
    expect(created.body.dashboardCategory).toBe('other');
  });
});
