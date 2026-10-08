import { TestBed } from '@angular/core/testing';
import { categoryTexts } from '../../core/content/category-texts';
import { I18nService } from '../../core/i18n';
import { CategoryAbout } from './category-about';

describe('CategoryAbout', () => {
  it('shows the two paragraphs of the category in the language on screen', () => {
    TestBed.inject(I18nService).setLang('es');
    const fixture = TestBed.createComponent(CategoryAbout);
    fixture.componentRef.setInput('category', 'endgames');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h2')?.textContent).toBe('Sobre los finales');
    expect([...element.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
      ...categoryTexts.endgames.es,
    ]);
    expect(element.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
      element.querySelector('h2')?.id,
    );
  });
});
