import { Component, inject } from '@angular/core';
import { TodoStore } from '@tfn/app-shell/data';

@Component({
  selector: 'tfn-todo-quick-add',
  standalone: true,
  template: `
    <form (submit)="add($event, todoInput.value)">
      <label for="todo-quick-add-input">New todo</label>
      <div class="input-row">
        <input #todoInput id="todo-quick-add-input" type="text" placeholder="Capture a next step" autocomplete="off" />
        <button type="submit" aria-label="Add todo">Add</button>
      </div>
    </form>
  `,
  styles: `
    :host { display: block; }
    form { display: grid; gap: .5rem; }
    label { color: #9db3a4; font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; }
    .input-row { display: flex; gap: .5rem; }
    input { min-width: 0; flex: 1; border: 1px solid #3f6654; border-radius: 4px; background: #152d23; color: #f5faf6; padding: .7rem .8rem; }
    button { border: 0; border-radius: 4px; background: #e7b84b; color: #18231d; padding: .7rem 1rem; font-weight: 700; cursor: pointer; }
  `,
})
export class TodoQuickAdd {
  private readonly todos = inject(TodoStore);

  add(event: Event, text: string): void {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    this.todos.create(value);
    (event.target as HTMLFormElement).reset();
  }
}
