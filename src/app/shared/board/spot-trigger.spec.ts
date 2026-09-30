import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SpotTrigger } from './spot-trigger';
import { BoardSpotlight } from './spotlight';

@Component({
  imports: [SpotTrigger],
  providers: [BoardSpotlight],
  template: `<span [appSpot]="{ kind: 'squares', squares: ['e4'] }">e4</span>
    <p>fuera</p>`,
})
class Host {}

@Component({
  imports: [SpotTrigger],
  template: `<span [appSpot]="{ kind: 'squares', squares: ['e4'] }">e4</span>`,
})
class Bare {}

describe('SpotTrigger', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const spotlight = fixture.debugElement.injector.get(BoardSpotlight);
    return { span: element.querySelector('span')!, p: element.querySelector('p')!, spotlight };
  };
  const pointer = (type: string, pointerType: string) =>
    new PointerEvent(type, { bubbles: true, pointerType });

  it('should point while the mouse is over and clear when it leaves', async () => {
    const { span, spotlight } = await setup();
    span.dispatchEvent(pointer('pointerenter', 'mouse'));
    expect(spotlight.request()).toEqual({ kind: 'squares', squares: ['e4'] });
    span.dispatchEvent(pointer('pointerleave', 'mouse'));
    expect(spotlight.request()).toBeUndefined();
  });

  it('should keep a tap after the finger lifts and clear it on a press elsewhere', async () => {
    const { span, p, spotlight } = await setup();
    span.dispatchEvent(pointer('pointerdown', 'touch'));
    span.dispatchEvent(pointer('pointerup', 'touch'));
    span.dispatchEvent(pointer('pointerleave', 'touch'));
    expect(spotlight.request()).toBeDefined();
    p.dispatchEvent(pointer('pointerdown', 'touch'));
    expect(spotlight.request()).toBeUndefined();
  });

  it('should point with the keyboard focus', async () => {
    const { span, spotlight } = await setup();
    expect(span.getAttribute('tabindex')).toBe('0');
    span.dispatchEvent(new FocusEvent('focus'));
    expect(spotlight.request()).toBeDefined();
    span.dispatchEvent(new FocusEvent('blur'));
    expect(spotlight.request()).toBeUndefined();
  });

  it('should do nothing on a page without a board', async () => {
    const fixture = TestBed.createComponent(Bare);
    await fixture.whenStable();
    const span = (fixture.nativeElement as HTMLElement).querySelector('span')!;
    expect(span.hasAttribute('tabindex')).toBe(false);
    expect(span.hasAttribute('data-spot')).toBe(false);
  });
});
