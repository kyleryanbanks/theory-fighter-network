import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { EntityNotes } from '../entity-notes/entity-notes';

interface CharacterDraft {
  name: string;
}

@Component({
  selector: 'tfn-character-editor',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule, EntityNotes],
  templateUrl: './character-editor.html',
  styleUrl: './character-editor.css',
})
export class CharacterEditor {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly characters = computed(
    () => this.facade.guide()?.entities.characters ?? []
  );
  readonly characterModel = signal<CharacterDraft>({ name: '' });
  readonly characterError = signal('');
  readonly characterForm = form(this.characterModel, (path) => {
    required(path.name, { message: 'Character name is required.' });
  });

  createCharacter(): void {
    submit(this.characterForm, async () => {
      const result = await this.facade.createCharacter({
        name: this.characterModel().name.trim(),
      });

      if (result.status === 'error') {
        this.characterError.set(getErrorMessage(result.error));
        return;
      }

      this.characterForm().reset({ name: '' });
      this.characterError.set('');
    });
  }

  async deleteCharacter(characterKey: string): Promise<void> {
    const result = await this.facade.deleteCharacter({ characterKey });

    if (result.status === 'error') {
      this.characterError.set(getErrorMessage(result.error));
      return;
    }

    this.characterError.set('');
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The Character could not be updated.';
}
