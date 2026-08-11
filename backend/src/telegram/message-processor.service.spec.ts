import { MessageProcessorService } from './message-processor.service';

/**
 * The confirm button looks a transaction up by its temp id. A receipt that was
 * read but never stored fails at confirmation with "Transaction data expired" —
 * the exact bug this guards against. finalizeTransaction must both mint the id
 * and store it, for every path that produces a transaction.
 */
const buildService = () => {
  const configService = { get: (_key: string, fallback?: string) => fallback };
  return new MessageProcessorService(configService as any, {} as any, {} as any);
};

const parsed = {
  amount: 101.08,
  currency: 'BRL',
  type: 'expense' as const,
  description: 'Internet service bill from Alares',
  category: 'housing',
  merchantName: 'Alares Internet',
  confidence: 0.95,
};

describe('MessageProcessorService.finalizeTransaction', () => {
  it('stores the transaction so confirmation can find it', async () => {
    const service = buildService();

    const finalized = service.finalizeTransaction(parsed, 'Receipt PDF');

    expect(finalized.tempId).toEqual(expect.any(String));
    expect(finalized.originalText).toBe('Receipt PDF');

    // This is exactly what confirmTransaction does with the callback id.
    const stored = await service.getStoredTransaction(finalized.tempId);
    expect(stored).toMatchObject({
      amount: 101.08,
      currency: 'BRL',
      description: 'Internet service bill from Alares',
      category: 'housing',
    });
  });

  it('gives each receipt a distinct id', () => {
    const service = buildService();

    const a = service.finalizeTransaction(parsed, 'Receipt PDF');
    const b = service.finalizeTransaction(parsed, 'Receipt photo');

    expect(a.tempId).not.toBe(b.tempId);
  });

  it('drops a stored transaction once confirmed', async () => {
    const service = buildService();
    const finalized = service.finalizeTransaction(parsed, 'Receipt photo');

    await service.removeStoredTransaction(finalized.tempId);

    expect(await service.getStoredTransaction(finalized.tempId)).toBeNull();
  });
});
