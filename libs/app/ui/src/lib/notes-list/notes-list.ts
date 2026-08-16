import { Component, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { NoteEntry } from '@theory-fighter-network/data';

@Component({
  selector: 'tfn-notes-list',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './notes-list.html',
  styleUrl: './notes-list.css',
})
export class NotesList {
  readonly notes = input<NoteEntry[]>([]);
  readonly canPromote = input(false);
  readonly add = output<string>();
  readonly remove = output<string>();
  readonly promote = output<NoteEntry>();

  readonly draftText = signal('');

  addNote(): void {
    const text = this.draftText().trim();
    if (!text) {
      return;
    }

    this.add.emit(text);
    this.draftText.set('');
  }

  removeNote(noteId: string): void {
    this.remove.emit(noteId);
  }

  promoteNote(note: NoteEntry): void {
    this.promote.emit(note);
  }
}
