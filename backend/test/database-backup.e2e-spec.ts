import { INestApplication } from '@nestjs/common';
import { createTelegramTestApp, OutboundCall } from './utils/telegram-app';
import { DatabaseBackupService } from '../src/telegram/database-backup.service';

/**
 * The nightly backup, run against the real test database: pg_dump must
 * produce a restorable dump and the service must hand it to Telegram as a
 * document. The outbound HTTP stub records the delivery.
 */
describe('Database backup (e2e)', () => {
  let app: INestApplication;
  let outbox: OutboundCall[];

  beforeAll(async () => {
    ({ app, outbox } = await createTelegramTestApp());
  });

  afterAll(async () => {
    delete process.env.DATABASE_BACKUP_CHAT_ID;
    delete process.env.TELEGRAM_BOT_TOKEN;
    await app?.close();
  });

  it('skips silently while not configured', async () => {
    delete process.env.DATABASE_BACKUP_CHAT_ID;

    const ran = await app.get(DatabaseBackupService).run();

    expect(ran).toBe(false);
    expect(outbox.filter((call) => call.url.includes('sendDocument'))).toHaveLength(0);
  });

  it('produces a restorable dump of the real schema', async () => {
    const dump: Buffer = await (app.get(DatabaseBackupService) as any).dumpDatabase(
      process.env.DATABASE_URL,
    );
    const text = dump.toString();

    expect(text).toContain('CREATE TABLE');
    expect(text).toContain('bills');
    expect(text).toContain('transactions');
    expect(text).toContain('users');
  });

  it('delivers the gzipped dump to the configured chat', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'e2e-backup-token';
    process.env.DATABASE_BACKUP_CHAT_ID = '999000111';
    outbox.length = 0;

    const ran = await app.get(DatabaseBackupService).run();
    expect(ran).toBe(true);

    const sends = outbox.filter((call) =>
      call.url.includes('/bote2e-backup-token/sendDocument'),
    );
    expect(sends).toHaveLength(1);

    // The multipart body carries a real gzip stream, not an empty attachment.
    const body: Buffer = sends[0].body.getBuffer();
    expect(body.length).toBeGreaterThan(500);
    expect(body.includes(Buffer.from([0x1f, 0x8b]))).toBe(true);
    expect(body.toString().includes('financy-backup-')).toBe(true);
  });
});
