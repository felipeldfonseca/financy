import { of } from 'rxjs';
import { TelegramService } from './telegram.service';
import { ParsedTransaction } from './interfaces/telegram.interface';

/**
 * The receipt-vs-bill fork: a reading with a due date must offer
 * "already paid / bill to pay", an ordinary receipt the plain confirm flow.
 * Exercised directly against the presentation method with the bot's outbound
 * messages recorded.
 */
const buildService = () => {
  const posted: Array<{ url: string; body: any }> = [];
  const httpService = {
    post: (url: string, body: any) => {
      posted.push({ url, body });
      return of({ data: { ok: true } });
    },
  };
  const configService = { get: (_key: string, fallback?: string) => fallback };
  const usersRepository = { findOne: async () => ({ language: 'pt' }) };

  const service = new TelegramService(
    configService as any,
    httpService as any,
    usersRepository as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
  );

  const buttonsOf = (call: { body: any }): Array<{ text: string; callback_data: string }> =>
    (call.body?.reply_markup?.inline_keyboard ?? []).flat();

  return { service: service as any, posted, buttonsOf };
};

const baseTransaction: ParsedTransaction = {
  amount: 101.08,
  currency: 'BRL',
  type: 'expense',
  description: 'Internet Alares',
  category: 'housing',
  merchantName: 'Alares',
  confidence: 0.95,
  tempId: 'temp123',
  date: '2026-06-28',
};

describe('presentExtractedReceipts bill fork', () => {
  it('offers already-paid / bill-to-pay when a due date was detected', async () => {
    const { service, posted, buttonsOf } = buildService();

    await service.presentExtractedReceipts(
      42,
      [{ ...baseTransaction, dueDate: '2026-07-05' }],
      'user-1',
    );

    expect(posted).toHaveLength(1);
    const buttons = buttonsOf(posted[0]).map((button) => button.callback_data);
    expect(buttons).toEqual(['confirm_temp123', 'bill_temp123', 'cancel_temp123']);

    // The card says when it is due — and that it already slipped.
    expect(posted[0].body.text).toContain('Vencimento');
    expect(posted[0].body.text).toContain('em atraso');
  });

  it('treats a future-dated reading as a bill even without an explicit due date', async () => {
    const { service, posted, buttonsOf } = buildService();
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 10);

    await service.presentExtractedReceipts(
      42,
      [{ ...baseTransaction, date: future.toISOString().slice(0, 10) }],
      'user-1',
    );

    const buttons = buttonsOf(posted[0]).map((button) => button.callback_data);
    expect(buttons).toContain('bill_temp123');
    expect(posted[0].body.text).not.toContain('em atraso');
  });

  it('keeps the plain confirm flow for an ordinary receipt', async () => {
    const { service, posted, buttonsOf } = buildService();

    await service.presentExtractedReceipts(42, [baseTransaction], 'user-1');

    const buttons = buttonsOf(posted[0]).map((button) => button.callback_data);
    expect(buttons).toEqual(['confirm_temp123', 'edit_temp123', 'cancel_temp123']);
  });
});
