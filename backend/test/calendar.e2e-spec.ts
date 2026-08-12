import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, uniqueEmail, VALID_PASSWORD } from './utils/app';

interface Account {
  token: string;
  email: string;
  id: string;
}

/**
 * The calendar heatmap's data: per-day totals, aggregated server-side, scoped
 * exactly like the transaction list. Plus the budget's storage: a monthly
 * limit kept in the context's settings.
 */
describe('Planning calendar (e2e)', () => {
  let app: INestApplication;
  let owner: Account;
  let member: Account;
  let stranger: Account;
  let contextId: string;

  const auth = (account: Account) => ({ Authorization: `Bearer ${account.token}` });

  const signUp = async (prefix: string): Promise<Account> => {
    const email = uniqueEmail(prefix);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, firstName: 'Cal', lastName: prefix, password: VALID_PASSWORD })
      .expect(201);
    return { token: response.body.access_token, email, id: response.body.user.id };
  };

  const addTransaction = (
    account: Account,
    body: Record<string, unknown>,
    targetContext?: string,
  ) =>
    request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set(auth(account))
      .query(targetContext ? { contextId: targetContext } : {})
      .send({
        amount: 10,
        description: 'calendar seed',
        type: 'expense',
        dashboardCategory: 'other',
        currency: 'USD',
        ...body,
      });

  beforeAll(async () => {
    app = await createTestApp();
    owner = await signUp('owner');
    member = await signUp('member');
    stranger = await signUp('stranger');

    const created = await request(app.getHttpServer())
      .post('/api/v1/contexts')
      .set(auth(owner))
      .send({ name: 'Casa Calendário', type: 'family', defaultCurrency: 'USD' })
      .expect(201);
    contextId = created.body.id;

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/contexts/${contextId}/invite`)
      .set(auth(owner))
      .send({ email: member.email, role: 'member' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/contexts/invitations/${invitation.body.inviteToken}/accept`)
      .set(auth(member))
      .expect(201);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('per-day aggregation', () => {
    beforeAll(async () => {
      await addTransaction(owner, { amount: 1000, type: 'income', date: '2027-05-03', dashboardCategory: 'employment' }).expect(201);
      await addTransaction(owner, { amount: 200.5, date: '2027-05-03' }).expect(201);
      await addTransaction(owner, { amount: 49.5, date: '2027-05-15' }).expect(201);
      await addTransaction(owner, { amount: 77, date: '2027-06-01' }).expect(201);

      // A cancelled transaction is corrected history, not money moved.
      const cancelled = await addTransaction(owner, { amount: 500, date: '2027-05-20' }).expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/transactions/${cancelled.body.id}/cancel`)
        .set(auth(owner))
        .expect(201);
    });

    it('sums each day and keeps the calendar date intact', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions/calendar')
        .query({ month: '2027-05' })
        .set(auth(owner))
        .expect(200);

      const byDate = Object.fromEntries(response.body.map((row: any) => [row.date, row]));

      expect(byDate['2027-05-03']).toMatchObject({ count: 2 });
      expect(Number(byDate['2027-05-03'].income)).toBeCloseTo(1000);
      expect(Number(byDate['2027-05-03'].expense)).toBeCloseTo(200.5);
      expect(Number(byDate['2027-05-15'].expense)).toBeCloseTo(49.5);
    });

    it('keeps other months, cancelled entries, and other users out', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions/calendar')
        .query({ month: '2027-05' })
        .set(auth(owner))
        .expect(200);

      const dates = response.body.map((row: any) => row.date);
      expect(dates).not.toContain('2027-06-01');
      expect(dates).not.toContain('2027-05-20');

      const strangerView = await request(app.getHttpServer())
        .get('/api/v1/transactions/calendar')
        .query({ month: '2027-05' })
        .set(auth(stranger))
        .expect(200);
      expect(strangerView.body).toEqual([]);
    });

    it('rejects a malformed month', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions/calendar')
        .query({ month: '2027-13' })
        .set(auth(owner))
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/v1/transactions/calendar')
        .set(auth(owner))
        .expect(400);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions/calendar')
        .query({ month: '2027-05' })
        .expect(401);
    });
  });

  describe('shared context scope', () => {
    beforeAll(async () => {
      await addTransaction(owner, { amount: 30, date: '2027-05-10' }, contextId).expect(201);
      await addTransaction(member, { amount: 20, date: '2027-05-10' }, contextId).expect(201);
    });

    it('aggregates every member of the context into the same day', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions/calendar')
        .query({ month: '2027-05', contextId })
        .set(auth(member))
        .expect(200);

      const day = response.body.find((row: any) => row.date === '2027-05-10');
      expect(day).toBeDefined();
      expect(Number(day.expense)).toBeCloseTo(50);
      expect(Number(day.count)).toBe(2);
    });

    it('refuses the context view to a non-member', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions/calendar')
        .query({ month: '2027-05', contextId })
        .set(auth(stranger))
        .expect(403);
    });
  });

  describe('monthly budget stored on the context', () => {
    it('lets the owner set and read a monthly budget in settings', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/contexts/${contextId}`)
        .set(auth(owner))
        .send({ settings: { monthlyBudget: 3000 } })
        .expect(200);

      const fetched = await request(app.getHttpServer())
        .get(`/api/v1/contexts/${contextId}`)
        .set(auth(owner))
        .expect(200);

      expect(fetched.body.settings).toMatchObject({ monthlyBudget: 3000 });
    });

    it('refuses a plain member changing the budget', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/contexts/${contextId}`)
        .set(auth(member))
        .send({ settings: { monthlyBudget: 1 } })
        .expect(403);
    });
  });
});
