import { of } from 'rxjs';
import { TelegramService } from './telegram.service';

/**
 * TelegramService reads its configuration in the constructor and touches no
 * other dependency until a message arrives, so the webhook authentication can
 * be exercised without standing up the whole module.
 */
const buildService = (config: Record<string, string | undefined>) => {
  const configService = {
    get: (key: string, fallback?: string) => config[key] ?? fallback,
  };

  const posted: Array<{ url: string; body: any }> = [];
  const httpService = {
    post: (url: string, body: any) => {
      posted.push({ url, body });
      return of({ data: { ok: true } });
    },
  };

  const service = new TelegramService(
    configService as any,
    httpService as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
  );

  return { service, posted };
};

const BOT_TOKEN = '8334271666:AAtest-token-value';

describe('TelegramService webhook authentication', () => {
  it('accepts exactly the secret it registers with Telegram', async () => {
    const { service, posted } = buildService({
      TELEGRAM_BOT_TOKEN: BOT_TOKEN,
      TELEGRAM_WEBHOOK_URL: 'https://api.example.test/api/v1/webhooks/telegram',
    });

    await service.setupWebhook();

    const registered = posted.find((call) => call.url.endsWith('/setWebhook'));
    expect(registered).toBeDefined();
    expect(registered!.body.secret_token).toEqual(expect.any(String));

    // The registered secret and the accepted secret cannot drift apart.
    expect(service.verifyWebhookSecret(registered!.body.secret_token)).toBe(true);
  });

  it('rejects a missing, wrong or near-miss secret', async () => {
    const { service, posted } = buildService({ TELEGRAM_BOT_TOKEN: BOT_TOKEN });
    await service.setupWebhook();
    const secret: string = posted[0].body.secret_token;

    expect(service.verifyWebhookSecret(undefined)).toBe(false);
    expect(service.verifyWebhookSecret('')).toBe(false);
    expect(service.verifyWebhookSecret('guess')).toBe(false);
    expect(service.verifyWebhookSecret(secret.slice(0, -1))).toBe(false);
    expect(service.verifyWebhookSecret(secret + 'a')).toBe(false);
    expect(service.verifyWebhookSecret(secret.toUpperCase())).toBe(false);
  });

  it('derives a secret Telegram will accept', async () => {
    const { service, posted } = buildService({ TELEGRAM_BOT_TOKEN: BOT_TOKEN });
    await service.setupWebhook();

    expect(posted[0].body.secret_token).toMatch(/^[A-Za-z0-9_-]{1,256}$/);
  });

  it('produces the same secret across restarts with the same token', async () => {
    const first = buildService({ TELEGRAM_BOT_TOKEN: BOT_TOKEN });
    const second = buildService({ TELEGRAM_BOT_TOKEN: BOT_TOKEN });
    await first.service.setupWebhook();

    expect(second.service.verifyWebhookSecret(first.posted[0].body.secret_token)).toBe(true);
  });

  it('changes the secret when the bot token is rotated', async () => {
    const before = buildService({ TELEGRAM_BOT_TOKEN: BOT_TOKEN });
    const after = buildService({ TELEGRAM_BOT_TOKEN: '999:rotated-token' });
    await before.service.setupWebhook();

    expect(after.service.verifyWebhookSecret(before.posted[0].body.secret_token)).toBe(false);
  });

  it('uses an explicitly configured secret when one is set', async () => {
    const { service, posted } = buildService({
      TELEGRAM_BOT_TOKEN: BOT_TOKEN,
      TELEGRAM_WEBHOOK_SECRET: 'my-own-secret_value',
    });
    await service.setupWebhook();

    expect(posted[0].body.secret_token).toBe('my-own-secret_value');
    expect(service.verifyWebhookSecret('my-own-secret_value')).toBe(true);
  });

  it('falls back to the derived secret when the configured one is unusable', async () => {
    const { service, posted } = buildService({
      TELEGRAM_BOT_TOKEN: BOT_TOKEN,
      // Spaces and "!" are rejected by Telegram, which would leave setWebhook
      // failing and the bot unreachable.
      TELEGRAM_WEBHOOK_SECRET: 'not valid!',
    });
    await service.setupWebhook();

    expect(posted[0].body.secret_token).not.toBe('not valid!');
    expect(posted[0].body.secret_token).toMatch(/^[A-Za-z0-9_-]{1,256}$/);
    expect(service.verifyWebhookSecret(posted[0].body.secret_token)).toBe(true);
  });

  it('fails closed when the integration is not configured', () => {
    const { service } = buildService({});

    expect(service.verifyWebhookSecret('anything')).toBe(false);
    expect(service.verifyWebhookSecret('')).toBe(false);
  });
});
