import { isContentId } from './content-id';

describe('isContentId', () => {
  it('should accept kebab-case ids', () => {
    expect(isContentId('ruy-lopez')).toBe(true);
    expect(isContentId('caro-kann-defence')).toBe(true);
    expect(isContentId('a1')).toBe(true);
  });

  it.each(['', 'Ruy-Lopez', 'ruy--lopez', '-ruy', 'ruy-', 'ruy lopez', '../ruy', 'ruy_lopez'])(
    'should reject %j',
    (id) => {
      expect(isContentId(id)).toBe(false);
    },
  );

  it.each([undefined, null, 42, {}])('should reject a value that is not text: %j', (value) => {
    expect(isContentId(value)).toBe(false);
  });

  it('should reject ids longer than 64 characters', () => {
    expect(isContentId('a'.repeat(64))).toBe(true);
    expect(isContentId('a'.repeat(65))).toBe(false);
  });
});
