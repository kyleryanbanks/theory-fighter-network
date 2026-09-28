import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TodoStore, type EntityRef } from '@tfn/app-shell/data';
import { TodoQuickAdd } from '@tfn/shared/ui';

@Component({
  selector: 'tfn-todo-page',
  imports: [DatePipe, RouterLink, TodoQuickAdd],
  templateUrl: './todo-page.html',
  styleUrl: './todo-page.css',
})
export class TodoPage {
  readonly todos = inject(TodoStore);

  routeFor(ref: EntityRef): string {
    const paths: Record<EntityRef['entityType'], string> = {
      game: 'game',
      stage: 'stages',
      stageZone: 'zones',
      character: 'characters',
      team: 'teams',
      move: 'moves',
      sequence: 'sequences',
      projectile: 'projectiles',
      matchup: 'matchups',
    };
    return `/${paths[ref.entityType]}/${ref.entityKey}`;
  }

  async toggle(todoId: string, done: boolean): Promise<void> {
    if (done) await this.todos.reopen(todoId);
    else await this.todos.complete(todoId);
  }

  async remove(todoId: string): Promise<void> {
    await this.todos.delete(todoId);
  }
}
