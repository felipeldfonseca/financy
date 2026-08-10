import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { assessSender } from './sender-address';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends transactional email through Resend's HTTP API.
 *
 * Delivery is deliberately optional: with no API key configured the service
 * reports itself disabled and every send is a no-op that returns false. The
 * features that use it must keep working without email — invitations, for
 * instance, still hand the inviter a link to share by other means. That keeps
 * a missing or expired key from turning into a broken product.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey?: string;
  private readonly from: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from = this.configService.get<string>('EMAIL_FROM', 'Financy <onboarding@resend.dev>');

    this.reportConfiguration();
  }

  /**
   * Says at boot whether email will actually be delivered. A sender the
   * provider will reject only shows up as invitations that never arrive, and
   * nobody reports an email they did not know to expect — so the problem
   * belongs in the deployment logs, not in a support message weeks later.
   */
  private reportConfiguration(): void {
    if (!this.apiKey) {
      this.logger.log(
        'RESEND_API_KEY not configured. Transactional email is disabled; invitations fall back to a shareable link.',
      );
      return;
    }

    const sender = assessSender(this.from);

    switch (sender.status) {
      case 'malformed':
        this.logger.error(
          `EMAIL_FROM ("${this.from}") is not a valid address. Use "Name <user@your-domain.com>". No email will be delivered.`,
        );
        break;

      case 'unverifiable-domain':
        this.logger.error(
          `EMAIL_FROM uses ${sender.domain}, a mailbox provider whose DNS you cannot control, so it can never be verified as a sending domain and every send will be rejected. ` +
            'Use "onboarding@resend.dev" to test, or verify your own domain at https://resend.com/domains. Invitations still work through their shareable link.',
        );
        break;

      case 'shared-testing-sender':
        this.logger.warn(
          "Sending from Resend's shared testing address: delivery only works to the address that owns the Resend account. " +
            'Verify your own domain to email anyone else.',
        );
        break;

      case 'ok':
        this.logger.log(`Transactional email enabled (sending from ${sender.address}).`);
        break;
    }
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Returns whether the message was accepted for delivery. Never throws: a
   * failure to send must not fail the action that triggered it.
   */
  async send(message: EmailMessage): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          'https://api.resend.com/emails',
          {
            from: this.from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      // The recipient address is the useful diagnostic; the body is not logged
      // because transactional email carries personal content.
      this.logger.log(`Email sent to ${message.to} (id: ${response.data?.id ?? 'unknown'})`);
      return true;
    } catch (error) {
      const detail = error.response?.data?.message || error.message;
      this.logger.error(`Failed to send email to ${message.to}: ${detail}`);
      return false;
    }
  }
}
