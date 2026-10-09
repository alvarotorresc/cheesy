import { Component, input, model } from '@angular/core';

let nextId = 0;

/**
 * The field where a code is typed: one line in the monospace of the code, with no autocorrect or
 * capitals, its hint and its error tied to it for screen readers.
 */
@Component({
  selector: 'app-code-field',
  template: `
    <label class="label" [for]="id">{{ label() }}</label>
    <input
      class="input field"
      type="text"
      name="code"
      [id]="id"
      [value]="value()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [attr.aria-invalid]="error() ? 'true' : null"
      [attr.aria-describedby]="error() ? errorId + ' ' + hintId : hintId"
      autocomplete="off"
      autocapitalize="none"
      autocorrect="off"
      spellcheck="false"
      enterkeyhint="go"
      maxlength="200"
      (input)="value.set($any($event.target).value)"
    />
    <p class="hint" [id]="hintId">{{ hint() }}</p>
    <p class="error" [id]="errorId" role="alert">{{ error() }}</p>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-2);
    }
    .label {
      font-weight: 700;
    }
    .field {
      width: 100%;
      font-family: var(--font-code);
      letter-spacing: 0.01em;
    }
    .field[aria-invalid='true'] {
      border-color: var(--color-danger);
      box-shadow: inset 3px 0 0 var(--color-danger);
    }
    .hint {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    .error {
      color: var(--color-danger);
      font-size: var(--text-sm);
      font-weight: 700;
    }
    .error:empty {
      display: none;
    }
  `,
})
export class CodeField {
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly placeholder = input('');
  readonly error = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly value = model('');

  protected readonly id = `code-field-${nextId++}`;
  protected readonly hintId = `${this.id}-hint`;
  protected readonly errorId = `${this.id}-error`;
}
