import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, uniqueEmail, VALID_PASSWORD } from './utils/app';

interface Account {
  token: string;
  email: string;
  id: string;
}

/**
 * Savings goals: the running total is the sum of a named trail of
 * contributions, each in its contributor's name — the household grammar
 * bills established, applied to money saved instead of money owed.
 */
describe('Goals (e2e)', () => {
  let app: INestApplication;
  let owner: Account;
  let member: Account;
  let viewer: Account;
  let stranger: Account;
  let contextId: string;

  const auth = (account: Account) => ({ Authorization: `Bearer ${account.token}` });

  const signUp = async (prefix: string): Promise<Account> => {
    const email = uniqueEmail(prefix);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, firstName: 'Goal', lastName: prefix, password: VALID_PASSWORD })
      .expect(201);
    return { token: response.body.access_token, email, id: response.body.user.id };
  };

  const createGoal = (account: Account, overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/goals')
      .set(auth(account))
      .send({
        name: 'Viagem Japão',
        targetAmount: 10000,
        currency: 'USD',
        ...overrides,
      });

  beforeAll(async () => {
    app = await createTestApp();
    owner = await signUp('owner');
    member = await signUp('member');
    viewer = await signUp('viewer');
    stranger = await signUp('stranger');

    const created = await request(app.getHttpServer())
      .post('/api/v1/contexts')
      .set(auth(owner))
      .send({ name: 'Casa Metas', type: 'family', defaultCurrency: 'USD' })
      .expect(201);
    contextId = created.body.id;

    for (const [account, role] of [
      [member, 'member'],
      [viewer, 'viewer'],
    ] as const) {
      const invitation = await request(app.getHttpServer())
        .post(`/api/v1/contexts/${contextId}/invite`)
        .set(auth(owner))
        .send({ email: account.email, role })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/contexts/invitations/${invitation.body.inviteToken}/accept`)
        .set(auth(account))
        .expect(201);
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('personal goals', () => {
    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/goals').expect(401);
    });

    it('creates a goal starting from zero, not yet achieved', async () => {
      const response = await createGoal(owner).expect(201);

      expect(response.body.status).toBe('active');
      expect(Number(response.body.currentAmount)).toBe(0);
      expect(response.body.isAchieved).toBe(false);
      expect(response.body.userId).toBe(owner.id);
    });

    it('rejects a non-positive target', async () => {
      await createGoal(owner, { targetAmount: 0 }).expect(400);
      await createGoal(owner, { targetAmount: -5 }).expect(400);
    });

    it('lists only the caller own goals in the personal view', async () => {
      const strangersGoal = await createGoal(stranger, { name: 'Meta alheia' }).expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/goals')
        .set(auth(owner))
        .expect(200);

      expect(response.body.map((goal: any) => goal.id)).not.toContain(strangersGoal.body.id);
    });
  });

  describe('contributions', () => {
    it('adds up deposits and derives achievement', async () => {
      const goal = await createGoal(owner, { name: 'Reserva', targetAmount: 100 }).expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(owner))
        .send({ amount: 60, date: '2026-08-01' })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(owner))
        .send({ amount: 40.5 })
        .expect(201);

      expect(Number(second.body.goal.currentAmount)).toBeCloseTo(100.5);
      expect(second.body.goal.isAchieved).toBe(true);
    });

    it('rejects a non-positive deposit', async () => {
      const goal = await createGoal(owner, { name: 'Sem zero' }).expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(owner))
        .send({ amount: 0 })
        .expect(400);
    });

    it('removing a contribution subtracts it from the total', async () => {
      const goal = await createGoal(owner, { name: 'Com estorno', targetAmount: 500 }).expect(201);

      const kept = await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(owner))
        .send({ amount: 300 })
        .expect(201);
      const undone = await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(owner))
        .send({ amount: 120 })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/goals/${goal.body.id}/contributions/${undone.body.contribution.id}`)
        .set(auth(owner))
        .expect(204);

      const after = await request(app.getHttpServer())
        .get(`/api/v1/goals/${goal.body.id}`)
        .set(auth(owner))
        .expect(200);

      expect(Number(after.body.currentAmount)).toBeCloseTo(300);
      expect(kept.body.contribution.id).toBeDefined();
    });

    it('refuses deposits into an archived goal', async () => {
      const goal = await createGoal(owner, { name: 'Arquivada' }).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/goals/${goal.body.id}`)
        .set(auth(owner))
        .send({ status: 'archived' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(owner))
        .send({ amount: 10 })
        .expect(409);
    });
  });

  describe('goals in a shared context', () => {
    it('lets any member who records expenses deposit, in their own name', async () => {
      const goal = await createGoal(owner, {
        name: 'Reforma da casa',
        targetAmount: 5000,
        contextId,
      }).expect(201);

      // The household rule again: whoever saves, saves — and is named.
      const deposit = await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(member))
        .send({ amount: 250 })
        .expect(201);

      expect(deposit.body.contribution.userId).toBe(member.id);

      const trail = await request(app.getHttpServer())
        .get(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(owner))
        .expect(200);

      expect(trail.body[0].user).toMatchObject({ id: member.id });
      expect(trail.body[0].user.firstName).toEqual(expect.any(String));
    });

    it('shows context goals to every member, viewer included, but viewers cannot deposit', async () => {
      const goal = await createGoal(owner, { name: 'Visível', contextId }).expect(201);

      const listed = await request(app.getHttpServer())
        .get('/api/v1/goals')
        .query({ contextId })
        .set(auth(viewer))
        .expect(200);
      expect(listed.body.map((g: any) => g.id)).toContain(goal.body.id);

      await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(viewer))
        .send({ amount: 10 })
        .expect(403);
    });

    it('applies the author-or-admin rule to editing and deleting', async () => {
      const membersGoal = await createGoal(member, { name: 'Do membro', contextId }).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/goals/${membersGoal.body.id}`)
        .set(auth(viewer))
        .send({ name: 'hack' })
        .expect(403);

      // The owner moderates anyone's goal.
      await request(app.getHttpServer())
        .patch(`/api/v1/goals/${membersGoal.body.id}`)
        .set(auth(owner))
        .send({ name: 'Corrigida pelo dono' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/goals/${membersGoal.body.id}`)
        .set(auth(owner))
        .expect(204);
    });

    it('hides everything from a non-member', async () => {
      const goal = await createGoal(owner, { name: 'Invisível', contextId }).expect(201);

      await request(app.getHttpServer())
        .get('/api/v1/goals')
        .query({ contextId })
        .set(auth(stranger))
        .expect(403);

      await request(app.getHttpServer())
        .get(`/api/v1/goals/${goal.body.id}`)
        .set(auth(stranger))
        .expect(404);

      await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(stranger))
        .send({ amount: 10 })
        .expect(404);
    });

    it('lets only the contributor or an admin undo a deposit', async () => {
      const goal = await createGoal(owner, { name: 'Estorno em grupo', contextId }).expect(201);

      const deposit = await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(owner))
        .send({ amount: 77 })
        .expect(201);

      // A plain member cannot undo someone else's deposit...
      await request(app.getHttpServer())
        .delete(`/api/v1/goals/${goal.body.id}/contributions/${deposit.body.contribution.id}`)
        .set(auth(member))
        .expect(403);

      // ...but its author can.
      await request(app.getHttpServer())
        .delete(`/api/v1/goals/${goal.body.id}/contributions/${deposit.body.contribution.id}`)
        .set(auth(owner))
        .expect(204);
    });
  });

  describe('monthly habits (recurring goals)', () => {
    const today = new Date().toISOString().slice(0, 10);
    const lastMonth = (() => {
      const date = new Date();
      date.setUTCMonth(date.getUTCMonth() - 1, 15);
      return date.toISOString().slice(0, 10);
    })();

    it('requires the amounts its type can measure', async () => {
      // A habit without a monthly deposit is unmeasurable...
      await createGoal(owner, { goalType: 'recurring', targetAmount: undefined }).expect(400);
      // ...and an event goal without a finish line likewise.
      await createGoal(owner, { name: 'Sem alvo', targetAmount: undefined }).expect(400);
    });

    it('creates a habit with no finish line that is never "achieved"', async () => {
      const response = await createGoal(owner, {
        name: 'Dólar mensal',
        goalType: 'recurring',
        monthlyTarget: 500,
        targetAmount: undefined,
      }).expect(201);

      expect(response.body.goalType).toBe('recurring');
      expect(Number(response.body.monthlyTarget)).toBe(500);
      expect(response.body.targetAmount).toBeNull();
      expect(response.body.isAchieved).toBe(false);
    });

    it('measures the month: only this month deposits count for the bar', async () => {
      const goal = await createGoal(owner, {
        name: 'BTC mensal',
        goalType: 'recurring',
        monthlyTarget: 400,
        targetAmount: undefined,
      }).expect(201);

      // Last month's discipline does not pay for this month's.
      await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(owner))
        .send({ amount: 999, date: lastMonth })
        .expect(201);

      const deposit = await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(owner))
        .send({ amount: 150, date: today })
        .expect(201);

      expect(Number(deposit.body.goal.monthContributed)).toBeCloseTo(150);
      expect(Number(deposit.body.goal.currentAmount)).toBeCloseTo(1149);

      const listed = await request(app.getHttpServer())
        .get('/api/v1/goals')
        .set(auth(owner))
        .expect(200);
      const found = listed.body.find((g: any) => g.id === goal.body.id);
      expect(Number(found.monthContributed)).toBeCloseTo(150);
    });

    it('a habit with an optional finish line can still be achieved', async () => {
      const goal = await createGoal(owner, {
        name: 'Hábito com teto',
        goalType: 'recurring',
        monthlyTarget: 100,
        targetAmount: 200,
      }).expect(201);

      const deposit = await request(app.getHttpServer())
        .post(`/api/v1/goals/${goal.body.id}/contributions`)
        .set(auth(owner))
        .send({ amount: 250 })
        .expect(201);

      expect(deposit.body.goal.isAchieved).toBe(true);
    });

    it('refuses turning a habit into an event goal without a target', async () => {
      const goal = await createGoal(owner, {
        name: 'Vira evento',
        goalType: 'recurring',
        monthlyTarget: 100,
        targetAmount: undefined,
      }).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/goals/${goal.body.id}`)
        .set(auth(owner))
        .send({ goalType: 'target' })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/api/v1/goals/${goal.body.id}`)
        .set(auth(owner))
        .send({ goalType: 'target', targetAmount: 5000 })
        .expect(200);
    });
  });

  describe('archiving', () => {
    it('keeps archived goals out of the default list but reachable via status=all', async () => {
      const goal = await createGoal(owner, { name: 'Antiga' }).expect(201);
      await request(app.getHttpServer())
        .patch(`/api/v1/goals/${goal.body.id}`)
        .set(auth(owner))
        .send({ status: 'archived' })
        .expect(200);

      const active = await request(app.getHttpServer())
        .get('/api/v1/goals')
        .set(auth(owner))
        .expect(200);
      expect(active.body.map((g: any) => g.id)).not.toContain(goal.body.id);

      const all = await request(app.getHttpServer())
        .get('/api/v1/goals')
        .query({ status: 'all' })
        .set(auth(owner))
        .expect(200);
      expect(all.body.map((g: any) => g.id)).toContain(goal.body.id);
    });
  });
});
