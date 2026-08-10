import { describeContent, describeTransaction, describeUpdate } from './log-sanitizer';
import { TelegramUpdate } from '../interfaces/telegram.interface';

const update = {
  update_id: 7,
  message: {
    message_id: 7,
    from: { id: 42, is_bot: false, first_name: 'Felipe', last_name: 'Fonseca', username: 'felipe' },
    chat: { id: 42, type: 'private' },
    date: 1786000000,
    text: 'Gastei R$487,90 na farmacia com remedio de pressao',
  },
} as TelegramUpdate;

const transaction = {
  amount: 487.9,
  description: 'remedio de pressao',
  merchantName: 'Drogasil',
  category: 'healthfitness',
  currency: 'BRL',
  type: 'expense',
  confidence: 0.9,
};

describe('log sanitizer', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('keeps message content out of update logs', () => {
      const logged = describeUpdate(update);

      expect(logged).not.toContain('farmacia');
      expect(logged).not.toContain('remedio');
      expect(logged).not.toContain('Felipe');
      expect(logged).not.toContain('Fonseca');
      expect(logged).not.toContain('felipe');
    });

    it('still records what a log line refers to', () => {
      expect(JSON.parse(describeUpdate(update))).toMatchObject({
        updateId: 7,
        chatId: 42,
        chatType: 'private',
        fromId: 42,
        kinds: ['text'],
      });
    });

    it('reports the size of free-form content instead of the content', () => {
      expect(describeContent('remedio de pressao')).toBe('[redacted, 18 chars]');
      expect(describeContent(undefined)).toBe('[empty]');
    });

    it('reports the shape of a parsed transaction, not its values', () => {
      const logged = describeTransaction(transaction);

      expect(logged).not.toContain('487');
      expect(logged).not.toContain('Drogasil');
      expect(logged).not.toContain('remedio');
      expect(JSON.parse(logged)).toEqual({
        type: 'expense',
        category: 'healthfitness',
        currency: 'BRL',
        hasAmount: true,
        hasDescription: true,
        hasMerchant: true,
        confidence: 0.9,
      });
    });

    it('describes voice and photo messages without their captions', () => {
      const voiceUpdate = {
        update_id: 8,
        message: {
          message_id: 8,
          chat: { id: 1, type: 'private' },
          date: 1,
          voice: { file_id: 'abc', duration: 3 },
          caption: 'secret caption',
        },
      } as unknown as TelegramUpdate;

      const logged = describeUpdate(voiceUpdate);

      expect(JSON.parse(logged).kinds).toEqual(['caption', 'voice']);
      expect(logged).not.toContain('secret caption');
    });
  });

  describe('outside production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('keeps full payloads so parsing can be debugged locally', () => {
      expect(describeUpdate(update)).toContain('farmacia');
      expect(describeContent('remedio de pressao')).toBe('remedio de pressao');
      expect(describeTransaction(transaction)).toContain('Drogasil');
    });
  });
});
