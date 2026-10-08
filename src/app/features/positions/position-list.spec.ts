import { bundledGlossaryLoader, plainText } from '../../core/content/testing';
import { TestBed } from '@angular/core/testing';
import { CONTENT_LOADERS, type ContentLoaders, type CuratedPosition } from '../../core/content';
import { en } from '../../core/i18n/dictionaries/en';
import { es } from '../../core/i18n/dictionaries/es';
import { sideToPlayLabel, tagLabel } from './position-labels';
import { PositionList } from './position-list';

const POSITION: CuratedPosition = {
  id: 'one',
  title: { es: 'Una', en: 'One' },
  fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
  playerSide: 'white',
  solution: ['Rh8#'],
  explanation: plainText('Mate.'),
  about: plainText('Sobre la posición.', 'About the position.'),
  tags: ['back-rank'],
};

const setup = (positions: ContentLoaders['positions']): PositionList => {
  TestBed.configureTestingModule({
    providers: [
      PositionList,
      { provide: CONTENT_LOADERS, useValue: { positions } as Partial<ContentLoaders> },
    ],
  });
  return TestBed.inject(PositionList);
};

describe('PositionList', () => {
  it('should be loading until the content arrives and then expose it', async () => {
    const list = setup(async () => [POSITION]);

    expect(list.status()).toBe('loading');
    await vi.waitFor(() => expect(list.status()).toBe('ready'));
    expect(list.positions()).toEqual([POSITION]);
  });

  it('should report an error and load again when retried', async () => {
    const positions = vi
      .fn<ContentLoaders['positions']>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([POSITION]);
    const list = setup(positions);
    await vi.waitFor(() => expect(list.status()).toBe('error'));

    list.retry();

    expect(list.status()).toBe('loading');
    await vi.waitFor(() => expect(list.status()).toBe('ready'));
    expect(list.positions()).toEqual([POSITION]);
  });

  it('should ask again on every retry and show the error again when it still fails', async () => {
    const positions = vi.fn<ContentLoaders['positions']>(() =>
      Promise.reject(new Error('offline')),
    );
    const list = setup(positions);
    await vi.waitFor(() => expect(list.status()).toBe('error'));

    list.retry();

    expect(list.status()).toBe('loading');
    await vi.waitFor(() => expect(list.status()).toBe('error'));
    expect(positions).toHaveBeenCalledTimes(2);

    list.retry();

    await vi.waitFor(() => expect(positions).toHaveBeenCalledTimes(3));
    await vi.waitFor(() => expect(list.status()).toBe('error'));
  });
});

describe('position labels', () => {
  const t = en.positions;

  it('should translate a known theme tag', () => {
    expect(tagLabel('smothered-mate', t)).toBe('Smothered mate');
  });

  it('should make an unknown theme tag readable instead of hiding it', () => {
    expect(tagLabel('windmill-attack', t)).toBe('windmill attack');
  });

  it('should not read inherited properties when the tag names one', () => {
    expect(tagLabel('constructor', t)).toBe('constructor');
    expect(tagLabel('__proto__', t)).toBe('__proto__');
  });

  it('should label every theme tag with the name of its glossary term, in both languages', async () => {
    const glossary = await bundledGlossaryLoader();
    const tags = Object.keys(en.positions.tags);
    expect(tags).toHaveLength(17);
    expect(Object.keys(es.positions.tags).sort()).toEqual([...tags].sort());
    for (const tag of tags) {
      const term = glossary.find((candidate) => candidate.id === tag);
      expect(term, `glossary term for the tag ${tag}`).toBeDefined();
      expect(es.positions.tags[tag], `es label of ${tag}`).toBe(term?.name.es);
      expect(en.positions.tags[tag], `en label of ${tag}`).toBe(term?.name.en);
    }
  });

  it('should name the side to play', () => {
    expect(sideToPlayLabel('white', t)).toBe('White to play');
    expect(sideToPlayLabel('black', t)).toBe('Black to play');
  });
});
