/**
 * Checks whether the configured sender address can actually deliver, so a
 * mistake shows up in the deployment logs instead of as invitations that
 * quietly never arrive.
 */

export type SenderAssessment =
  | { status: 'ok'; address: string; domain: string }
  | { status: 'shared-testing-sender'; address: string; domain: string }
  | { status: 'unverifiable-domain'; address: string; domain: string }
  | { status: 'malformed'; address: string; domain: null };

/**
 * Providers require the sending domain to be verified through DNS, which is
 * impossible for a mailbox you merely have an account on: nobody but Google
 * controls gmail.com's DNS. An address here can never send, whatever the plan.
 */
const MAILBOX_ONLY_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.com.br',
  'outlook.com',
  'outlook.com.br',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.com.br',
  'ymail.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'uol.com.br',
  'bol.com.br',
  'terra.com.br',
  'ig.com.br',
  'globo.com',
]);

/** Resend's shared sender: usable with no setup, but heavily restricted. */
const SHARED_TESTING_ADDRESS = 'onboarding@resend.dev';

/** Accepts both `user@example.com` and `Name <user@example.com>`. */
export const parseSenderAddress = (from: string): string | null => {
  const angled = from.match(/<([^>]+)>/);
  const candidate = (angled ? angled[1] : from).trim();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : null;
};

export const assessSender = (from: string): SenderAssessment => {
  const address = parseSenderAddress(from ?? '');

  if (!address) {
    return { status: 'malformed', address: from, domain: null };
  }

  const domain = address.split('@')[1].toLowerCase();

  if (address.toLowerCase() === SHARED_TESTING_ADDRESS) {
    return { status: 'shared-testing-sender', address, domain };
  }

  if (MAILBOX_ONLY_DOMAINS.has(domain)) {
    return { status: 'unverifiable-domain', address, domain };
  }

  return { status: 'ok', address, domain };
};
