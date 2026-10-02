import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PlayOutStep } from '../../../../core/content';
import { plainText } from '../../../../core/content/testing';
import { ENGINE_TRANSPORT } from '../../../../core/engine';
import { fakeEngineFactory } from '../../../../core/engine/testing';
import { I18nService } from '../../../../core/i18n';
import { TABLEBASE_HTTP } from '../../../../core/tablebase';
import { FakeTablebaseHttp } from '../../../../core/tablebase/testing';
import { BoardComponent, type BoardMove } from '../../../../shared/board';
import { PlayOutStepView } from './play-out-step';

/** Queen and king against king: Qf8 mates, Qf7 stalemates. */
const START = '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1';

const step: PlayOutStep = {
  kind: 'play-out',
  text: plainText('Da mate', 'Give mate'),
  fen: START,
  goal: 'win',
  playerSide: 'white',
  hint: plainText('Usa la dama', 'Use the queen'),
};

describe('PlayOutStepView', () => {
  let fixture: ComponentFixture<PlayOutStepView>;
  let element: HTMLElement;
  let done: { firstTry: boolean }[];

  const board = () =>
    fixture.debugElement.query((debug) => debug.componentInstance instanceof BoardComponent)
      .componentInstance as BoardComponent;

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const play = async (from: string, to: string) => {
    board().move.emit({ from, to } as BoardMove);
    await settle();
  };

  const restart = async () => {
    element.querySelector<HTMLButtonElement>('button.restart')!.click();
    await settle();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ENGINE_TRANSPORT, useValue: fakeEngineFactory().factory },
        { provide: TABLEBASE_HTTP, useValue: new FakeTablebaseHttp().http },
      ],
    });
    TestBed.inject(I18nService).setLang('en');
    fixture = TestBed.createComponent(PlayOutStepView);
    element = fixture.nativeElement as HTMLElement;
    done = [];
    fixture.componentInstance.done.subscribe((value) => done.push(value));
    fixture.componentRef.setInput('step', step);
    await settle();
  });

  afterEach(() => localStorage.clear());

  it('should show the text, the goal and the position to play', () => {
    expect(element.textContent).toContain('Give mate');
    expect(element.textContent).toContain('Win against the computer.');
    expect(board().fen()).toBe(START);
    expect(board().orientation()).toBe('white');
  });

  it('should be done at the first try once the goal is achieved, and only once', async () => {
    await play('f1', 'f8');
    expect(done).toEqual([{ firstTry: true }]);
    await settle();
    expect(done).toHaveLength(1);
  });

  it('should say the result slipped away and count a miss for each failed game', async () => {
    await play('f1', 'f7');
    expect(element.textContent).toContain('The result slipped away. Start again.');
    expect(done).toEqual([]);
    expect(element.querySelector('button.hint')).toBeNull();

    await restart();
    expect(board().fen()).toBe(START);
    expect(element.textContent).not.toContain('The result slipped away.');
    await play('f1', 'f7');
    await restart();

    // Two failed games: the hint shows up.
    element.querySelector<HTMLButtonElement>('button.hint')!.click();
    await settle();
    expect(element.textContent).toContain('Use the queen');

    await play('f1', 'f8');
    expect(done).toEqual([{ firstTry: false }]);
  });

  it('should start over, mistakes and hint included, when given a new step', async () => {
    await play('f1', 'f7');
    await restart();
    await play('f1', 'f7');
    await restart();
    element.querySelector<HTMLButtonElement>('button.hint')!.click();
    await play('f1', 'f8');
    expect(done).toEqual([{ firstTry: false }]);

    fixture.componentRef.setInput('step', { ...step, text: plainText('Otra vez', 'Again') });
    await settle();
    expect(board().fen()).toBe(START);
    expect(element.textContent).not.toContain('Use the queen');
    expect(element.querySelector('button.hint')).toBeNull();
    await play('f1', 'f8');
    expect(done).toEqual([{ firstTry: false }, { firstTry: true }]);
  });
});
