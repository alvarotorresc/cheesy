import { TestBed } from '@angular/core/testing';
import { I18nService } from '../i18n';
import { colorOfPly, READING_MODE_STORAGE_KEY, ReadingModeService } from './reading-mode.service';

const createService = (): ReadingModeService => {
  TestBed.configureTestingModule({});
  TestBed.inject(I18nService).setLang('es');
  return TestBed.inject(ReadingModeService);
};

describe('ReadingModeService', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should start in words mode when nothing was stored', () => {
    expect(createService().mode()).toBe('words');
  });

  it('should use the stored mode', () => {
    localStorage.setItem(READING_MODE_STORAGE_KEY, 'notation');

    expect(createService().mode()).toBe('notation');
  });

  it('should ignore a stored value that is not a mode', () => {
    localStorage.setItem(READING_MODE_STORAGE_KEY, 'braille');

    expect(createService().mode()).toBe('words');
  });

  it('should remember the chosen mode', () => {
    createService().setMode('notation');

    expect(localStorage.getItem(READING_MODE_STORAGE_KEY)).toBe('notation');
  });

  it('should keep the choice for the visit when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const mode = createService();

    mode.setMode('notation');

    expect(mode.mode()).toBe('notation');
  });

  it('should write a move for a message in the active mode and language', () => {
    const mode = createService();

    expect(mode.full('Nf3')).toBe('Caballo a f3');
    expect(mode.full('Nf3', { start: false })).toBe('caballo a f3');
    mode.setMode('notation');
    expect(mode.full('Nf3')).toBe('Cf3');
  });

  it('should number a move like a score sheet in both modes', () => {
    const mode = createService();

    expect(mode.numbered(5, 'Bb5')).toBe('3. Alfil a b5');
    expect(mode.numbered(6, 'a6')).toBe('3... Peón a a6');
    mode.setMode('notation');
    expect(mode.numbered(5, 'Bb5')).toBe('3.Ab5');
    expect(mode.numbered(6, 'a6')).toBe('3...a6');
  });

  it('should always tell the sentence for screen readers', () => {
    const mode = createService();
    mode.setMode('notation');

    expect(mode.spoken('Bxf7+')).toBe('Alfil captura en f7, jaque');
  });
});

describe('colorOfPly', () => {
  it('should give white to odd plies and black to even ones', () => {
    expect(colorOfPly(1)).toBe('white');
    expect(colorOfPly(2)).toBe('black');
    expect(colorOfPly(39)).toBe('white');
  });
});
