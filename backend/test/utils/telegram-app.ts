import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';

export interface OutboundCall {
  url: string;
  body?: any;
}

/**
 * Boots the real application with one substitution: every outbound HTTP call
 * (Telegram sendMessage above all) is recorded in `outbox` instead of leaving
 * the process. That turns the bot's side of a conversation into data a test
 * can read — including the inline-keyboard callback data needed to press its
 * buttons back.
 */
export async function createTelegramTestApp(): Promise<{
  app: INestApplication;
  outbox: OutboundCall[];
}> {
  const outbox: OutboundCall[] = [];

  const httpStub = {
    post: (url: string, body?: any) => {
      outbox.push({ url, body });
      return of({ data: { ok: true, result: {} } });
    },
    get: (url: string) => {
      outbox.push({ url });
      return of({ data: { ok: true, result: {} } });
    },
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(HttpService)
    .useValue(httpStub)
    .compile();

  const app = moduleFixture.createNestApplication();
  configureApp(app);
  await app.init();

  return { app, outbox };
}

/** Messages the bot sent to a chat, oldest first. */
export const sentMessages = (outbox: OutboundCall[]): any[] =>
  outbox.filter((call) => call.url.endsWith('/sendMessage')).map((call) => call.body);

/** Every inline-keyboard button in the bot's sent messages, flattened. */
export const sentButtons = (outbox: OutboundCall[]): Array<{ text: string; callback_data: string }> =>
  sentMessages(outbox)
    .flatMap((body) => body?.reply_markup?.inline_keyboard ?? [])
    .flat();
