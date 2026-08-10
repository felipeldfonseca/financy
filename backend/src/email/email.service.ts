import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

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

    if (!this.apiKey) {
      this.logger.log('RESEND_API_KEY not configured. Transactional email is disabled.');
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
