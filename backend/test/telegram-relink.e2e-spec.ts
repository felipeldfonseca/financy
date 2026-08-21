import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTelegramTestApp, OutboundCall, sentButtons } from './utils/telegram-app';
import { uniqueEmail, VALID_PASSWORD } from './utils/app';

/**
 * A Telegram account can be unlinked from one Financy account and relinked to
 * another — test accounts do it all the time, and real users switching
 * accounts will too. The private chat keeps its Telegram-side id through that
 * move, so the stored chat→context mapping must never outvote the current
 * link: an expense sent after the move belongs to the new owner's own
 * personal context, not the previous owner's.
 */
describe('Telegram private chat after relinking (e2e)', () => {
  const WEBHOOK_SECRET = 'e2e-telegram-webhook-secret';
  const SHARED_TG = 777000999;

  let app: INestApplication;
  let outbox: OutboundCall[];
  let dataSource: DataSource;
  let firstOwnerId: string;
  let secondOwnerId: string;
  let updateCounter = 0;

  const webhook = (update: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/v1/webhooks/telegram')
      .set('x-telegram-bot-api-secret-token', WEBHOOK_SECRET)
      .send({ update_id: ++updateCounter, ...update })
      .expect(200);

  const privateChat = { id: SHARED_TG, type: 'private', first_name: 'Tester' };

  const sendPrivateText = (text: string) =>
    webhook({
      message: {
        message_id: updateCounter + 100,
        from: { id: SHARED_TG, is_bot: false, first_name: 'Tester' },
        date: 1754900000,
        chat: privateChat,
        text,
      },
    });

  const pressButton = (callbackData: string) =>
    webhook({
      callback_query: {
        id: `cb-${updateCounter}`,
        from: { id: SHARED_TG, is_bot: false, first_name: 'Tester' },
        chat_instance: 'instance',
        data: callbackData,
        message: {
          message_id: updateCounter + 200,
          date: 1754900000,
          chat: privateChat,
        },
      },
    });

  const registerUser = async (prefix: string): Promise<string> => {
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail(prefix),
        firstName: 'Relink',
        lastName: prefix,
        password: VALID_PASSWORD,
      })
      .expect(201);
    return registration.body.user.id;
  };

  const linkTelegram = (userId: string) =>
    dataSource.query('UPDATE users SET "telegramUserId" = $1 WHERE id = $2', [
      String(SHARED_TG),
      userId,
    ]);

  const unlinkTelegram = (userId: string) =>
    dataSource.query('UPDATE users SET "telegramUserId" = NULL WHERE id = $1', [userId]);

  /** Each of the user's transactions with the context it landed in. */
  const transactionsWithContext = (userId: string): Promise<any[]> =>
    dataSource.query(
      `SELECT t.amount::float AS amount, c."ownerId" AS owner, c.type
       FROM transactions t JOIN contexts c ON c.id = t."contextId"
       WHERE t."userId" = $1`,
      [userId],
    );

  const lastConfirmButton = () =>
    sentButtons(outbox)
      .filter((button) => button.callback_data.startsWith('confirm_'))
      .pop();

  beforeAll(async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;
    ({ app, outbox } = await createTelegramTestApp());
    dataSource = app.get(DataSource);

    firstOwnerId = await registerUser('tg-relink-first');
    secondOwnerId = await registerUser('tg-relink-second');
    await linkTelegram(firstOwnerId);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("files the first owner's private expense in their own personal context", async () => {
    await sendPrivateText('spent 10 on coffee');
    const button = lastConfirmButton();
    expect(button).toBeDefined();
    await pressButton(button!.callback_data);

    const rows = await transactionsWithContext(firstOwnerId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: 10, owner: firstOwnerId, type: 'personal' });
  });

  /**
   * Regression guard: the chat→context mapping created above is keyed by the
   * chat id alone, and this private chat keeps its id when the Telegram
   * account moves to another Financy user. The stale row used to win — every
   * expense the new owner sent was aimed at the previous owner's personal
   * context and died on its membership check with a Forbidden error.
   */
  it("files expenses sent after the relink in the new owner's personal context", async () => {
    await unlinkTelegram(firstOwnerId);
    await linkTelegram(secondOwnerId);

    await sendPrivateText('spent 25 on groceries');
    const button = lastConfirmButton();
    expect(button).toBeDefined();
    await pressButton(button!.callback_data);

    const rows = await transactionsWithContext(secondOwnerId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: 25, owner: secondOwnerId, type: 'personal' });

    // Nothing leaked into the previous owner's finances.
    expect(await transactionsWithContext(firstOwnerId)).toHaveLength(1);

    // And the stored mapping now follows the account's current owner.
    const mapping = await dataSource.query(
      "SELECT context_id FROM chat_contexts WHERE chat_id = $1 AND chat_type = 'private'",
      [String(SHARED_TG)],
    );
    expect(mapping).toHaveLength(1);
    const context = await dataSource.query('SELECT "ownerId", type FROM contexts WHERE id = $1', [
      mapping[0].context_id,
    ]);
    expect(context[0]).toMatchObject({ ownerId: secondOwnerId, type: 'personal' });
  });
});
