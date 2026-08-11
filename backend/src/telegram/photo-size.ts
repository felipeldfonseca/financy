export interface TelegramPhotoSize {
  file_id: string;
  width?: number;
  height?: number;
}

/**
 * Telegram sends one photo as several PhotoSize entries — the same image from
 * a thumbnail (as small as 90x67) up to full resolution. Receipt OCR needs the
 * largest; feeding a model the thumbnail is why every read failed. Returns the
 * entry with the most pixels.
 */
export function selectLargestPhotoSize(
  sizes: TelegramPhotoSize[] | TelegramPhotoSize,
): TelegramPhotoSize {
  if (!Array.isArray(sizes)) {
    return sizes;
  }

  return sizes.reduce((best, current) => {
    const bestArea = (best.width || 0) * (best.height || 0);
    const currentArea = (current.width || 0) * (current.height || 0);
    return currentArea > bestArea ? current : best;
  });
}
