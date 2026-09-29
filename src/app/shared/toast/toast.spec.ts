import { TestBed } from '@angular/core/testing';
import { Toast } from './toast';
import { TOAST_MS, ToastService } from './toast.service';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = () => {
    const fixture = TestBed.createComponent(Toast);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const box = () => element.querySelector('.toast') as HTMLElement;
    return { fixture, box, service: TestBed.inject(ToastService) };
  };

  it('should be a polite live region that starts hidden and empty', () => {
    const { box } = setup();

    expect(box().getAttribute('role')).toBe('status');
    expect(box().getAttribute('aria-live')).toBe('polite');
    expect(box().classList).not.toContain('show');
    expect(box().textContent?.trim()).toBe('');
  });

  it('should show a message and hide it after 2600 ms', () => {
    const { fixture, box, service } = setup();

    service.show('Board reset.');
    fixture.detectChanges();
    expect(box().classList).toContain('show');
    expect(box().textContent?.trim()).toBe('Board reset.');

    vi.advanceTimersByTime(TOAST_MS - 1);
    fixture.detectChanges();
    expect(box().classList).toContain('show');

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(box().classList).not.toContain('show');
  });

  it('should replace the message on screen and restart the clock', () => {
    const { fixture, box, service } = setup();

    service.show('First');
    vi.advanceTimersByTime(2000);
    service.show('Second');
    vi.advanceTimersByTime(2000);
    fixture.detectChanges();

    expect(box().textContent?.trim()).toBe('Second');
    expect(box().classList).toContain('show');

    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    expect(box().classList).not.toContain('show');
  });
});
