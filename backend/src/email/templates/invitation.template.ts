import { EmailMessage } from '../email.service';

export interface InvitationEmailData {
  recipientEmail: string;
  recipientName: string;
  inviterName: string;
  contextName: string;
  /** Personal note the inviter typed, if any. */
  message?: string;
  acceptUrl: string;
  expiresAt: Date;
  /** Recipient's language; anything unknown falls back to English. */
  language?: string;
}

type Copy = {
  subject: (data: InvitationEmailData) => string;
  greeting: (name: string) => string;
  lead: (inviter: string, context: string) => string;
  cta: string;
  expiry: (date: string) => string;
  fallback: string;
  signature: string;
  locale: string;
};

const COPY: Record<string, Copy> = {
  en: {
    subject: (data) => `${data.inviterName} invited you to "${data.contextName}" on Financy`,
    greeting: (name) => `Hi ${name},`,
    lead: (inviter, context) =>
      `${inviter} invited you to share the finances of <strong>${context}</strong> on Financy.`,
    cta: 'Accept invitation',
    expiry: (date) => `This invitation expires on ${date}.`,
    fallback: 'If the button does not work, paste this link into your browser:',
    signature: 'Financy',
    locale: 'en-US',
  },
  pt: {
    subject: (data) => `${data.inviterName} convidou você para "${data.contextName}" no Financy`,
    greeting: (name) => `Olá ${name},`,
    lead: (inviter, context) =>
      `${inviter} convidou você para compartilhar as finanças de <strong>${context}</strong> no Financy.`,
    cta: 'Aceitar convite',
    expiry: (date) => `Este convite expira em ${date}.`,
    fallback: 'Se o botão não funcionar, cole este link no seu navegador:',
    signature: 'Financy',
    locale: 'pt-BR',
  },
  es: {
    subject: (data) => `${data.inviterName} te invitó a "${data.contextName}" en Financy`,
    greeting: (name) => `Hola ${name},`,
    lead: (inviter, context) =>
      `${inviter} te invitó a compartir las finanzas de <strong>${context}</strong> en Financy.`,
    cta: 'Aceptar invitación',
    expiry: (date) => `Esta invitación caduca el ${date}.`,
    fallback: 'Si el botón no funciona, pega este enlace en tu navegador:',
    signature: 'Financy',
    locale: 'es-ES',
  },
};

/** Keeps user-supplied text (names, notes) from breaking out into markup. */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const buildInvitationEmail = (data: InvitationEmailData): EmailMessage => {
  const copy = COPY[(data.language || 'en').slice(0, 2).toLowerCase()] ?? COPY.en;
  const expiry = data.expiresAt.toLocaleDateString(copy.locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const safeInviter = escapeHtml(data.inviterName);
  const safeContext = escapeHtml(data.contextName);
  const safeName = escapeHtml(data.recipientName);
  const safeMessage = data.message ? escapeHtml(data.message) : undefined;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <h1 style="font-size: 20px; margin: 0 0 24px;">Financy</h1>
  <p style="margin: 0 0 16px;">${copy.greeting(safeName)}</p>
  <p style="margin: 0 0 16px;">${copy.lead(safeInviter, safeContext)}</p>
  ${
    safeMessage
      ? `<blockquote style="margin: 0 0 16px; padding: 12px 16px; border-left: 3px solid #1976d2; background: #f5f7fa; color: #444;">${safeMessage}</blockquote>`
      : ''
  }
  <p style="margin: 24px 0;">
    <a href="${data.acceptUrl}" style="display: inline-block; background: #1976d2; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">${copy.cta}</a>
  </p>
  <p style="margin: 0 0 8px; color: #666; font-size: 13px;">${copy.expiry(expiry)}</p>
  <p style="margin: 0 0 4px; color: #666; font-size: 13px;">${copy.fallback}</p>
  <p style="margin: 0 0 24px; word-break: break-all; font-size: 13px;"><a href="${data.acceptUrl}" style="color: #1976d2;">${data.acceptUrl}</a></p>
  <p style="margin: 0; color: #999; font-size: 12px;">${copy.signature}</p>
</div>`.trim();

  const text = [
    copy.greeting(data.recipientName),
    '',
    copy.lead(data.inviterName, data.contextName).replace(/<[^>]+>/g, ''),
    data.message ? `\n"${data.message}"\n` : '',
    data.acceptUrl,
    '',
    copy.expiry(expiry),
    '',
    copy.signature,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    to: data.recipientEmail,
    subject: copy.subject({ ...data, inviterName: data.inviterName }),
    html,
    text,
  };
};
