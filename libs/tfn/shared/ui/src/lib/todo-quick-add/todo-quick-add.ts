import { Component, inject, Input } from '@angular/core';
import {
  TodoStore,
  type EntityType,
  type TodoEstimateKey,
  type TodoTracking,
} from '@tfn/app-shell/data';

interface TrackingEntityOption {
  entityType: EntityType;
  entityKey: string;
  label: string;
}

@Component({
  selector: 'tfn-todo-quick-add',
  standalone: true,
  template: `
    <form (submit)="add($event, todoInput.value)">
      <label for="todo-quick-add-input">New todo</label>
      <div class="input-row">
        <input
          #todoInput
          id="todo-quick-add-input"
          type="text"
          placeholder="Capture a next step"
          autocomplete="off"
        />
        <button type="submit" aria-label="Add todo">Add</button>
      </div>
      <details class="tracking-options">
        <summary>Link this TODO to progress</summary>
        <label for="todo-tracking-type">Track</label>
        <select
          id="todo-tracking-type"
          data-testid="todo-tracking-type"
          [value]="trackingType"
          (change)="trackingType = $any($event.target).value"
        >
          <option value="">No tracking</option>
          <option value="estimated-count">Estimated count</option>
          <option value="entity">Entity completion</option>
        </select>
        @if (trackingType === 'estimated-count') {
          <label for="todo-estimate-key">Estimated count</label>
          <select
            id="todo-estimate-key"
            data-testid="todo-estimate-key"
            [value]="estimateKey"
            (change)="estimateKey = $any($event.target).value"
          >
            <option value="">Select an estimate</option>
            @for (option of estimateOptions; track option.key) {
              <option [value]="option.key">{{ option.label }}</option>
            }
          </select>
          @if (estimateKey === 'character-move-count') {
            <label for="todo-estimate-scope">Character</label>
            <select
              id="todo-estimate-scope"
              data-testid="todo-estimate-scope"
              [value]="estimateScopeKey"
              (change)="estimateScopeKey = $any($event.target).value"
            >
              <option value="">Select a character</option>
              @for (character of characters; track character.semanticKey) {
                <option [value]="character.semanticKey">
                  {{ character.name }}
                </option>
              }
            </select>
          }
        }
        @if (trackingType === 'entity') {
          @if (entities.length) {
            <label for="todo-entity-key">Entity</label>
            <select
              id="todo-entity-key"
              data-testid="todo-entity-key"
              [value]="entityKey"
              (change)="entityKey = $any($event.target).value"
            >
              <option value="">Select an entity</option>
              @for (
                entity of entities;
                track entity.entityType + entity.entityKey
              ) {
                <option [value]="entity.entityType + ':' + entity.entityKey">
                  {{ entity.label }}
                </option>
              }
            </select>
          } @else {
            <p class="tracking-empty" data-testid="todo-entity-empty">
              No entities are available to track yet.
            </p>
          }
        }
      </details>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }
    form {
      display: grid;
      gap: 0.5rem;
    }
    .tracking-options {
      display: grid;
      gap: 0.4rem;
      color: #9db3a4;
      font-size: 0.78rem;
    }
    .tracking-options summary {
      color: #e7b84b;
      cursor: pointer;
    }
    .tracking-options select {
      min-height: 2.2rem;
      border: 1px solid #3f6654;
      border-radius: 4px;
      background: #152d23;
      color: #f5faf6;
      padding: 0.4rem 0.6rem;
    }
    .tracking-empty {
      margin: 0;
      color: #91a89a;
      font-size: 0.78rem;
    }
    label {
      color: #9db3a4;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .input-row {
      display: flex;
      gap: 0.5rem;
    }
    input {
      min-width: 0;
      flex: 1;
      border: 1px solid #3f6654;
      border-radius: 4px;
      background: #152d23;
      color: #f5faf6;
      padding: 0.7rem 0.8rem;
    }
    button {
      border: 0;
      border-radius: 4px;
      background: #e7b84b;
      color: #18231d;
      padding: 0.7rem 1rem;
      font-weight: 700;
      cursor: pointer;
    }
  `,
})
export class TodoQuickAdd {
  private readonly todos = inject(TodoStore);
  @Input() entities: TrackingEntityOption[] = [];
  @Input() characters: Array<{ semanticKey: string; name: string }> = [];

  trackingType: '' | 'estimated-count' | 'entity' = '';
  estimateKey: TodoEstimateKey | '' = '';
  estimateScopeKey = '';
  entityKey = '';

  readonly estimateOptions: Array<{ key: TodoEstimateKey; label: string }> = [
    { key: 'character-count', label: 'Characters' },
    { key: 'stage-count', label: 'Stages' },
    { key: 'universal-move-count', label: 'Universal Moves' },
    { key: 'character-move-count', label: 'Character Moves' },
  ];

  add(event: Event, text: string): void {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    const tracking = this.trackingLink();
    if (tracking) {
      this.todos.createTracked({ text: value, tracking });
    } else {
      this.todos.create(value);
    }
    this.trackingType = '';
    this.estimateKey = '';
    this.estimateScopeKey = '';
    this.entityKey = '';
    (event.target as HTMLFormElement).reset();
  }

  private trackingLink(): TodoTracking | undefined {
    if (this.trackingType === 'estimated-count' && this.estimateKey) {
      return {
        type: 'estimated-count',
        key: this.estimateKey,
        ...(this.estimateScopeKey ? { scopeKey: this.estimateScopeKey } : {}),
      };
    }
    if (this.trackingType === 'entity' && this.entityKey) {
      const separator = this.entityKey.indexOf(':');
      if (separator > 0) {
        return {
          type: 'entity',
          entityType: this.entityKey.slice(0, separator) as EntityType,
          entityKey: this.entityKey.slice(separator + 1),
        };
      }
    }
    return undefined;
  }
}
