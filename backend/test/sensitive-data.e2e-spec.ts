import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, uniqueEmail, VALID_PASSWORD } from './utils/app';

/**
 * Entities carry an @Exclude() marker on the password column, but that marker
 * does nothing unless a serializer interceptor is applied. It was not, so every
 * endpoint returning an entity with a User relation shipped the bcrypt hash
 * with it — including the member list of a shared context, which hands one
 * member the hashes of all the others. These tests keep the serializer wired up.
 */
describe('Sensitive data in responses (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let contextId: string;
  let transactionId: string;

  const bcryptHash = /\$2[aby]\$/;

  beforeAll(async () => {
    app = await createTestApp();

    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('sensitive'),
        firstName: 'Sensitive',
        lastName: 'Data',
        password: VALID_PASSWORD,
      })
      .expect(201);

    token = registration.body.access_token;

    const context = await request(app.getHttpServer())
      .post('/api/v1/contexts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Serialization', type: 'family' })
      .expect(201);

    contextId = context.body.id;

    const transaction = await request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .query({ contextId })
      .send({
        amount: 10,
        description: 'Serialization check',
        type: 'expense',
        category: 'food',
        date: '2026-08-06',
      })
      .expect(201);

    transactionId = transaction.body.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  const get = (path: string, query: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get(path)
      .query(query)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

  it('never returns a password hash', async () => {
    const responses = await Promise.all([
      get('/api/v1/auth/profile'),
      get('/api/v1/contexts'),
      get(`/api/v1/contexts/${contextId}`),
      get(`/api/v1/contexts/${contextId}/members`),
      get('/api/v1/transactions'),
      get(`/api/v1/transactions/${transactionId}`),
    ]);

    responses.forEach((response) => {
      const body = JSON.stringify(response.body);
      expect(body).not.toMatch(bcryptHash);
      expect(body).not.toContain('"password"');
    });
  });

  it('never returns a password hash from the shared context view', async () => {
    const response = await get('/api/v1/transactions', { contextId });
    const body = JSON.stringify(response.body);

    expect(body).not.toMatch(bcryptHash);
    expect(body).not.toContain('"password"');
  });

  it('identifies who recorded each transaction in a shared context', async () => {
    const response = await get('/api/v1/transactions', { contextId });
    const [transaction] = response.body.transactions;

    expect(transaction.user).toEqual({
      id: expect.any(String),
      firstName: 'Sensitive',
      lastName: 'Data',
    });
    // Nothing beyond the name is needed to label a row.
    expect(transaction.user).not.toHaveProperty('email');
  });

  it('tells the caller what role they hold in each context', async () => {
    const response = await get('/api/v1/contexts');

    expect(response.body.find((context: any) => context.id === contextId).memberRole).toBe('owner');
  });
});
