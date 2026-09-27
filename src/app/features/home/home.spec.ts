import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  it('should link to the four sections when rendered', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const links = Array.from(element.querySelectorAll('a'), (link) => link.getAttribute('href'));

    expect(links).toEqual(['/openings', '/endgames', '/positions', '/analysis']);
  });
});
