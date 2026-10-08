import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLangFromUrl } from '../../core/routing';
import { PageMeta } from '../../core/seo';
import { Breadcrumbs } from './breadcrumbs';

@Component({ imports: [Breadcrumbs], template: '<app-breadcrumbs />' })
class Host {}

describe('Breadcrumbs', () => {
  const render = async (url: string) => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Host }]), provideLangFromUrl()],
    });
    const harness = await RouterTestingHarness.create();
    TestBed.inject(PageMeta);
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    return harness.routeNativeElement as HTMLElement;
  };

  it('links every step but the page itself', async () => {
    const element = await render('/es/aprender/principiante');
    const items = [...element.querySelectorAll('li')];
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      'Inicio',
      'Aprender',
      'Principiante',
    ]);
    expect([...element.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      '/es',
      '/es/aprender',
    ]);
    expect(element.querySelector('[aria-current="page"]')?.textContent).toBe('Principiante');
    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Ruta de navegación');
  });

  it('shows nothing on a page without a breadcrumb', async () => {
    const element = await render('/en');
    expect(element.querySelector('nav')).toBeNull();
  });
});
