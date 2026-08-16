import { Component, inject, input, output, signal } from '@angular/core';
import {
  LocalGuideFacadeStore,
  type EntityType,
  type NoteEntry,
} from '@theory-fighter-network/data';
import { NotesList } from '@theory-fighter-network/ui';

@Component({
  selector: 'tfn-entity-notes',
  imports: [NotesList],
  templateUrl: './entity-notes.html',
  styleUrl: './entity-notes.css',
})
export class EntityNotes {
  private readonly facade = inject(LocalGuideFacadeStore);

  readonly entityType = input.required<EntityType>();
  readonly entityKey = input.required<string>();
  readonly notes = input<NoteEntry[]>([]);
  readonly promote = output<NoteEntry>();
  readonly error = signal('');

  async addNote(text: string): Promise<void> {
    const result = await this.facade.addEntityNote({
      entityType: this.entityType(),
      entityKey: this.entityKey(),
      text,
    });
    this.setError(result);
  }

  async removeNote(noteId: string): Promise<void> {
    const result = await this.facade.removeEntityNote({
      entityType: this.entityType(),
      entityKey: this.entityKey(),
      noteId,
    });
    this.setError(result);
  }

  promoteNote(note: NoteEntry): void {
    this.promote.emit(note);
  }

  private setError(result: { status: string; error?: unknown }): void {
    this.error.set(
      result.status === 'error'
        ? result.error instanceof Error
          ? result.error.message
          : 'The note could not be updated.'
        : ''
    );
  }
}
