import { isOpeningId } from './opening-id';

describe('isOpeningId', () => {
  it('should accept kebab-case ids', () => {
    expect(isOpeningId('ruy-lopez')).toBe(true);
    expect(isOpeningId('caro-kann-defence')).toBe(true);
    expect(isOpeningId('a1')).toBe(true);
  });

  it.each(['', 'Ruy-Lopez', 'ruy--lopez', '-ruy', 'ruy-', 'ruy lopez', '../ruy', 'ruy_lopez'])(
    'should reject %j',
    (id) => {
      expect(isOpeningId(id)).toBe(false);
    },
  );

  it('should reject ids longer than 64 characters', () => {
    expect(isOpeningId('a'.repeat(64))).toBe(true);
    expect(isOpeningId('a'.repeat(65))).toBe(false);
  });
});
