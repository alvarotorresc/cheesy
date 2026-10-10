import { en } from './en';
import { es } from './es';

describe('privacy claims in the dictionaries', () => {
  it('should not promise «no accounts» or «nothing leaves your device» now that a code can sync', () => {
    const all = JSON.stringify([es, en]);

    expect(all).not.toMatch(/sin cuentas(?! con email)/i);
    expect(all).not.toMatch(/no accounts/i);
    expect(all).not.toMatch(/sin datos personales|no personal data/i);
    expect(all).not.toContain('no se guarda nada fuera');
    expect(all).not.toContain('nothing is saved outside');
    expect(all).not.toContain('no se envía nada');
    expect(all).not.toContain('nothing is sent');
    expect(all).not.toContain('Nada de esto sale de tu dispositivo');
    expect(all).not.toContain('None of this leaves your device');
    expect(all).not.toContain('solo en este navegador');
    expect(all).not.toContain('only in this browser');
  });

  it('should say that deleting also reaches the server when a code is used', () => {
    const es$ = [
      es.learn.confirmBody,
      es.positions.confirmBody,
      es.endgames.confirmBody,
      es.practice.clearBody,
      es.openings.clearText,
    ];
    const en$ = [
      en.learn.confirmBody,
      en.positions.confirmBody,
      en.endgames.confirmBody,
      en.practice.clearBody,
      en.openings.clearText,
    ];

    for (const text of es$) {
      expect(text).toContain('Si sincronizas con un código, se borra también en el servidor');
    }
    for (const text of en$) {
      expect(text).toContain('If you sync with a code, it is also deleted on the server');
    }
  });

  it('should keep the claims aligned with what the code does', () => {
    expect(es.about.privacyClaim).toBe(
      'Sin cookies, sin cuentas con email y con el mínimo de datos.',
    );
    expect(en.about.privacyClaim).toBe(
      'No cookies, no email accounts and as little data as possible.',
    );
    expect(es.about.syncIntro).toContain('Sin código, tu progreso no sale de tu dispositivo.');
    expect(en.about.syncIntro).toContain('Without a code, your progress never leaves your device.');
    expect(es.about.umamiFacts[0].value).toBe(
      'Visitas, páginas vistas y si se crea o usa un código',
    );
    expect(en.about.umamiFacts[2].value).toBe('Data that identifies you');
    expect(es.about.umamiFacts[2].value).toBe('Datos que te identifiquen');
  });
});
