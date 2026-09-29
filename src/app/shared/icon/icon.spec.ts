import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';
import { ICONS, type IconName } from './icons';

describe('Icon', () => {
  const render = async (name: IconName): Promise<HTMLElement> => {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', name);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('should draw the named icon as a decorative inline SVG', async () => {
    const element = await render('trophy');
    const svg = element.querySelector('svg');

    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
    expect(svg?.querySelector('path')).not.toBeNull();
  });

  it('should change the drawing when the name changes', async () => {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', 'mini-play');
    await fixture.whenStable();
    const before = (fixture.nativeElement as HTMLElement).innerHTML;

    fixture.componentRef.setInput('name', 'mini-pause');
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).innerHTML).not.toBe(before);
  });

  it('should register the 19 Phosphor icons and the 12 mini icons', () => {
    const names = Object.keys(ICONS);

    expect(names.filter((name) => name.startsWith('mini-'))).toHaveLength(12);
    expect(names.filter((name) => !name.startsWith('mini-'))).toHaveLength(19);
  });

  it('should mark every icon as decorative and paint it with the text colour', () => {
    for (const [name, svg] of Object.entries(ICONS)) {
      expect(svg, name).toContain('aria-hidden="true"');
      expect(svg, name).toContain('focusable="false"');
      expect(svg, name).toContain('currentColor');
    }
  });
});
