import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, uniqueEmail, VALID_PASSWORD } from './utils/app';

interface Account {
  token: string;
  email: string;
  id: string;
}

describe('Shared contexts (e2e)', () => {
  let app: INestApplication;
  let owner: Account;
  let invitee: Account;
  let stranger: Account;
  let contextId: string;

  const signUp = async (prefix: string): Promise<Account> => {
    const email = uniqueEmail(prefix);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, firstName: 'Ctx', lastName: prefix, password: VALID_PASSWORD })
      .expect(201);

    return { token: response.body.access_token, email, id: response.body.user.id };
  };

  const auth = (account: Account) => ({ Authorization: `Bearer ${account.token}` });

  const addTransaction = (account: Account, description: string, targetContext?: string) =>
    request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set(auth(account))
      .query(targetContext ? { contextId: targetContext } : {})
      .send({
        amount: 20,
        description,
        type: 'expense',
        category: 'food',
        subcategory: 'groceries',
        dashboardCategory: 'fooddining',
        date: '2026-08-06',
      });

  beforeAll(async () => {
    app = await createTestApp();
    owner = await signUp('owner');
    invitee = await signUp('invitee');
    stranger = await signUp('stranger');

    const created = await request(app.getHttpServer())
      .post('/api/v1/contexts')
      .set(auth(owner))
      .send({ name: 'Household', type: 'family', defaultCurrency: 'BRL' })
      .expect(201);

    contextId = created.body.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('creation and listing', () => {
    it('lists the context for its owner', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/contexts')
        .set(auth(owner))
        .expect(200);

      expect(response.body.map((context: any) => context.id)).toContain(contextId);
    });

    it('does not list it for anyone else', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/contexts')
        .set(auth(stranger))
        .expect(200);

      expect(response.body.map((context: any) => context.id)).not.toContain(contextId);
    });

    it('keeps a non-member out of the context itself', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/contexts/${contextId}`)
        .set(auth(stranger))
        .expect(403);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/contexts').expect(401);
    });

    it('refuses a second context with the same name for the same creator', async () => {
      // Case and surrounding whitespace do not make it a different name.
      await request(app.getHttpServer())
        .post('/api/v1/contexts')
        .set(auth(owner))
        .send({ name: '  household ', type: 'family', defaultCurrency: 'BRL' })
        .expect(409);
    });

    it('lets a different creator use the same name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contexts')
        .set(auth(stranger))
        .send({ name: 'Household', type: 'family', defaultCurrency: 'BRL' })
        .expect(201);
    });

    it('refuses a rename that collides, but keeps a self-rename fine', async () => {
      const other = await request(app.getHttpServer())
        .post('/api/v1/contexts')
        .set(auth(owner))
        .send({ name: 'Viagem', type: 'trip', defaultCurrency: 'BRL' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/contexts/${other.body.id}`)
        .set(auth(owner))
        .send({ name: 'Household' })
        .expect(409);

      // Saving the context under its own current name is not a collision.
      await request(app.getHttpServer())
        .patch(`/api/v1/contexts/${other.body.id}`)
        .set(auth(owner))
        .send({ name: 'Viagem' })
        .expect(200);
    });
  });

  describe('invitations', () => {
    let inviteToken: string;

    it('refuses to invite an address with no account', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/contexts/${contextId}/invite`)
        .set(auth(owner))
        .send({ email: 'nobody@example.test', role: 'member' })
        .expect(404);
    });

    it('refuses invitations from someone who is not a member', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/contexts/${contextId}/invite`)
        .set(auth(stranger))
        .send({ email: invitee.email, role: 'member' })
        .expect(403);
    });

    it('issues a token the invitee can redeem', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/contexts/${contextId}/invite`)
        .set(auth(owner))
        .send({ email: invitee.email, role: 'member' })
        .expect(201);

      expect(response.body.status).toBe('invited');
      expect(response.body.inviteToken).toEqual(expect.any(String));
      inviteToken = response.body.inviteToken;
    });

    it('still issues a working invitation when email is not configured', async () => {
      // No provider key in the test environment: the invitation must not
      // depend on delivery, and the caller must be told it was not sent so the
      // UI can offer the link instead.
      const response = await request(app.getHttpServer())
        .post(`/api/v1/contexts/${contextId}/invite`)
        .set(auth(owner))
        .send({ email: stranger.email, role: 'viewer' })
        .expect(201);

      expect(response.body.invitationEmailSent).toBe(false);
      expect(response.body.inviteToken).toEqual(expect.any(String));
    });

    it('does not grant access before the invitation is accepted', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/contexts')
        .set(auth(invitee))
        .expect(200);

      expect(response.body.map((context: any) => context.id)).not.toContain(contextId);
    });

    it('rejects a duplicate invitation', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/contexts/${contextId}/invite`)
        .set(auth(owner))
        .send({ email: invitee.email, role: 'member' })
        .expect(409);
    });

    it('rejects an unknown token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contexts/invitations/not-a-real-token/accept')
        .set(auth(invitee))
        .expect(404);
    });

    it('adds the invitee once the token is redeemed', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/contexts/invitations/${inviteToken}/accept`)
        .set(auth(invitee))
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/contexts')
        .set(auth(invitee))
        .expect(200);

      expect(response.body.map((context: any) => context.id)).toContain(contextId);
    });
  });

  describe('shared transactions', () => {
    beforeAll(async () => {
      await addTransaction(owner, 'Owner shared expense', contextId).expect(201);
      await addTransaction(invitee, 'Invitee shared expense', contextId).expect(201);
      await addTransaction(owner, 'Owner private expense').expect(201);
    });

    it('shows every member transaction to each member', async () => {
      for (const account of [owner, invitee]) {
        const response = await request(app.getHttpServer())
          .get('/api/v1/transactions')
          .query({ contextId })
          .set(auth(account))
          .expect(200);

        const descriptions = response.body.transactions.map((t: any) => t.description);
        expect(descriptions).toEqual(
          expect.arrayContaining(['Owner shared expense', 'Invitee shared expense']),
        );
      }
    });

    it('keeps private transactions out of the shared view', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({ contextId })
        .set(auth(owner))
        .expect(200);

      expect(response.body.transactions.map((t: any) => t.description)).not.toContain(
        'Owner private expense',
      );
    });

    it('keeps other members transactions out of the personal view', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .set(auth(owner))
        .expect(200);

      const descriptions = response.body.transactions.map((t: any) => t.description);
      expect(descriptions).toContain('Owner private expense');
      expect(descriptions).not.toContain('Invitee shared expense');
    });

    it('summarises the shared context, not just the caller', async () => {
      const shared = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({ contextId })
        .set(auth(invitee))
        .expect(200);

      // Both members contributed 20, so a caller-only summary would show 20.
      expect(Number(shared.body.summary.totalExpenses)).toBeGreaterThanOrEqual(40);
    });

    it('refuses the shared view to a non-member', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({ contextId })
        .set(auth(stranger))
        .expect(403);
    });

    it('refuses to file a transaction into a context the caller is not in', async () => {
      const response = await addTransaction(stranger, 'Sneaky expense', contextId);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('moderating other members transactions', () => {
    it('lets an owner correct and remove a member entry', async () => {
      const created = await addTransaction(invitee, 'Invitee mistake', contextId).expect(201);

      // The reported failure: after a member leaves, their entries stay in the
      // shared list and the owner has to be able to tidy them up.
      await request(app.getHttpServer())
        .patch(`/api/v1/transactions/${created.body.id}`)
        .set(auth(owner))
        .send({ description: 'Corrected by owner' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/transactions/${created.body.id}`)
        .set(auth(owner))
        .expect(204);
    });

    it('refuses an ordinary member changing someone else entry', async () => {
      const created = await addTransaction(owner, 'Owner entry', contextId).expect(201);

      // Visible in the shared list, so an explicit refusal rather than a 404.
      await request(app.getHttpServer())
        .delete(`/api/v1/transactions/${created.body.id}`)
        .set(auth(invitee))
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/transactions/${created.body.id}`)
        .set(auth(invitee))
        .send({ amount: 1 })
        .expect(403);
    });

    it('lets a member open a shared entry recorded by someone else', async () => {
      const created = await addTransaction(owner, 'Readable by members', contextId).expect(201);

      await request(app.getHttpServer())
        .get(`/api/v1/transactions/${created.body.id}`)
        .set(auth(invitee))
        .expect(200);
    });

    it('still hides everything from a non-member', async () => {
      const created = await addTransaction(owner, 'Not for strangers', contextId).expect(201);

      await request(app.getHttpServer())
        .get(`/api/v1/transactions/${created.body.id}`)
        .set(auth(stranger))
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/v1/transactions/${created.body.id}`)
        .set(auth(stranger))
        .expect(404);
    });
  });

  describe('membership management', () => {
    it('lets an admin change a member role but not the owner role', async () => {
      const members = await request(app.getHttpServer())
        .get(`/api/v1/contexts/${contextId}/members`)
        .set(auth(owner))
        .expect(200);

      const inviteeMember = members.body.find((member: any) => member.userId === invitee.id);
      const ownerMember = members.body.find((member: any) => member.userId === owner.id);

      await request(app.getHttpServer())
        .patch(`/api/v1/contexts/${contextId}/members/${inviteeMember.id}/role`)
        .set(auth(owner))
        .send({ role: 'viewer' })
        .expect(200);

      const ownerRoleChange = await request(app.getHttpServer())
        .patch(`/api/v1/contexts/${contextId}/members/${ownerMember.id}/role`)
        .set(auth(invitee))
        .send({ role: 'member' });

      expect(ownerRoleChange.status).toBeGreaterThanOrEqual(400);
    });

    it('still lets a viewer read the shared transactions', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({ contextId })
        .set(auth(invitee))
        .expect(200);
    });

    it('cuts access off when a member leaves', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/contexts/${contextId}/leave`)
        .set(auth(invitee))
        .expect(204);

      await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({ contextId })
        .set(auth(invitee))
        .expect(403);
    });
  });

  describe('inviting someone back after they leave', () => {
    /**
     * Removing a member marks the row as LEFT rather than deleting it, and the
     * duplicate check used to match any row at all — so anyone removed from a
     * context could never be invited again.
     */
    it('issues a fresh invitation to a former member', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/contexts/${contextId}/invite`)
        .set(auth(owner))
        .send({ email: invitee.email, role: 'member' })
        .expect(201);

      expect(response.body.status).toBe('invited');
      expect(response.body.inviteToken).toEqual(expect.any(String));

      await request(app.getHttpServer())
        .post(`/api/v1/contexts/invitations/${response.body.inviteToken}/accept`)
        .set(auth(invitee))
        .expect(201);

      const contexts = await request(app.getHttpServer())
        .get('/api/v1/contexts')
        .set(auth(invitee))
        .expect(200);

      expect(contexts.body.map((context: any) => context.id)).toContain(contextId);
    });

    it('still refuses to invite someone who is already active', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/contexts/${contextId}/invite`)
        .set(auth(owner))
        .send({ email: invitee.email, role: 'member' })
        .expect(409);
    });
  });

  describe('pending invitations', () => {
    it('lists someone who has been invited but has not accepted', async () => {
      const newcomer = await signUp('newcomer');

      await request(app.getHttpServer())
        .post(`/api/v1/contexts/${contextId}/invite`)
        .set(auth(owner))
        .send({ email: newcomer.email, role: 'viewer' })
        .expect(201);

      const members = await request(app.getHttpServer())
        .get(`/api/v1/contexts/${contextId}/members`)
        .set(auth(owner))
        .expect(200);

      const pending = members.body.find((member: any) => member.userId === newcomer.id);

      // Without this the interface shows nothing at all between inviting
      // someone and their accepting.
      expect(pending).toBeDefined();
      expect(pending.status).toBe('invited');
    });
  });
});
