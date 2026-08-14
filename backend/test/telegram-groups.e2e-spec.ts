import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTelegramTestApp, OutboundCall, sentButtons, sentMessages } from './utils/telegram-app';
import { uniqueEmail, VALID_PASSWORD } from './utils/app';

/**
 * A Telegram group linked to an EXISTING shared context, end to end: the bot
 * joins and offers the adder's contexts, only an owner/admin may link, group
 * messages then post into that context in each sender's name — and a group
 * linked to real family finances never enrolls anyone by itself; joining
 * still takes an invite in the app.
 */
describe('Telegram group-context linking (e2e)', () => {
  const WEBHOOK_SECRET = 'e2e-telegram-webhook-secret';
  const OWNER_TG = 777000444;
  const MEMBER_TG = 777000555;
  const STRANGER_TG = 777000666;
  const BOT_TG = 424242;
  const GROUP_CHAT = -100999888777;
  const GROUP2_CHAT = -100999888778;

  let app: INestApplication;
  let outbox: OutboundCall[];
  let dataSource: DataSource;
  let ownerToken: string;
  let ownerId: string;
  let memberToken: string;
  let memberId: string;
  let strangerId: string;
  let casaId: string;
  let updateCounter = 0;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const webhook = (update: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/v1/webhooks/telegram')
      .set('x-telegram-bot-api-secret-token', WEBHOOK_SECRET)
      .send({ update_id: ++updateCounter, ...update })
      .expect(200);

  const groupChat = (chatId: number = GROUP_CHAT) => ({
    id: chatId,
    type: 'group',
    title: 'Família C',
  });

  const addBotToGroup = (fromId: number) =>
    webhook({
      message: {
        message_id: updateCounter + 100,
        from: { id: fromId, is_bot: false, first_name: 'Adder' },
        date: 1754900000,
        chat: groupChat(),
        new_chat_members: [{ id: BOT_TG, is_bot: true, first_name: 'financy' }],
      },
    });

  const sendGroupText = (text: string, fromId: number, chatId: number = GROUP_CHAT) =>
    webhook({
      message: {
        message_id: updateCounter + 100,
        from: { id: fromId, is_bot: false, first_name: 'Sender' },
        date: 1754900000,
        chat: groupChat(chatId),
        text,
      },
    });

  const pressButton = (callbackData: string, fromId: number) =>
    webhook({
      callback_query: {
        id: `cb-${updateCounter}`,
        from: { id: fromId, is_bot: false, first_name: 'Presser' },
        chat_instance: 'instance',
        data: callbackData,
        message: {
          message_id: updateCounter + 200,
          date: 1754900000,
          chat: groupChat(),
        },
      },
    });

  const registerAndLink = async (prefix: string, telegramId: number) => {
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail(prefix),
        firstName: 'Group',
        lastName: prefix,
        password: VALID_PASSWORD,
      })
      .expect(201);
    await dataSource.query('UPDATE users SET "telegramUserId" = $1 WHERE id = $2', [
      String(telegramId),
      registration.body.user.id,
    ]);
    return { token: registration.body.access_token, id: registration.body.user.id, email: registration.body.user.email };
  };

  const createBill = (description: string, contextId: string) =>
    request(app.getHttpServer())
      .post('/api/v1/bills')
      .set(auth(ownerToken))
      .send({
        description,
        amount: 80,
        currency: 'BRL',
        dueDate: '2026-08-20',
        dashboardCategory: 'housing',
        contextId,
      })
      .expect(201);

  const membershipCount = async (contextId: string, userId: string): Promise<number> => {
    const rows = await dataSource.query(
      'SELECT COUNT(*)::int AS count FROM context_members WHERE "contextId" = $1 AND "userId" = $2',
      [contextId, userId],
    );
    return rows[0].count;
  };

  beforeAll(async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;
    ({ app, outbox } = await createTelegramTestApp());
    dataSource = app.get(DataSource);

    const owner = await registerAndLink('tg-group-owner', OWNER_TG);
    ownerToken = owner.token;
    ownerId = owner.id;
    const member = await registerAndLink('tg-group-member', MEMBER_TG);
    memberToken = member.token;
    memberId = member.id;
    const stranger = await registerAndLink('tg-group-stranger', STRANGER_TG);
    strangerId = stranger.id;

    const created = await request(app.getHttpServer())
      .post('/api/v1/contexts')
      .set(auth(ownerToken))
      .send({ name: 'Casa C', type: 'family', defaultCurrency: 'BRL' })
      .expect(201);
    casaId = created.body.id;

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/contexts/${casaId}/invite`)
      .set(auth(ownerToken))
      .send({ email: member.email, role: 'member' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/contexts/invitations/${invitation.body.inviteToken}/accept`)
      .set(auth(memberToken))
      .expect(201);
  });

  afterAll(async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    await app?.close();
  });

  beforeEach(() => {
    outbox.length = 0;
  });

  it('offers linking to an existing context when the bot joins', async () => {
    await addBotToGroup(OWNER_TG);

    const buttons = sentButtons(outbox);
    const linkButton = buttons.find((button) => button.callback_data === `setup_link_${casaId}`);
    expect(linkButton).toBeDefined();
    expect(linkButton!.text).toContain('Casa C');
    expect(buttons.find((button) => button.callback_data === 'setup_new')).toBeDefined();
  });

  it('refuses the link from a plain member', async () => {
    await pressButton(`setup_link_${casaId}`, MEMBER_TG);
    expect(sentMessages(outbox).at(-1)?.text).toContain('owner or admin');
  });

  it('links the group when an owner presses, and posts into that context', async () => {
    await pressButton(`setup_link_${casaId}`, OWNER_TG);
    expect(sentMessages(outbox).at(-1)?.text).toContain('Casa C');

    // A context bill can now be settled straight from the group.
    const bill = await createBill('Luz Grupo', casaId);
    outbox.length = 0;

    await sendGroupText('paguei a luz grupo', OWNER_TG);
    const settle = sentButtons(outbox).find((button) =>
      button.callback_data.startsWith('paybill_'),
    );
    expect(settle).toBeDefined();

    await pressButton(settle!.callback_data, OWNER_TG);

    const paid = await request(app.getHttpServer())
      .get(`/api/v1/bills/${bill.body.id}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(paid.body.status).toBe('paid');
  });

  it('records a member settlement in the member name', async () => {
    const bill = await createBill('Agua Grupo', casaId);
    outbox.length = 0;

    await sendGroupText('paguei a agua grupo', MEMBER_TG);
    const settle = sentButtons(outbox).find((button) =>
      button.callback_data.startsWith('paybill_'),
    );
    expect(settle).toBeDefined();

    await pressButton(settle!.callback_data, MEMBER_TG);

    const paid = await request(app.getHttpServer())
      .get(`/api/v1/bills/${bill.body.id}`)
      .set(auth(memberToken))
      .expect(200);
    expect(paid.body.status).toBe('paid');

    const rows = await dataSource.query('SELECT "userId" FROM transactions WHERE id = $1', [
      paid.body.paidTransactionId,
    ]);
    expect(rows[0].userId).toBe(memberId);
  });

  it('blocks a non-member without enrolling them', async () => {
    await sendGroupText('paguei a luz grupo', STRANGER_TG);

    const reply = sentMessages(outbox).at(-1)?.text ?? '';
    expect(reply).toContain('Casa C');
    expect(reply).toContain('not a member');

    expect(await membershipCount(casaId, strangerId)).toBe(0);
  });

  it('keeps group deposits inside the linked context', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/goals')
      .set(auth(ownerToken))
      .send({ name: 'Fundo Grupo', targetAmount: 5000, currency: 'BRL', contextId: casaId })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/goals')
      .set(auth(ownerToken))
      .send({ name: 'Meta Solo', targetAmount: 3000, currency: 'BRL' })
      .expect(201);
    outbox.length = 0;

    // Bare "aportei 100" in the group sees ONE candidate — the group's goal —
    // so it goes straight to its confirmation, never offering "Meta Solo".
    await sendGroupText('aportei 100', OWNER_TG);

    const deposits = sentButtons(outbox).filter((button) =>
      button.callback_data.startsWith('goalpay_'),
    );
    expect(deposits).toHaveLength(1);
    expect(sentMessages(outbox).at(-1)?.text).toContain('Fundo Grupo');
    expect(sentMessages(outbox).at(-1)?.text).not.toContain('Meta Solo');
  });

  it('re-links to another context and follows it', async () => {
    const second = await request(app.getHttpServer())
      .post('/api/v1/contexts')
      .set(auth(ownerToken))
      .send({ name: 'Casa C2', type: 'family', defaultCurrency: 'BRL' })
      .expect(201);

    await addBotToGroup(OWNER_TG);
    await pressButton(`setup_link_${second.body.id}`, OWNER_TG);
    expect(sentMessages(outbox).at(-1)?.text).toContain('Casa C2');

    const bill = await createBill('Internet Casa Dois', second.body.id);
    outbox.length = 0;

    await sendGroupText('paguei a internet casa dois', OWNER_TG);
    const settle = sentButtons(outbox).find((button) =>
      button.callback_data.startsWith('paybill_'),
    );
    expect(settle).toBeDefined();

    await pressButton(settle!.callback_data, OWNER_TG);
    const paid = await request(app.getHttpServer())
      .get(`/api/v1/bills/${bill.body.id}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(paid.body.status).toBe('paid');
  });

  it('still opens the create-new wizard on request', async () => {
    await addBotToGroup(OWNER_TG);
    outbox.length = 0;

    await pressButton('setup_new', OWNER_TG);
    const typeButtons = sentButtons(outbox).filter((button) =>
      button.callback_data.startsWith('setup_type_'),
    );
    expect(typeButtons.length).toBeGreaterThan(0);
  });

  it('wizard-created chats keep their everyone-in-the-group enrollment', async () => {
    // A legacy mapping created by the wizard (auto_enroll on) pointing a
    // second group at Casa C: content there enrolls the sender as a member.
    await dataSource.query(
      `INSERT INTO chat_contexts (chat_id, chat_type, chat_title, context_id, auto_enroll)
       VALUES ($1, 'group', 'Grupo Legado', $2, true)`,
      [String(GROUP2_CHAT), casaId],
    );

    expect(await membershipCount(casaId, strangerId)).toBe(0);
    await sendGroupText('olá pessoal', STRANGER_TG, GROUP2_CHAT);
    expect(await membershipCount(casaId, strangerId)).toBe(1);
  });
});
