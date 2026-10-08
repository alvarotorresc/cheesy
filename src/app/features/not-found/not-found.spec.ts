import { TestBed } from '@angular/core/testing';
import { NotFound } from './not-found';

describe('NotFound', () => {
  it('says it in English and in Spanish, with a way to each home page', () => {
    const fixture = TestBed.createComponent(NotFound);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('h1').length).toBe(1);
    expect(element.querySelector('h1')?.textContent).toBe('Page not found');
    expect(element.querySelector('[lang="es"] h2')?.textContent).toBe('Página no encontrada');
    expect([...element.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      '/en',
      '/es',
    ]);
  });
});
