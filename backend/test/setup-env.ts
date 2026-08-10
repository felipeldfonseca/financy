/**
 * Defaults that make the e2e suite self-contained: it must not depend on a
 * developer's local environment, and it must never reach the network.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Without a bot token the Telegram module stays inert, so no test run tries to
// register a webhook against the real Telegram API.
delete process.env.TELEGRAM_BOT_TOKEN;
