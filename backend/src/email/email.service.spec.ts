import { of, throwError } from 'rxjs';
import { EmailService } from './email.service';

const buildService = (config: Record<string, string | undefined>) => {
  const configService = {
    get: (key: string, fallback?: string) => config[key] ?? fallback,
  };

  const posted: Array<{ url: string; body: any; options: any }> = [];
  let failure: Error | null = null;

  const httpService = {
    post: (url: string, body: any, options: any) => {
      posted.push({ url, body, options });
      if (failure) {
        return throwError(() => failure);
      }
      return of({ data: { id: 'email-1' } });
    },
  };

  const service = new EmailService(configService as any, httpService as any);

  return {
    service,
    posted,
    failWith: (error: Error) => {
      failure = error;
    },
  };
};

const message = {
  to: 'invitee@example.test',
  subject: 'Subject',
  html: '<p>Body</p>',
  text: 'Body',
};

describe('EmailService', () => {
  describe('without a provider configured', () => {
    it('reports itself disabled and sends nothing', async () => {
      const { service, posted } = buildService({});

      expect(service.isEnabled()).toBe(false);
      expect(await service.send(message)).toBe(false);
      expect(posted).toHaveLength(0);
    });
  });

  describe('with a provider configured', () => {
    it('posts the message and reports success', async () => {
      const { service, posted } = buildService({
        RESEND_API_KEY: 'key-123',
        EMAIL_FROM: 'Financy <hello@financy.test>',
      });

      expect(service.isEnabled()).toBe(true);
      expect(await service.send(message)).toBe(true);

      expect(posted).toHaveLength(1);
      expect(posted[0].url).toBe('https://api.resend.com/emails');
      expect(posted[0].body).toMatchObject({
        from: 'Financy <hello@financy.test>',
        to: ['invitee@example.test'],
        subject: 'Subject',
      });
      expect(posted[0].options.headers.Authorization).toBe('Bearer key-123');
    });

    it('reports failure instead of throwing, so the caller can carry on', async () => {
      const { service, failWith } = buildService({ RESEND_API_KEY: 'key-123' });
      failWith(new Error('provider unreachable'));

      await expect(service.send(message)).resolves.toBe(false);
    });
  });
});
