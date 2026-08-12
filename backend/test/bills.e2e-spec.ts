import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, uniqueEmail, VALID_PASSWORD } from './utils/app';

interface Account {
  token: string;
  email: string;
  id: string;
}

/**
 * Bills are intentions, transactions are facts. This suite covers the seam
 * between them: paying a bill must create the expense in the payer's own name
 * and link the two — and the permission rules of shared contexts must hold.
 */
describe('Bills (e2e)', () => {
  let app: INestApplication;
  let owner: Account;
  let member: Account;
  let viewer: Account;
  let stranger: Account;
  let contextId: string;

  const signUp = async (prefix: string): Promise<Account> => {
    const email = uniqueEmail(prefix);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, firstName: 'Bill', lastName: prefix, password: VALID_PASSWORD })
      .expect(201);

    return { token: response.body.access_token, email, id: response.body.user.id };
  };

  const auth = (account: Account) => ({ Authorization: `Bearer ${account.token}` });

  const isoDaysFromNow = (days: number): string => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const createBill = (account: Account, overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/bills')
      .set(auth(account))
      .send({
        description: 'Internet Alares',
        amount: 101.08,
        dueDate: isoDaysFromNow(5),
        category: 'housing',
        dashboardCategory: 'housing',
        merchantName: 'Alares',
        ...overrides,
      });

  const invite = async (account: Account, role: 'member' | 'viewer'): Promise<void> => {
    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/contexts/${contextId}/invite`)
      .set(auth(owner))
      .send({ email: account.email, role })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/contexts/invitations/${invitation.body.inviteToken}/accept`)
      .set(auth(account))
      .expect(201);
  };

  beforeAll(async () => {
    app = await createTestApp();
    owner = await signUp('owner');
    member = await signUp('member');
    viewer = await signUp('viewer');
    stranger = await signUp('stranger');

    const created = await request(app.getHttpServer())
      .post('/api/v1/contexts')
      .set(auth(owner))
      .send({ name: 'Casa', type: 'family', defaultCurrency: 'USD' })
      .expect(201);
    contextId = created.body.id;

    await invite(member, 'member');
    await invite(viewer, 'viewer');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('personal bills', () => {
    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/bills').expect(401);
    });

    it('creates a bill in the personal context with sensible defaults', async () => {
      const response = await createBill(owner).expect(201);

      expect(response.body.status).toBe('open');
      expect(response.body.currency).toBe('USD');
      expect(response.body.contextId).toMatch(/^[0-9a-f-]{36}$/);
      expect(response.body.userId).toBe(owner.id);
      expect(response.body.isOverdue).toBe(false);
    });

    it('derives overdue from an open bill whose due date has passed', async () => {
      const overdue = await createBill(owner, {
        description: 'Fatura atrasada',
        dueDate: isoDaysFromNow(-3),
      }).expect(201);

      expect(overdue.body.isOverdue).toBe(true);

      const upcoming = await createBill(owner, {
        description: 'Fatura futura',
        dueDate: isoDaysFromNow(10),
      }).expect(201);

      expect(upcoming.body.isOverdue).toBe(false);
    });

    it('lists open bills soonest due first', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/bills')
        .set(auth(owner))
        .expect(200);

      const descriptions = response.body.map((bill: any) => bill.description);
      expect(descriptions).toContain('Fatura atrasada');
      expect(descriptions).toContain('Fatura futura');

      const dueDates = response.body.map((bill: any) => bill.dueDate);
      expect([...dueDates].sort()).toEqual(dueDates);
    });

    it('filters by the month the due date falls in', async () => {
      await createBill(owner, { description: 'Conta de março', dueDate: '2027-03-10' }).expect(201);
      await createBill(owner, { description: 'Conta de abril', dueDate: '2027-04-05' }).expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/bills')
        .query({ month: '2027-03', status: 'all' })
        .set(auth(owner))
        .expect(200);

      const descriptions = response.body.map((bill: any) => bill.description);
      expect(descriptions).toContain('Conta de março');
      expect(descriptions).not.toContain('Conta de abril');
    });

    it('rejects installments that do not make sense together', async () => {
      await createBill(owner, { installmentNumber: 3 }).expect(400);
      await createBill(owner, { installmentNumber: 11, installmentTotal: 10 }).expect(400);
    });

    it('rejects a non-expense dashboard category', async () => {
      // 'employment' is an income category; bills are money going out.
      await createBill(owner, { dashboardCategory: 'employment' }).expect(400);
    });
  });

  describe('paying a bill', () => {
    it('records the settlement in the payer name and links it to the bill', async () => {
      const created = await createBill(owner, { description: 'Conta de luz' }).expect(201);

      const paid = await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(owner))
        .send({})
        .expect(201);

      expect(paid.body.bill.status).toBe('paid');
      expect(paid.body.bill.paidAt).toEqual(expect.any(String));
      expect(paid.body.bill.paidTransactionId).toBe(paid.body.transaction.id);
      expect(paid.body.bill.isOverdue).toBe(false);

      expect(paid.body.transaction.userId).toBe(owner.id);
      expect(paid.body.transaction.type).toBe('expense');
      expect(paid.body.transaction.description).toBe('Conta de luz');
      expect(Number(paid.body.transaction.amount)).toBeCloseTo(101.08);
      expect(paid.body.transaction.metadata).toMatchObject({ billId: created.body.id });
    });

    it('lets the payment record what was actually paid, keeping the billed amount', async () => {
      const created = await createBill(owner, { description: 'Conta com juros' }).expect(201);

      // Paid late: the settlement carries the fee, the bill keeps its amount.
      const paid = await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(owner))
        .send({ amount: 110.5, paidDate: isoDaysFromNow(0) })
        .expect(201);

      expect(Number(paid.body.transaction.amount)).toBeCloseTo(110.5);
      expect(Number(paid.body.bill.amount)).toBeCloseTo(101.08);
    });

    it('refuses to pay the same bill twice', async () => {
      const created = await createBill(owner, { description: 'Conta única' }).expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(owner))
        .send({})
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(owner))
        .send({})
        .expect(409);
    });

    it('drops a paid bill from the default open list', async () => {
      const created = await createBill(owner, { description: 'Some da lista' }).expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(owner))
        .send({})
        .expect(201);

      const open = await request(app.getHttpServer())
        .get('/api/v1/bills')
        .set(auth(owner))
        .expect(200);

      expect(open.body.map((bill: any) => bill.id)).not.toContain(created.body.id);

      const all = await request(app.getHttpServer())
        .get('/api/v1/bills')
        .query({ status: 'paid' })
        .set(auth(owner))
        .expect(200);

      expect(all.body.map((bill: any) => bill.id)).toContain(created.body.id);
    });

    it('reopens a paid bill without deleting the expense', async () => {
      const created = await createBill(owner, { description: 'Paga por engano' }).expect(201);

      const paid = await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(owner))
        .send({})
        .expect(201);

      const reopened = await request(app.getHttpServer())
        .patch(`/api/v1/bills/${created.body.id}`)
        .set(auth(owner))
        .send({ status: 'open' })
        .expect(200);

      expect(reopened.body.status).toBe('open');
      expect(reopened.body.paidTransactionId).toBeNull();
      expect(reopened.body.paidAt).toBeNull();

      // The expense the payment created is the user's to keep or delete.
      await request(app.getHttpServer())
        .get(`/api/v1/transactions/${paid.body.transaction.id}`)
        .set(auth(owner))
        .expect(200);
    });

    it('never accepts paid as a direct status change', async () => {
      const created = await createBill(owner, { description: 'Sem atalho' }).expect(201);

      // Marking paid without /pay would leave no settlement transaction.
      await request(app.getHttpServer())
        .patch(`/api/v1/bills/${created.body.id}`)
        .set(auth(owner))
        .send({ status: 'paid' })
        .expect(400);
    });
  });

  describe('bills in a shared context', () => {
    it('lets any member who can record expenses pay, in their own name', async () => {
      const created = await createBill(owner, {
        description: 'Aluguel da casa',
        contextId,
      }).expect(201);

      // The decision that shaped this feature: in a household whoever pays,
      // pays — and the expense belongs to them, not to whoever filed the bill.
      const paid = await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(member))
        .send({})
        .expect(201);

      expect(paid.body.transaction.userId).toBe(member.id);
      expect(paid.body.transaction.contextId).toBe(contextId);
      expect(paid.body.bill.status).toBe('paid');
    });

    it('shows context bills to every member, viewer included', async () => {
      const created = await createBill(owner, {
        description: 'Conta visível',
        contextId,
      }).expect(201);

      for (const account of [member, viewer]) {
        const response = await request(app.getHttpServer())
          .get('/api/v1/bills')
          .query({ contextId })
          .set(auth(account))
          .expect(200);

        expect(response.body.map((bill: any) => bill.id)).toContain(created.body.id);
      }
    });

    it('refuses a viewer paying or creating bills', async () => {
      const created = await createBill(owner, {
        description: 'Não é do viewer',
        contextId,
      }).expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(viewer))
        .send({})
        .expect(403);

      await createBill(viewer, { contextId }).expect(403);
    });

    it('applies the author-or-admin rule to editing and deleting', async () => {
      const ownersBill = await createBill(owner, {
        description: 'Do dono',
        contextId,
      }).expect(201);

      // A plain member may pay any bill, but not rewrite someone else's.
      await request(app.getHttpServer())
        .patch(`/api/v1/bills/${ownersBill.body.id}`)
        .set(auth(member))
        .send({ amount: 1 })
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/api/v1/bills/${ownersBill.body.id}`)
        .set(auth(member))
        .expect(403);

      const membersBill = await createBill(member, {
        description: 'Do membro',
        contextId,
      }).expect(201);

      // The owner moderates: correcting or removing anyone's bill.
      await request(app.getHttpServer())
        .patch(`/api/v1/bills/${membersBill.body.id}`)
        .set(auth(owner))
        .send({ description: 'Corrigida pelo dono' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/bills/${membersBill.body.id}`)
        .set(auth(owner))
        .expect(204);
    });

    it('hides everything from a non-member', async () => {
      const created = await createBill(owner, {
        description: 'Invisível para estranhos',
        contextId,
      }).expect(201);

      await request(app.getHttpServer())
        .get('/api/v1/bills')
        .query({ contextId })
        .set(auth(stranger))
        .expect(403);

      await request(app.getHttpServer())
        .get(`/api/v1/bills/${created.body.id}`)
        .set(auth(stranger))
        .expect(404);

      await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(stranger))
        .send({})
        .expect(404);

      await createBill(stranger, { contextId }).expect(403);
    });

    it('keeps context bills out of the personal list and vice versa', async () => {
      await createBill(owner, { description: 'Só minha' }).expect(201);

      const contextList = await request(app.getHttpServer())
        .get('/api/v1/bills')
        .query({ contextId, status: 'all' })
        .set(auth(owner))
        .expect(200);

      expect(contextList.body.map((bill: any) => bill.description)).not.toContain('Só minha');

      const personalList = await request(app.getHttpServer())
        .get('/api/v1/bills')
        .query({ status: 'all' })
        .set(auth(owner))
        .expect(200);

      expect(personalList.body.map((bill: any) => bill.description)).toContain('Só minha');
    });
  });

  describe('installments', () => {
    it('stores which installment of how many a bill is', async () => {
      const response = await createBill(owner, {
        description: 'Notebook 3/10',
        installmentNumber: 3,
        installmentTotal: 10,
      }).expect(201);

      expect(response.body.installmentNumber).toBe(3);
      expect(response.body.installmentTotal).toBe(10);
    });

    it('paying an installment spawns the next one, a month later', async () => {
      const created = await createBill(owner, {
        description: 'Geladeira parcelada',
        installmentNumber: 3,
        installmentTotal: 10,
        dueDate: '2027-08-12',
      }).expect(201);

      const paid = await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(owner))
        .send({})
        .expect(201);

      expect(paid.body.nextBill).toBeDefined();
      expect(paid.body.nextBill.installmentNumber).toBe(4);
      expect(paid.body.nextBill.installmentTotal).toBe(10);
      expect(paid.body.nextBill.status).toBe('open');
      expect(paid.body.nextBill.dueDate.slice(0, 10)).toBe('2027-09-12');
      expect(paid.body.nextBill.contextId).toBe(created.body.contextId);

      const open = await request(app.getHttpServer())
        .get('/api/v1/bills')
        .set(auth(owner))
        .expect(200);
      expect(open.body.map((bill: any) => bill.id)).toContain(paid.body.nextBill.id);
    });

    it('stops after the last installment', async () => {
      const created = await createBill(owner, {
        description: 'Última parcela',
        installmentNumber: 2,
        installmentTotal: 2,
      }).expect(201);

      const paid = await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(owner))
        .send({})
        .expect(201);

      expect(paid.body.nextBill).toBeUndefined();
    });
  });

  describe('recurring bills', () => {
    it('paying a monthly bill spawns the next occurrence, clamped to real days', async () => {
      // Due on the 31st: the next month has no 31st, so the successor lands
      // on its last day instead of drifting into March.
      const created = await createBill(owner, {
        description: 'Aluguel recorrente',
        recurrenceRule: 'monthly',
        dueDate: '2027-01-31',
      }).expect(201);

      const paid = await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(owner))
        .send({})
        .expect(201);

      expect(paid.body.nextBill.recurrenceRule).toBe('monthly');
      expect(paid.body.nextBill.dueDate.slice(0, 10)).toBe('2027-02-28');
    });

    it('leaves a one-off bill without a successor', async () => {
      const created = await createBill(owner, { description: 'Conta avulsa' }).expect(201);

      const paid = await request(app.getHttpServer())
        .post(`/api/v1/bills/${created.body.id}/pay`)
        .set(auth(owner))
        .send({})
        .expect(201);

      expect(paid.body.nextBill).toBeUndefined();
    });

    it('rejects a recurrence rule it cannot interpret', async () => {
      await createBill(owner, { recurrenceRule: 'every-full-moon' }).expect(400);
    });
  });
});
