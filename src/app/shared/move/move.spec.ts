import { Component, input } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../core/i18n';
import { ReadingModeService } from '../../core/reading-mode';
import { MoveText } from './move';

@Component({
  imports: [MoveText],
  template: `<button type="button">
    <app-move [san]="san()" [color]="color()" [format]="format()" />
  </button>`,
})
class Host {
  readonly san = input('Nxf7+');
  readonly color = input<'white' | 'black'>('white');
  readonly format = input<'compact' | 'full'>('compact');
}

describe('MoveText', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;
  let mode: ReadingModeService;

  const render = async (inputs: Record<string, unknown> = {}): Promise<void> => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  };
  const visible = (): string =>
    element.querySelector('[aria-hidden="true"]')?.textContent?.trim() ?? '';
  const spoken = (): string => element.querySelector('.visually-hidden')?.textContent?.trim() ?? '';

  beforeEach(() => {
    TestBed.inject(I18nService).setLang('es');
    mode = TestBed.inject(ReadingModeService);
    mode.setMode('words');
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => localStorage.clear());

  it('should draw the piece image in compact words mode', async () => {
    await render();

    const icon = element.querySelector('.pc');
    expect(icon?.classList).toContain('pc-wN');
    expect(visible()).toBe('×f7+');
  });

  it('should give the button the sentence as its accessible name', async () => {
    await render();

    expect(spoken()).toBe('Caballo captura en f7, jaque');
    expect(element.querySelector('app-move')?.getAttribute('title')).toBe(
      'Caballo captura en f7, jaque',
    );
  });

  it('should write the sentence in full words mode, without a title', async () => {
    await render({ format: 'full' });

    expect(visible()).toBe('Caballo captura en f7, jaque');
    expect(element.querySelector('.pc')).toBeNull();
    expect(element.querySelector('app-move')?.hasAttribute('title')).toBe(false);
  });

  it('should write the localized SAN in notation mode and still speak the sentence', async () => {
    mode.setMode('notation');
    await render();

    expect(visible()).toBe('Cxf7+');
    expect(spoken()).toBe('Caballo captura en f7, jaque');
  });

  it('should follow a mode change', async () => {
    await render();
    mode.setMode('notation');
    await fixture.whenStable();

    expect(visible()).toBe('Cxf7+');
  });
});
