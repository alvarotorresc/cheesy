import { en } from './en';
import { es } from './es';

describe('privacy claims in the dictionaries', () => {
  it('should not promise «no accounts» or «nothing leaves your device» now that a code can sync', () => {
    const all = JSON.stringify([es, en]);

    expect(all).not.toMatch(/sin cuentas/i);
    expect(all).not.toMatch(/no accounts/i);
    expect(all).not.toContain('Nada de esto sale de tu dispositivo');
    expect(all).not.toContain('None of this leaves your device');
    expect(all).not.toContain('solo en este navegador');
    expect(all).not.toContain('only in this browser');
  });
});
