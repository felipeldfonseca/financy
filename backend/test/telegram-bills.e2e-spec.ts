import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTelegramTestApp, OutboundCall, sentButtons, sentMessages } from './utils/telegram-app';
import { uniqueEmail, VALID_PASSWORD } from './utils/app';
import { MessageProcessorService } from '../src/telegram/message-processor.service';

/**
 * The bot's bill conversation, end to end through the real webhook: a payment
 * message finds the open bill, the confirmation button settles it in the
 * sender's name, and the "bill to pay" button turns a read invoice into a
 * Bill. Outbound Telegram calls are recorded, so the test presses the same
 * buttons a user would.
 */
describe('Telegram bill flows (e2e)', () => {
  const WEBHOOK_SECRET = 'e2e-telegram-webhook-secret';
  const TELEGRAM_USER_ID = 777000111;

  let app: INestApplication;
  let outbox: OutboundCall[];
  let token: string;
  let userId: string;
  let updateCounter = 0;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  const webhook = (update: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/v1/webhooks/telegram')
      .set('x-telegram-bot-api-secret-token', WEBHOOK_SECRET)
      .send({ update_id: ++updateCounter, ...update })
      .expect(200);

  const sendText = (text: string) =>
    webhook({
      message: {
        message_id: updateCounter + 100,
        from: { id: TELEGRAM_USER_ID, is_bot: false, first_name: 'Felipe' },
        date: 1754900000,
        chat: { id: TELEGRAM_USER_ID, type: 'private' },
        text,
      },
    });

  const pressButton = (callbackData: string) =>
    webhook({
      callback_query: {
        id: `cb-${updateCounter}`,
        from: { id: TELEGRAM_USER_ID, is_bot: false, first_name: 'Felipe' },
        chat_instance: 'instance',
        data: callbackData,
        message: {
          message_id: updateCounter + 200,
          date: 1754900000,
          chat: { id: TELEGRAM_USER_ID, type: 'private' },
        },
      },
    });

  const createBill = (overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/bills')
      .set(auth())
      .send({
        description: 'Internet Alares',
        amount: 101.08,
        currency: 'USD',
        dueDate: '2026-07-05',
        dashboardCategory: 'housing',
        merchantName: 'Alares',
        ...overrides,
      })
      .expect(201);

  beforeAll(async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;
    ({ app, outbox } = await createTelegramTestApp());

    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('tg-bills'),
        firstName: 'Tele',
        lastName: 'Gram',
        password: VALID_PASSWORD,
      })
      .expect(201);
    token = registration.body.access_token;
    userId = registration.body.user.id;

    // Link the Telegram account the way /start TOKEN would, minus the chat.
    await app
      .get(DataSource)
      .query('UPDATE users SET "telegramUserId" = $1 WHERE id = $2', [
        String(TELEGRAM_USER_ID),
        userId,
      ]);
  });

  afterAll(async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    await app?.close();
  });

  beforeEach(() => {
    outbox.length = 0;
  });

  it('rejects a webhook call without the secret', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/telegram')
      .send({ update_id: 1 })
      .expect(401);
  });

  describe('settling a bill by message', () => {
    it('finds the bill, confirms, and records the expense in the sender name', async () => {
      const bill = await createBill();

      await sendText('paguei a alares');

      // The bot answered with a confirmation carrying a settle button.
      const settleButton = sentButtons(outbox).find((button) =>
        button.callback_data.startsWith('paybill_'),
      );
      expect(settleButton).toBeDefined();

      await pressButton(settleButton!.callback_data);

      const paid = await request(app.getHttpServer())
        .get(`/api/v1/bills/${bill.body.id}`)
        .set(auth())
        .expect(200);

      expect(paid.body.status).toBe('paid');
      expect(paid.body.paidTransactionId).toEqual(expect.any(String));

      const transaction = await request(app.getHttpServer())
        .get(`/api/v1/transactions/${paid.body.paidTransactionId}`)
        .set(auth())
        .expect(200);

      expect(transaction.body.userId).toBe(userId);
      expect(transaction.body.metadata).toMatchObject({ billId: bill.body.id });
      expect(Number(transaction.body.amount)).toBeCloseTo(101.08);
    });

    it('records the amount the message named, not the billed one', async () => {
      const bill = await createBill({ description: 'Conta de Luz', amount: 95, dueDate: '2026-08-02' });

      await sendText('paguei 110,50 da luz');
      const settleButton = sentButtons(outbox).find((button) =>
        button.callback_data.startsWith('paybill_'),
      );
      expect(settleButton).toBeDefined();

      await pressButton(settleButton!.callback_data);

      const paid = await request(app.getHttpServer())
        .get(`/api/v1/bills/${bill.body.id}`)
        .set(auth())
        .expect(200);

      const transaction = await request(app.getHttpServer())
        .get(`/api/v1/transactions/${paid.body.paidTransactionId}`)
        .set(auth())
        .expect(200);

      // Paid late with a fee: the expense records reality, the bill its price.
      expect(Number(transaction.body.amount)).toBeCloseTo(110.5);
      expect(Number(paid.body.amount)).toBeCloseTo(95);
    });

    it('lists open bills when the message names none', async () => {
      await createBill({ description: 'Fatura Nubank', amount: 432.1, dueDate: '2026-08-25' });

      await sendText('paguei');

      const buttons = sentButtons(outbox).filter((button) =>
        button.callback_data.startsWith('paybill_'),
      );
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('leaves a bill open when the confirmation is cancelled', async () => {
      const bill = await createBill({ description: 'Condominio', amount: 700, dueDate: '2026-08-28' });

      await sendText('paguei o condominio');
      const cancelButton = sentButtons(outbox).find((button) =>
        button.callback_data.startsWith('paycancel_'),
      );
      expect(cancelButton).toBeDefined();

      await pressButton(cancelButton!.callback_data);

      const stillOpen = await request(app.getHttpServer())
        .get(`/api/v1/bills/${bill.body.id}`)
        .set(auth())
        .expect(200);
      expect(stillOpen.body.status).toBe('open');
    });

    it('falls through to the normal expense flow when nothing matches', async () => {
      await sendText('paid 50 for parking meter');

      // No settle offer — the message went down the ordinary parsing path.
      expect(sentButtons(outbox).some((b) => b.callback_data.startsWith('paybill_'))).toBe(false);
      expect(
        sentMessages(outbox).some((body) => String(body?.text).includes('Processing your transactions')),
      ).toBe(true);
    });

    it('tells the user when a pressed confirmation has expired', async () => {
      await pressButton('paybill_deadbeefdeadbeefdeadbeefdeadbeef');

      expect(
        sentMessages(outbox).some((body) => String(body?.text).includes('expired')),
      ).toBe(true);
    });
  });

  describe('registering a bill from a read invoice', () => {
    it('turns the stored reading into an open bill with the detected due date', async () => {
      // What the vision model hands back for the Alares PDF, already stored
      // for confirmation — the seam right before the buttons.
      const stored = app.get(MessageProcessorService).finalizeTransaction(
        {
          amount: 149.9,
          currency: 'USD',
          type: 'expense',
          description: 'Fatura Vivo Fibra',
          category: 'housing',
          merchantName: 'Vivo',
          confidence: 0.95,
          date: '2026-08-01',
          dueDate: '2026-07-10',
        },
        'Receipt PDF',
      );

      await pressButton(`bill_${stored.tempId}`);

      const bills = await request(app.getHttpServer())
        .get('/api/v1/bills')
        .query({ status: 'open' })
        .set(auth())
        .expect(200);

      const registered = bills.body.find((bill: any) => bill.description === 'Fatura Vivo Fibra');
      expect(registered).toBeDefined();
      expect(registered.dueDate.slice(0, 10)).toBe('2026-07-10');
      expect(registered.dashboardCategory).toBe('housing');
      expect(registered.isOverdue).toBe(true);
      expect(Number(registered.amount)).toBeCloseTo(149.9);

      // And the stored reading is consumed: the button cannot double-create.
      await pressButton(`bill_${stored.tempId}`);
      const after = await request(app.getHttpServer())
        .get('/api/v1/bills')
        .query({ status: 'all' })
        .set(auth())
        .expect(200);
      expect(
        after.body.filter((bill: any) => bill.description === 'Fatura Vivo Fibra'),
      ).toHaveLength(1);
    });
  });
});
