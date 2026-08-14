import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTelegramTestApp, OutboundCall, sentButtons, sentMessages } from './utils/telegram-app';
import { uniqueEmail, VALID_PASSWORD } from './utils/app';
import { GoalReminderService } from '../src/telegram/goal-reminder.service';

/**
 * The bot's savings-goal conversation, end to end through the real webhook:
 * "aportei 500 no dólar" finds the goal, the confirmation button records the
 * deposit in the sender's name, and the month-end reminder nudges — once —
 * about habits that have not closed the month, with a button that deposits
 * exactly what is missing, measured at press time.
 */
describe('Telegram goal flows (e2e)', () => {
  const WEBHOOK_SECRET = 'e2e-telegram-webhook-secret';
  const TELEGRAM_USER_ID = 777000222;
  const MEMBER_TELEGRAM_ID = 777000333;

  let app: INestApplication;
  let outbox: OutboundCall[];
  let token: string;
  let userId: string;
  let memberToken: string;
  let memberId: string;
  let contextId: string;
  let updateCounter = 0;

  const auth = (accessToken: string = token) => ({ Authorization: `Bearer ${accessToken}` });

  const webhook = (update: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/v1/webhooks/telegram')
      .set('x-telegram-bot-api-secret-token', WEBHOOK_SECRET)
      .send({ update_id: ++updateCounter, ...update })
      .expect(200);

  const sendText = (text: string, fromId: number = TELEGRAM_USER_ID) =>
    webhook({
      message: {
        message_id: updateCounter + 100,
        from: { id: fromId, is_bot: false, first_name: 'Felipe' },
        date: 1754900000,
        chat: { id: fromId, type: 'private' },
        text,
      },
    });

  const pressButton = (callbackData: string, fromId: number = TELEGRAM_USER_ID) =>
    webhook({
      callback_query: {
        id: `cb-${updateCounter}`,
        from: { id: fromId, is_bot: false, first_name: 'Felipe' },
        chat_instance: 'instance',
        data: callbackData,
        message: {
          message_id: updateCounter + 200,
          date: 1754900000,
          chat: { id: fromId, type: 'private' },
        },
      },
    });

  const createGoal = (overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/goals')
      .set(auth())
      .send({
        name: 'Dólar',
        goalType: 'recurring',
        monthlyTarget: 500,
        currency: 'BRL',
        ...overrides,
      })
      .expect(201);

  const getGoal = (goalId: string, accessToken: string = token) =>
    request(app.getHttpServer()).get(`/api/v1/goals/${goalId}`).set(auth(accessToken)).expect(200);

  const listContributions = (goalId: string, accessToken: string = token) =>
    request(app.getHttpServer())
      .get(`/api/v1/goals/${goalId}/contributions`)
      .set(auth(accessToken))
      .expect(200);

  const goalPayButtons = () =>
    sentButtons(outbox).filter((button) => button.callback_data.startsWith('goalpay_'));

  beforeAll(async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;
    ({ app, outbox } = await createTelegramTestApp());

    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('tg-goals'),
        firstName: 'Tele',
        lastName: 'Goals',
        password: VALID_PASSWORD,
      })
      .expect(201);
    token = registration.body.access_token;
    userId = registration.body.user.id;

    const memberRegistration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('tg-goals-member'),
        firstName: 'Casa',
        lastName: 'Member',
        password: VALID_PASSWORD,
      })
      .expect(201);
    memberToken = memberRegistration.body.access_token;
    memberId = memberRegistration.body.user.id;

    // Link both Telegram accounts the way /start TOKEN would, minus the chat.
    const dataSource = app.get(DataSource);
    await dataSource.query('UPDATE users SET "telegramUserId" = $1 WHERE id = $2', [
      String(TELEGRAM_USER_ID),
      userId,
    ]);
    await dataSource.query('UPDATE users SET "telegramUserId" = $1 WHERE id = $2', [
      String(MEMBER_TELEGRAM_ID),
      memberId,
    ]);

    const created = await request(app.getHttpServer())
      .post('/api/v1/contexts')
      .set(auth())
      .send({ name: 'Casa Aportes', type: 'family', defaultCurrency: 'BRL' })
      .expect(201);
    contextId = created.body.id;

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/contexts/${contextId}/invite`)
      .set(auth())
      .send({ email: memberRegistration.body.user.email, role: 'member' })
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

  describe('depositing by message', () => {
    let dolarId: string;

    it('finds the goal, confirms, and records the deposit in the sender name', async () => {
      const goal = await createGoal();
      dolarId = goal.body.id;

      await sendText('aportei 350 no dólar');

      const confirmations = goalPayButtons();
      expect(confirmations).toHaveLength(1);
      const lastText = sentMessages(outbox).at(-1)?.text ?? '';
      expect(lastText).toContain('Dólar');

      await pressButton(confirmations[0].callback_data);

      const fetched = await getGoal(dolarId);
      expect(Number(fetched.body.currentAmount)).toBe(350);
      expect(Number(fetched.body.monthContributed)).toBe(350);

      const trail = await listContributions(dolarId);
      expect(trail.body).toHaveLength(1);
      expect(trail.body[0].userId).toBe(userId);
      expect(trail.body[0].kind).toBe('deposit');

      expect(sentMessages(outbox).at(-1)?.text).toContain('Deposited!');
    });

    it('cancels without recording anything', async () => {
      await sendText('aportei 100 no dólar');
      const cancel = sentButtons(outbox).find((button) =>
        button.callback_data.startsWith('goalcancel_'),
      );
      expect(cancel).toBeDefined();

      await pressButton(cancel!.callback_data);

      const trail = await listContributions(dolarId);
      expect(trail.body).toHaveLength(1); // still only the 350 from before
      expect(sentMessages(outbox).at(-1)?.text).toContain('cancelled');
    });

    it('falls through when the words match no goal', async () => {
      await sendText('aportei 500 no foguete');
      expect(goalPayButtons()).toHaveLength(0);
    });

    it('asks for the amount when the message names none', async () => {
      await sendText('aportei no dólar');
      expect(goalPayButtons()).toHaveLength(0);
      expect(sentMessages(outbox).at(-1)?.text).toContain('How much');

      const trail = await listContributions(dolarId);
      expect(trail.body).toHaveLength(1);
    });

    it('offers the list when the message names an amount but no goal', async () => {
      const btc = await createGoal({ name: 'BTC', monthlyTarget: 300 });

      await sendText('guardei 200');

      const options = goalPayButtons();
      expect(options).toHaveLength(2);
      const btcButton = options.find((button) => button.text.startsWith('BTC'));
      expect(btcButton).toBeDefined();

      await pressButton(btcButton!.callback_data);

      const fetched = await getGoal(btc.body.id);
      expect(Number(fetched.body.currentAmount)).toBe(200);
    });

    it('records a shared-context deposit in the presser name, not the creator', async () => {
      const shared = await createGoal({
        name: 'Casa Nova',
        goalType: 'target',
        monthlyTarget: undefined,
        targetAmount: 20000,
        contextId,
      });

      await sendText('aportei 75 na casa nova', MEMBER_TELEGRAM_ID);
      const confirmations = goalPayButtons();
      expect(confirmations).toHaveLength(1);

      await pressButton(confirmations[0].callback_data, MEMBER_TELEGRAM_ID);

      const trail = await listContributions(shared.body.id, memberToken);
      expect(trail.body).toHaveLength(1);
      expect(trail.body[0].userId).toBe(memberId);
      expect(Number(trail.body[0].amount)).toBe(75);
    });
  });

  describe('month-end reminder', () => {
    let reminder: GoalReminderService;
    let habitId: string;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 12));

    beforeAll(async () => {
      reminder = app.get(GoalReminderService);
      const habit = await createGoal({ name: 'Aporte Mensal', monthlyTarget: 500 });
      habitId = habit.body.id;
      await request(app.getHttpServer())
        .post(`/api/v1/goals/${habitId}/contributions`)
        .set(auth())
        .send({ amount: 200 })
        .expect(201);
    });

    it('stays silent outside the last days of the month', async () => {
      expect(await reminder.run(monthStart)).toBe(0);
      expect(sentMessages(outbox)).toHaveLength(0);
    });

    it('nudges once about the incomplete month, with the missing amount', async () => {
      const sent = await reminder.run(monthEnd);
      expect(sent).toBeGreaterThanOrEqual(1);

      const habitButton = sentButtons(outbox).find(
        (button) => button.callback_data === `goalremind_${habitId}`,
      );
      expect(habitButton).toBeDefined();
      expect(habitButton!.text).toContain('300');

      const reminderText = sentMessages(outbox)
        .map((body) => body.text ?? '')
        .find((text) => text.includes('Aporte Mensal'));
      expect(reminderText).toContain('to go to close');

      // The second cycle finds every habit already reminded this month.
      outbox.length = 0;
      expect(await reminder.run(monthEnd)).toBe(0);
      expect(sentMessages(outbox)).toHaveLength(0);
    });

    it('the button deposits exactly what is missing, measured at press time', async () => {
      await pressButton(`goalremind_${habitId}`);

      const fetched = await getGoal(habitId);
      expect(Number(fetched.body.currentAmount)).toBe(500);
      expect(Number(fetched.body.monthContributed)).toBe(500);

      // Pressing the stale button again finds the month already closed.
      outbox.length = 0;
      await pressButton(`goalremind_${habitId}`);
      expect(sentMessages(outbox).at(-1)?.text).toContain('already complete');

      const after = await getGoal(habitId);
      expect(Number(after.body.currentAmount)).toBe(500);
    });

    it('never nudges about event goals', async () => {
      const event = await createGoal({
        name: 'Evento Sem Nudge',
        goalType: 'target',
        monthlyTarget: undefined,
        targetAmount: 1000,
      });

      await reminder.run(monthEnd);
      const eventButtons = sentButtons(outbox).filter(
        (button) => button.callback_data === `goalremind_${event.body.id}`,
      );
      expect(eventButtons).toHaveLength(0);
    });
  });
});
