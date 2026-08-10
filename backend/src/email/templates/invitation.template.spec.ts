import { buildInvitationEmail, InvitationEmailData } from './invitation.template';

const base: InvitationEmailData = {
  recipientEmail: 'invitee@example.test',
  recipientName: 'Maria Silva',
  inviterName: 'Felipe Fonseca',
  contextName: 'Casa',
  acceptUrl: 'https://financy-frontend.vercel.app/invitations/abc123',
  expiresAt: new Date('2026-08-13T12:00:00.000Z'),
};

describe('invitation email', () => {
  it('addresses the recipient and links to the invitation', () => {
    const email = buildInvitationEmail(base);

    expect(email.to).toBe('invitee@example.test');
    expect(email.html).toContain(base.acceptUrl);
    expect(email.text).toContain(base.acceptUrl);
    expect(email.html).toContain('Maria Silva');
    expect(email.subject).toContain('Felipe Fonseca');
    expect(email.subject).toContain('Casa');
  });

  it('writes in the recipient language', () => {
    expect(buildInvitationEmail({ ...base, language: 'pt' }).html).toContain('Aceitar convite');
    expect(buildInvitationEmail({ ...base, language: 'es' }).html).toContain('Aceptar invitación');
    expect(buildInvitationEmail({ ...base, language: 'en' }).html).toContain('Accept invitation');
  });

  it('falls back to English for a language it does not have', () => {
    expect(buildInvitationEmail({ ...base, language: 'de' }).html).toContain('Accept invitation');
    expect(buildInvitationEmail({ ...base, language: undefined }).html).toContain(
      'Accept invitation',
    );
  });

  it('includes the personal note when there is one', () => {
    const email = buildInvitationEmail({ ...base, message: 'Vamos dividir as contas!' });

    expect(email.html).toContain('Vamos dividir as contas!');
    expect(email.text).toContain('Vamos dividir as contas!');
  });

  it('escapes user-supplied text so it cannot inject markup', () => {
    const email = buildInvitationEmail({
      ...base,
      inviterName: '<script>alert(1)</script>',
      contextName: 'Casa & "Cia"',
      message: '<img src=x onerror=alert(1)>',
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<img src=x');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain('Casa &amp; &quot;Cia&quot;');
  });

  it('states the expiry date in the recipient locale', () => {
    expect(buildInvitationEmail({ ...base, language: 'pt' }).html).toContain('agosto');
    expect(buildInvitationEmail({ ...base, language: 'en' }).html).toContain('August');
  });
});
