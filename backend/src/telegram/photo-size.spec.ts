import { selectLargestPhotoSize } from './photo-size';

describe('selectLargestPhotoSize', () => {
  it('picks the full-resolution size, not a thumbnail', () => {
    // The shape Telegram actually sends: same photo, ascending sizes.
    const sizes = [
      { file_id: 'thumb', width: 90, height: 67 },
      { file_id: 'small', width: 320, height: 240 },
      { file_id: 'medium', width: 800, height: 600 },
      { file_id: 'full', width: 1280, height: 960 },
    ];

    expect(selectLargestPhotoSize(sizes).file_id).toBe('full');
  });

  it('is order-independent', () => {
    const sizes = [
      { file_id: 'full', width: 1280, height: 960 },
      { file_id: 'thumb', width: 90, height: 67 },
    ];

    expect(selectLargestPhotoSize(sizes).file_id).toBe('full');
  });

  it('handles a single object that is not wrapped in an array', () => {
    const single = { file_id: 'only', width: 100, height: 100 };

    expect(selectLargestPhotoSize(single).file_id).toBe('only');
  });

  it('tolerates missing dimensions without crashing', () => {
    const sizes = [
      { file_id: 'no-dims' },
      { file_id: 'sized', width: 200, height: 200 },
    ];

    expect(selectLargestPhotoSize(sizes).file_id).toBe('sized');
  });
});
