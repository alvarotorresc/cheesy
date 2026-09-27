import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MoveList } from './move-list';

const texts = (element: HTMLElement, selector: string): string[] =>
  Array.from(element.querySelectorAll(selector), (node) => node.textContent?.trim() ?? '');

describe('MoveList', () => {
  let fixture: ComponentFixture<MoveList>;
  let element: HTMLElement;

  const render = async (inputs: Record<string, unknown>): Promise<void> => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(MoveList);
    element = fixture.nativeElement as HTMLElement;
  });

  it('should show the empty label when there are no moves', async () => {
    await render({ moves: [], emptyLabel: 'Todavía no hay jugadas.' });

    expect(element.textContent).toContain('Todavía no hay jugadas.');
    expect(element.querySelectorAll('button')).toHaveLength(0);
  });

  it('should group moves by move number when white starts', async () => {
    await render({ moves: ['e4', 'e5', 'Nf3'] });

    expect(texts(element, '.number')).toEqual(['1.', '2.']);
    expect(texts(element, 'button.move')).toEqual(['e4', 'e5', 'Nf3']);
  });

  it('should start with a placeholder when black moves first', async () => {
    await render({ moves: ['Nf6', 'c4'], startPly: 19 });

    expect(texts(element, '.number')).toEqual(['10.', '11.']);
    expect(element.querySelector('.row .placeholder')).not.toBeNull();
  });

  it('should highlight the move of the current ply when given', async () => {
    await render({ moves: ['e4', 'e5', 'Nf3'], currentPly: 2 });

    const current = element.querySelector('button.current');
    expect(current?.textContent?.trim()).toBe('e5');
    expect(current?.getAttribute('aria-current')).toBe('step');
    expect(element.querySelectorAll('button.current')).toHaveLength(1);
  });

  it('should emit the ply of the move when a move is clicked', async () => {
    await render({ moves: ['e4', 'e5', 'Nf3'] });
    const selected: number[] = [];
    fixture.componentInstance.selectPly.subscribe((ply) => selected.push(ply));

    element.querySelectorAll<HTMLButtonElement>('button.move')[2].click();

    expect(selected).toEqual([3]);
  });
});
