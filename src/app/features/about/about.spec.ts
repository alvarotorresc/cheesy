import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CONTENT_LOADERS, type ContentLoaders } from '../../core/content';
import { bundledContentLoaders } from '../../core/content/testing';
import { I18nService } from '../../core/i18n';
import { TABLEBASE_URL } from '../../core/tablebase';
import { ABOUT_UMAMI, About } from './about';
import { CREDIT_GROUPS } from './credits/about-credits';

describe('About', () => {
  afterEach(() => localStorage.clear());

  const open = async (
    options: { lang?: 'es' | 'en'; umami?: boolean; loaders?: ContentLoaders } = {},
  ) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'acerca', component: About }]),
        { provide: CONTENT_LOADERS, useValue: options.loaders ?? bundledContentLoaders },
        { provide: ABOUT_UMAMI, useValue: options.umami ?? false },
      ],
    });
    TestBed.inject(I18nService).setLang(options.lang ?? 'es');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/acerca');
    const element = harness.routeNativeElement as HTMLElement;
    // The content arrives after the first render (a few dynamic imports).
    for (let tries = 0; tries < 50 && !element.querySelector('.fen-figure'); tries++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      harness.detectChanges();
    }
    return element;
  };

  const text = (element: Element | null | undefined) =>
    element?.textContent?.replace(/\s+/g, ' ').trim();

  it('should have its title and the three sections the footer links to', async () => {
    const element = await open();

    expect(element.querySelector('h1')?.textContent).toBe('Acerca de Cheesy');
    expect(Array.from(element.querySelectorAll('section'), (section) => section.id)).toEqual([
      '',
      'privacidad',
      'creditos',
      'codigo',
    ]);
    expect(Array.from(element.querySelectorAll('.toc a'), (a) => a.getAttribute('href'))).toEqual([
      '#privacidad',
      '#creditos',
      '#codigo',
    ]);
  });

  it('should translate the headings', async () => {
    const element = await open({ lang: 'en' });

    expect(element.querySelector('h1')?.textContent).toBe('About Cheesy');
    expect(
      Array.from(element.querySelectorAll('h2'), (heading) => heading.textContent?.trim()),
    ).toEqual(['In short', 'Privacy', 'Credits', 'Source code']);
  });

  it('should lay «In short» out as one square per idea, with a piece on each', async () => {
    const element = await open();

    expect(Array.from(element.querySelectorAll('.file li p'), (p) => p.textContent)).toEqual([
      'Tu progreso se queda en tu navegador.',
      'Solo las posiciones de los finales salen, hacia Lichess.',
      'Sin cuentas ni cookies.',
      'Código abierto, con licencia GPL-3.',
    ]);
    expect(
      Array.from(element.querySelectorAll('.file .piece'), (piece) =>
        [...piece.classList].find((name) => name.startsWith('pc-')),
      ),
    ).toEqual(['pc-wK', 'pc-bR', 'pc-wP', 'pc-bN']);
  });

  it('should say what is saved and how to clear it, section by section', async () => {
    const element = await open();

    expect(element.querySelectorAll('.stays li')).toHaveLength(6);
    expect(text(element.querySelector('.stays li:nth-child(5)'))).toContain('El modo de lectura');
    expect(text(element.querySelector('.stays li:nth-child(2)'))).toContain(
      'Las lecciones completadas',
    );
    expect(text(element.querySelector('.erase p'))).toBe(
      'Borrar el progreso, en Aprender, Aperturas, Finales y Posiciones, borra el de esa sección.',
    );
  });

  it('should say that every position of the endgame goes to Lichess', async () => {
    const element = await open();

    const sends = text(element.querySelector('.sends .prose'));
    expect(sends).toContain('cada posición del final se envía a Lichess');
    expect(sends).toContain('cada vez que mueve el rival');
  });

  it('should show the real request for the Philidor position, split by ranks', async () => {
    const element = await open();

    const ranks = Array.from(element.querySelectorAll('.fen-seg'), (seg) =>
      seg.textContent?.trim(),
    );
    expect(ranks).toEqual(['4k3', '7R', 'r7', '3KP3', '8', '8', '8', '8']);
    expect(text(element.querySelector('.fen-rest'))).toBe('b - - 0 1');
    expect(text(element.querySelector('.request code'))).toBe(
      `GET ${TABLEBASE_URL}?fen=4k3%2F7R%2Fr7%2F3KP3%2F8%2F8%2F8%2F8%20b%20-%20-%200%201`,
    );
    expect(text(element.querySelector('.fen-label'))).toBe(
      'Posición de Philidor, al empezar. Juegan negras.',
    );
    expect(element.querySelectorAll('app-mini-board .pc')).toHaveLength(5);
  });

  it('should light the rank of the FEN part that has the pointer or the focus', async () => {
    const element = await open();
    const segments = element.querySelectorAll<HTMLButtonElement>('.fen-seg');
    const lit = () => element.querySelector('.rank-hl') as HTMLElement | null;
    expect(lit()).toBeNull();

    segments[3].dispatchEvent(new Event('focus'));
    TestBed.tick();
    expect(segments[3].classList.contains('on')).toBe(true);
    // Black at the bottom: rank 5 is the fifth row from the bottom, the fourth from the top.
    expect(lit()?.style.transform).toBe('translateY(400%)');

    segments[3].dispatchEvent(new Event('blur'));
    TestBed.tick();
    expect(segments[3].classList.contains('on')).toBe(false);
    expect(lit()).toBeNull();
  });

  it('should still say everything when the content does not load, without the drawing', async () => {
    const element = await open({
      loaders: { ...bundledContentLoaders, endgames: () => Promise.reject(new Error('offline')) },
    });

    expect(element.querySelector('.sends h3')?.textContent).toBe('Sale hacia Lichess');
    expect(element.querySelector('.fen-figure')).toBeNull();
  });

  it('should not mention Umami while the counter is off', async () => {
    const element = await open();

    expect(element.querySelector('.umami')).toBeNull();
  });

  it('should mention Umami, with its address, when the counter is on', async () => {
    const element = await open({ umami: true });

    expect(element.querySelector('.umami h3')?.textContent).toBe('Contamos visitas con Umami');
    expect(element.querySelector('.umami .host')).toBeNull();
    expect(text(element.querySelector('.umami'))).not.toContain('https://');
    expect(element.querySelectorAll('.umami .facts li')).toHaveLength(3);
  });

  it('should credit every project with its licence, the pieces to Colin M.L. Burnett', async () => {
    const element = await open();

    const items = element.querySelectorAll('.credits .item');
    expect(items).toHaveLength(CREDIT_GROUPS.flatMap((group) => group.items).length);
    const pieces = Array.from(items).find((item) => text(item)?.startsWith('Piezas cburnett'));
    expect(text(pieces)).toContain('GPL-2 o posterior');
    expect(text(pieces)).toContain('Colin M.L. Burnett');
    expect(text(element.querySelector('.credits .group:last-child h3'))).toBe('Letra e iconos');
    expect(text(element.querySelector('.credits'))).toContain('Phosphor IconsMIT');
  });

  it('should link to the source code', async () => {
    const element = await open();

    expect(element.querySelector('.source .button')?.getAttribute('href')).toBe(
      'https://github.com/alvarotorresc/cheesy',
    );
  });
});
