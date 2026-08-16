import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LocalGuideFacadeStore, type Step } from '@theory-fighter-network/data';

const UNIVERSAL_SCOPE = '';

@Component({
  selector: 'tfn-sequence-editor',
  imports: [MatButtonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './sequence-editor.html',
  styleUrl: './sequence-editor.css',
})
export class SequenceEditor {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly characters = computed(
    () => this.facade.guide()?.entities.characters ?? []
  );
  readonly scopeKey = signal(UNIVERSAL_SCOPE);
  readonly scopedMoves = computed(() => {
    const allMoves = this.facade.guide()?.entities.moves ?? [];
    const scope = this.scopeKey();
    return scope === UNIVERSAL_SCOPE
      ? allMoves.filter((move) => !move.characterKey)
      : allMoves.filter((move) => move.characterKey === scope);
  });
  readonly sequences = computed(() => {
    const allSequences = this.facade.guide()?.entities.sequences ?? [];
    const scope = this.scopeKey();
    return scope === UNIVERSAL_SCOPE
      ? allSequences.filter((sequence) => !sequence.characterKey)
      : allSequences.filter((sequence) => sequence.characterKey === scope);
  });
  readonly draftMoveKeys = signal<string[]>([]);
  readonly nextMoveKey = signal('');
  readonly sequenceError = signal('');

  moveName(moveKey: string | undefined): string {
    const allMoves = this.facade.guide()?.entities.moves ?? [];
    return allMoves.find((move) => move.semanticKey === moveKey)?.name ?? moveKey ?? '';
  }

  setScope(scopeKey: string): void {
    this.scopeKey.set(scopeKey);
    this.draftMoveKeys.set([]);
    this.nextMoveKey.set('');
    this.sequenceError.set('');
  }

  addDraftMove(moveKey: string): void {
    if (!moveKey) {
      return;
    }
    this.draftMoveKeys.update((keys) => [...keys, moveKey]);
    this.nextMoveKey.set('');
  }

  removeDraftMove(index: number): void {
    this.draftMoveKeys.update((keys) => keys.filter((_, i) => i !== index));
  }

  async createSequence(): Promise<void> {
    const moveKeys = this.draftMoveKeys();
    if (moveKeys.length === 0) {
      this.sequenceError.set('Add at least one Move to the Sequence.');
      return;
    }

    const scope = this.scopeKey();
    const sequence: Step[] = moveKeys.map((moveKey) => ({
      directions: [],
      buttons: [],
      moveKey,
    }));

    const result = await this.facade.createSequence({
      sequence,
      ...(scope === UNIVERSAL_SCOPE ? {} : { characterKey: scope }),
    });

    if (result.status === 'error') {
      this.sequenceError.set(getErrorMessage(result.error));
      return;
    }

    this.draftMoveKeys.set([]);
    this.sequenceError.set('');
  }

  async deleteSequence(sequenceKey: string): Promise<void> {
    const result = await this.facade.deleteSequence({ sequenceKey });

    if (result.status === 'error') {
      this.sequenceError.set(getErrorMessage(result.error));
      return;
    }

    this.sequenceError.set('');
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The Sequence could not be updated.';
}
