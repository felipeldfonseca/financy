import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, uniqueEmail, VALID_PASSWORD } from './utils/app';

describe('Transactions (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  const signUp = async (prefix: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail(prefix),
        firstName: 'Trans',
        lastName: 'Actions',
        password: VALID_PASSWORD,
      })
      .expect(201);

    return response.body.access_token;
  };

  const groceries = {
    amount: 50,
    description: 'Test grocery shopping',
    type: 'expense',
    category: 'food',
    subcategory: 'groceries',
    dashboardCategory: 'fooddining',
    currency: 'BRL',
    date: '2026-08-06',
  };

  const create = (payload: Record<string, unknown> = {}, authToken = token) =>
    request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...groceries, ...payload });

  beforeAll(async () => {
    app = await createTestApp();
    token = await signUp('owner');
    otherToken = await signUp('stranger');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('stores the two-tier categories exactly as sent', async () => {
    const response = await create().expect(201);

    expect(response.body).toMatchObject({
      description: 'Test grocery shopping',
      type: 'expense',
      category: 'food',
      subcategory: 'groceries',
      // Regression guard: this column reached production months after the code
      // that depends on it, breaking every transaction query.
      dashboardCategory: 'fooddining',
    });
    expect(Number(response.body.amount)).toBe(50);
  });

  it('rejects a dashboard category outside the allowed set', async () => {
    await create({ dashboardCategory: 'not-a-real-category' }).expect(400);
  });

  it.each([
    ['a zero amount', { amount: 0 }],
    ['a negative amount', { amount: -10 }],
    ['an unknown transaction type', { type: 'donation' }],
    ['a missing description', { description: undefined }],
  ])('rejects %s', async (_case, payload) => {
    await create(payload).expect(400);
  });

  it('lists the transaction and summarises it', async () => {
    await create({ description: 'Listed expense' }).expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.transactions.length).toBeGreaterThan(0);
    expect(response.body).toHaveProperty('total');
    expect(response.body.summary.totalExpenses).toBeGreaterThan(0);
    expect(
      response.body.transactions.some((t: any) => t.description === 'Listed expense'),
    ).toBe(true);
  });

  it('filters by dashboard category', async () => {
    await create({ description: 'Filtered groceries' }).expect(201);
    await create({
      description: 'Filtered fuel',
      category: 'transportation',
      subcategory: 'fuel',
      dashboardCategory: 'transportation',
    }).expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/v1/transactions')
      .query({ dashboardCategory: 'transportation' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.transactions.length).toBeGreaterThan(0);
    expect(
      response.body.transactions.every((t: any) => t.dashboardCategory === 'transportation'),
    ).toBe(true);
  });

  it('updates and deletes a transaction', async () => {
    const created = await create({ description: 'To be edited' }).expect(201);
    const id = created.body.id;

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/transactions/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 55 })
      .expect(200);

    expect(Number(updated.body.amount)).toBe(55);

    await request(app.getHttpServer())
      .delete(`/api/v1/transactions/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/transactions/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  describe('contexts kept out of the personal finances', () => {
    let workContextId: string;
    let sideContextId: string;

    beforeAll(async () => {
      // A work context whose expenses the company pays — configured out of
      // the poster's personal finances — and a side project left at the
      // default, which counts.
      const work = await request(app.getHttpServer())
        .post('/api/v1/contexts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Trabalho',
          type: 'business',
          defaultCurrency: 'BRL',
          settings: { includeInPersonalFinances: false },
        })
        .expect(201);
      workContextId = work.body.id;

      const side = await request(app.getHttpServer())
        .post('/api/v1/contexts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Projeto Pessoal', type: 'project', defaultCurrency: 'BRL' })
        .expect(201);
      sideContextId = side.body.id;

      await create({ description: 'Almoço do trabalho', contextId: workContextId, date: '2026-08-11' }).expect(201);
      await create({ description: 'Domínio do projeto', contextId: sideContextId, date: '2026-08-11' }).expect(201);
    });

    it('keeps a not-my-pocket context out of the personal list and summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const descriptions = response.body.transactions.map((t: any) => t.description);
      expect(descriptions).not.toContain('Almoço do trabalho');
      expect(descriptions).toContain('Domínio do projeto');
    });

    it('still shows everything inside the context own view', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({ contextId: workContextId })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.transactions.map((t: any) => t.description)).toContain(
        'Almoço do trabalho',
      );
    });

    it('keeps the excluded expense off the personal calendar', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions/calendar')
        .query({ month: '2026-08' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const day = (response.body.days ?? response.body).find?.(
        (entry: any) => String(entry.date).slice(0, 10) === '2026-08-11',
      );
      // Only the side project's 50 counts on that day; work's 50 stays out.
      expect(Number(day?.expense ?? day?.expenses ?? 0)).toBe(50);
    });

    it('starts counting again the moment the setting is turned back on', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/contexts/${workContextId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ settings: { includeInPersonalFinances: true } })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.transactions.map((t: any) => t.description)).toContain(
        'Almoço do trabalho',
      );

      // Back off again, so this suite leaves no surprises for later tests.
      await request(app.getHttpServer())
        .patch(`/api/v1/contexts/${workContextId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ settings: { includeInPersonalFinances: false } })
        .expect(200);
    });
  });

  describe('isolation between accounts', () => {
    it('hides one user transactions from another', async () => {
      const created = await create({ description: 'Private to owner' }).expect(201);

      await request(app.getHttpServer())
        .get(`/api/v1/transactions/${created.body.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      const strangerList = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect(
        strangerList.body.transactions.some((t: any) => t.description === 'Private to owner'),
      ).toBe(false);
    });

    it('refuses edits and deletes from another account', async () => {
      const created = await create({ description: 'Owner only' }).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/transactions/${created.body.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ amount: 999 })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/v1/transactions/${created.body.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
