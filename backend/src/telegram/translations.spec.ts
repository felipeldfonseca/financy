import { telegramTranslations, getTelegramTranslation } from './translations';

/**
 * The bot speaks three languages; a key present in one but missing in another
 * surfaces as `undefined` sent to a user. English is the reference.
 */
const leafPaths = (value: any, prefix = ''): string[] => {
  if (value === null || typeof value !== 'object') {
    return [prefix];
  }
  if (Array.isArray(value)) {
    // Arrays are phrase pools; their presence is what matters, not length.
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
};

describe('Telegram translations', () => {
  const reference = leafPaths(telegramTranslations.en).sort();

  it.each(['pt', 'es'])('%s has every key English has', (lang) => {
    const paths = leafPaths(telegramTranslations[lang]).sort();
    expect(paths).toEqual(reference);
  });

  it('exposes the receipt messages the OCR flow relies on', () => {
    for (const lang of ['en', 'pt', 'es']) {
      const receipt = telegramTranslations[lang].receipt;
      expect(receipt.processingPdf).toEqual(expect.any(String));
      expect(receipt.unsupportedFile).toEqual(expect.any(String));
      expect(receipt.notRecognized).toEqual(expect.any(String));
    }
  });

  it('falls back to English for an unknown language', () => {
    expect(getTelegramTranslation('fr')).toBe(telegramTranslations.en);
    expect(getTelegramTranslation(undefined as any)).toBe(telegramTranslations.en);
  });
});
