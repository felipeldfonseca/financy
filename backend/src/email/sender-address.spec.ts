import { assessSender, parseSenderAddress } from './sender-address';

describe('parseSenderAddress', () => {
  it('reads both the bare and the display-name forms', () => {
    expect(parseSenderAddress('convites@financy.app')).toBe('convites@financy.app');
    expect(parseSenderAddress('Financy <convites@financy.app>')).toBe('convites@financy.app');
    expect(parseSenderAddress('  Financy <convites@financy.app>  ')).toBe('convites@financy.app');
  });

  it('rejects anything that is not an address', () => {
    expect(parseSenderAddress('Financy')).toBeNull();
    expect(parseSenderAddress('not-an-email')).toBeNull();
    expect(parseSenderAddress('user@localhost')).toBeNull();
    expect(parseSenderAddress('')).toBeNull();
  });
});

describe('assessSender', () => {
  it('accepts an address on a domain the operator can verify', () => {
    expect(assessSender('Financy <convites@financy.app>')).toMatchObject({
      status: 'ok',
      address: 'convites@financy.app',
      domain: 'financy.app',
    });
  });

  it('flags mailbox providers that can never be verified as senders', () => {
    // The exact mistake this check exists for: a personal address in
    // EMAIL_FROM, which the provider rejects on every send.
    expect(assessSender('Financy <felipe@gmail.com>').status).toBe('unverifiable-domain');

    for (const domain of ['hotmail.com', 'outlook.com', 'yahoo.com.br', 'icloud.com', 'uol.com.br']) {
      expect(assessSender(`someone@${domain}`).status).toBe('unverifiable-domain');
    }
  });

  it('recognises the shared testing sender as usable but restricted', () => {
    expect(assessSender('Financy <onboarding@resend.dev>').status).toBe('shared-testing-sender');
    expect(assessSender('ONBOARDING@RESEND.DEV').status).toBe('shared-testing-sender');
  });

  it('reports a malformed value rather than guessing', () => {
    expect(assessSender('Financy').status).toBe('malformed');
    expect(assessSender('').status).toBe('malformed');
    expect(assessSender(undefined as any).status).toBe('malformed');
  });

  it('ignores casing when judging the domain', () => {
    expect(assessSender('Financy <Felipe@GMAIL.com>').status).toBe('unverifiable-domain');
  });
});
