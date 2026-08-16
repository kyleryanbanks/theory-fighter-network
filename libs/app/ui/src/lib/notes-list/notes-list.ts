import { Component, input, output, signal } from '@angular/core';
import { RouterLink, type UrlTree } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { NoteEntry } from '@theory-fighter-network/data';
import { DeleteButton } from '../delete-button/delete-button';

@Component({
  selector: 'tfn-notes-list',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, RouterLink, DeleteButton],
  templateUrl: './notes-list.html',
  styleUrl: './notes-list.css',
})
export class NotesList {
  readonly notes = input<NoteEntry[]>([]);
  readonly notAddressable = input(false);
  readonly addressLabel = input('Address note');
  readonly addressUrl = input<((note: NoteEntry) => UrlTree) | null>(null);
  readonly add = output<string>();
  readonly remove = output<string>();
  readonly address = output<NoteEntry>();

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

  addressNote(note: NoteEntry): void {
    this.address.emit(note);
  }
}
