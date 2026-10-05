import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContentService, type LessonSummary } from '../../../core/content';
import { I18nService } from '../../../core/i18n';
import { ProgressService } from '../../../core/progress';
import { byLevelAndOrder, LEVELS, nextLesson } from '../learn-progress';

type HomeState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | {
      readonly status: 'ready';
      readonly catalog: readonly LessonSummary[];
      readonly done: ReadonlySet<string>;
      /** Puzzles of "Practise more" saved: they are deleted with the lessons. */
      readonly puzzlesSaved: number;
    };

/**
 * The landing of "Learn": a card per level, the glossary and "Practise more", a way to continue
 * where the learner left off, and the action to delete the saved lessons and puzzles after a
 * confirmation.
 */
@Component({
  selector: 'app-learn-home',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './learn-home.html',
  styleUrl: './learn-home.css',
})
export class LearnHome {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  protected readonly progress = inject(ProgressService);

  protected readonly state = signal<HomeState>({ status: 'loading' });
  /** Result of the last try to delete the progress, announced to screen readers. */
  protected readonly message = signal('');
  /** Lessons with puzzles; the "Practise more" card only shows when there is one. */
  protected readonly puzzleLessons = signal(0);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly levels = computed(() => {
    const current = this.state();
    const catalog = current.status === 'ready' ? current.catalog : [];
    return LEVELS.map((level) => ({
      level,
      lessons: catalog.filter((lesson) => lesson.level === level),
    }));
  });

  protected readonly continueWith = computed(() => {
    const current = this.state();
    return current.status === 'ready' && current.done.size
      ? nextLesson([...current.catalog].sort(byLevelAndOrder), current.done)
      : undefined;
  });

  constructor() {
    void this.load();
    void this.loadPuzzles();
  }

  protected async load(): Promise<void> {
    this.state.set({ status: 'loading' });
    try {
      const [catalog, rows, puzzles] = await Promise.all([
        this.content.lessonCatalog(),
        this.progress.lessons(),
        this.progress.puzzles(),
      ]);
      this.state.set({
        status: 'ready',
        catalog,
        done: new Set(rows.map((row) => row.lessonId)),
        puzzlesSaved: puzzles.length,
      });
    } catch {
      this.state.set({ status: 'error' });
    }
  }

  /** Apart from the lessons: without the puzzle catalogue, Learn works as before. */
  private async loadPuzzles(): Promise<void> {
    try {
      this.puzzleLessons.set((await this.content.puzzleCatalog()).lessons.length);
    } catch {
      this.puzzleLessons.set(0);
    }
  }

  protected askToClear(): void {
    const current = this.state();
    if (current.status !== 'ready' || (current.done.size === 0 && current.puzzlesSaved === 0)) {
      this.message.set(this.i18n.t().learn.nothingSaved);
      return;
    }
    this.message.set('');
    this.dialog()?.nativeElement.showModal();
  }

  protected cancelClear(): void {
    this.dialog()?.nativeElement.close();
  }

  protected async confirmClear(): Promise<void> {
    this.dialog()?.nativeElement.close();
    const t = this.i18n.t().learn;
    // The puzzles practise the lessons: "Delete progress" in Learn deletes both.
    const [lessons, puzzles] = await Promise.all([
      this.progress.clear('lessons'),
      this.progress.clear('puzzles'),
    ]);
    const cleared = lessons && puzzles;
    if (cleared)
      this.state.update((current) =>
        current.status === 'ready'
          ? { ...current, done: new Set<string>(), puzzlesSaved: 0 }
          : current,
      );
    this.message.set(cleared ? t.cleared : t.clearFailed);
  }
}
