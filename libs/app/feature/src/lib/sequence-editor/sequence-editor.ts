import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  LocalGuideFacadeStore,
  resolveEffectiveMove,
  type Step,
} from '@theory-fighter-network/data';

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
  readonly teams = computed(() => this.facade.guide()?.entities.teams ?? []);
  readonly scopeKey = signal(UNIVERSAL_SCOPE);
  private readonly team = computed(() =>
    this.teams().find((team) => team.semanticKey === this.scopeKey())
  );
  readonly scopedMoves = computed(() => {
    const allMoves = this.facade.guide()?.entities.moves ?? [];
    const scope = this.scopeKey();
    const universalMoves = allMoves.filter((move) => !move.characterKey);

    if (scope === UNIVERSAL_SCOPE) {
      return universalMoves;
    }

    const team = this.team();
    const members = team ? team.orderedCharacterKeys : [scope];
    const ownMoves = allMoves.filter(
      (move) => move.characterKey && members.includes(move.characterKey)
    );

    // Only hide a universal Move once every member of the scope (the single
    // Character, or every Team member) has their own override of it; a
    // partial override still needs the universal tile for members who
    // haven't overridden it.
    const visibleUniversalMoves = universalMoves.filter((move) => {
      const overriderCount = ownMoves.filter(
        (m) => m.parentKey === move.semanticKey
      ).length;
      return overriderCount < members.length;
    });

    return [
      ...visibleUniversalMoves.map((move) => resolveEffectiveMove(move, allMoves)),
      ...ownMoves.map((move) => resolveEffectiveMove(move, allMoves)),
    ];
  });
  readonly sequences = computed(() => {
    const allSequences = this.facade.guide()?.entities.sequences ?? [];
    const scope = this.scopeKey();

    if (scope === UNIVERSAL_SCOPE) {
      return allSequences.filter(
        (sequence) => !sequence.characterKey && !sequence.teamKey
      );
    }
    if (this.team()) {
      return allSequences.filter((sequence) => sequence.teamKey === scope);
    }
    return allSequences.filter((sequence) => sequence.characterKey === scope);
  });
  readonly draftMoveKeys = signal<string[]>([]);
  readonly sequenceError = signal('');

  moveName(moveKey: string | undefined): string {
    const allMoves = this.facade.guide()?.entities.moves ?? [];
    return allMoves.find((move) => move.semanticKey === moveKey)?.name ?? moveKey ?? '';
  }

  // Badge label for a Move tile: "Universal" whenever the tile is shown at
  // all (functionally it's the same Move regardless of which Team member
  // executes it, so listing non-overriding member names would be noise),
  // the owning Character's name for an override shown in Team scope, or
  // undefined when the badge would be redundant (own-scope).
  moveTileBadge(move: { characterKey?: string }): string | undefined {
    if (!move.characterKey) {
      return this.scopeKey() !== UNIVERSAL_SCOPE ? 'Universal' : undefined;
    }
    if (this.team()) {
      return this.characters().find((c) => c.semanticKey === move.characterKey)
        ?.name;
    }
    return undefined;
  }

  teamName(teamKey: string): string {
    const team = this.teams().find((t) => t.semanticKey === teamKey);
    return team
      ? team.orderedCharacterKeys
          .map((characterKey) =>
            this.characters().find((c) => c.semanticKey === characterKey)
              ?.name ?? characterKey
          )
          .join(' + ')
      : teamKey;
  }

  setScope(scopeKey: string): void {
    this.scopeKey.set(scopeKey);
    this.draftMoveKeys.set([]);
    this.sequenceError.set('');
  }

  addDraftMove(moveKey: string): void {
    this.draftMoveKeys.update((keys) => [...keys, moveKey]);
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
      ...(scope === UNIVERSAL_SCOPE
        ? {}
        : this.team()
          ? { teamKey: scope }
          : { characterKey: scope }),
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
