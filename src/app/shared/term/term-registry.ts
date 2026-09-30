import { Injectable } from '@angular/core';

/** Keeps a single glossary popup open at a time: a term that opens closes the one that was open. */
@Injectable({ providedIn: 'root' })
export class TermRegistry {
  private current: { readonly close: () => void } | undefined;

  /** Makes `term` the open one, closing the previous one if it is another. */
  claim(term: { readonly close: () => void }): void {
    if (this.current && this.current !== term) this.current.close();
    this.current = term;
  }

  /** Forgets `term` if it is the open one. */
  release(term: { readonly close: () => void }): void {
    if (this.current === term) this.current = undefined;
  }
}
