import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LocalGuideFacadeStore, buildCharacterMoveList } from '@theory-fighter-network/data';
import { DeleteButton, EntityMetadataView, ExpansionPanel, TfnLink } from '@theory-fighter-network/ui';
import type { Tile } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';
import { CancelGroupsEditorComponent } from '../cancel-groups-editor/cancel-groups-editor';

interface CharacterDraft {
  name: string;
}

@Component({
  selector: 'tfn-character-editor',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule, RouterLink, EntityNotes, EntityMetadataView, ExpansionPanel, DeleteButton, TfnLink, CancelGroupsEditorComponent],
  templateUrl: './character-editor.html',
  styleUrl: './character-editor.css',
})
export class CharacterEditor {
  readonly facade = inject(LocalGuideFacadeStore);
  private readonly router = inject(Router);
  readonly characters = computed(
    () => this.facade.guide()?.entities.characters ?? []
  );
  readonly moves = computed(() => this.facade.guide()?.entities.moves ?? []);
  readonly sequences = computed(
    () => this.facade.guide()?.entities.sequences ?? []
  );
  readonly characterModel = signal<CharacterDraft>({ name: '' });
  readonly characterError = signal('');
  readonly characterForm = form(this.characterModel, (path) => {
    required(path.name, { message: 'Character name is required.' });
  });

  characterCancelGroups(characterKey: string): Record<string, string[]> {
    const character = this.characters().find(c => c.semanticKey === characterKey);
    return character?.cancelGroups ?? {};
  }

  characterMoveList(characterKey: string): Tile[] {
    const guide = this.facade.guide();
    if (!guide) return [];
    const character = guide.entities.characters.find((c) => c.semanticKey === characterKey);
    const universalMoveKeys = guide.entities.game.universal.moveKeys;
    const characterMoveKeys = character?.hierarchy?.moveKeys ?? [];
    return buildCharacterMoveList(universalMoveKeys, characterMoveKeys, guide.entities.moves)
      .map((entry) => ({
        key: entry.semanticKey,
        label: entry.name,
        tags: entry.isUniversal ? [{ label: 'Universal', color: 'info' as const }] : undefined,
      }));
  }

  async saveCharacterCancelGroup(characterKey: string, rule: { name?: string; moveList: string[] }): Promise<void> {
    await this.facade.createCancelGroup({
      scopeKey: characterKey,
      isGameLevel: false,
      groupName: rule.name ?? '',
      moveKeys: rule.moveList,
    });
  }

  async renameCharacterCancelGroup(characterKey: string, event: { oldName: string; newName: string }): Promise<void> {
    await this.facade.renameCancelGroup({
      scopeKey: characterKey,
      isGameLevel: false,
      oldName: event.oldName,
      newName: event.newName,
    });
  }

  async deleteCharacterCancelGroup(characterKey: string, event: { groupName: string }): Promise<void> {
    await this.facade.deleteCancelGroup({
      scopeKey: characterKey,
      isGameLevel: false,
      groupName: event.groupName,
    });
  }

  characterMoves(characterKey: string) {
    const character = this.characters().find(
      (candidate) => candidate.semanticKey === characterKey
    );
    const keys = character?.hierarchy?.moveKeys ?? [];
    return keys
      .map((key) => this.moves().find((move) => move.semanticKey === key))
      .filter((move): move is NonNullable<typeof move> => Boolean(move));
  }

  characterSequences(characterKey: string) {
    const character = this.characters().find(
      (candidate) => candidate.semanticKey === characterKey
    );
    const keys = character?.hierarchy?.sequenceKeys ?? [];
    return keys
      .map((key) =>
        this.sequences().find((sequence) => sequence.semanticKey === key)
      )
      .filter((sequence): sequence is NonNullable<typeof sequence> => Boolean(sequence));
  }

  sequenceLabel(sequence: { sequence: Array<{ moveKey?: string }> }): string {
    return sequence.sequence
      .map((step) =>
        this.moves().find((move) => move.semanticKey === step.moveKey)?.name ??
        step.moveKey
      )
      .join(' → ');
  }

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

  addressNote(characterKey: string, note: { text: string }): void {
    void this.router.navigate(['/moves'], {
      queryParams: { characterKey, addressNote: note.text },
    });
  }
}


function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The Character could not be updated.';
}
