import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  createMatchupScenarioSemanticKey,
  LocalGuideFacadeStore,
} from '@theory-fighter-network/data';
import type { NoteEntry } from '@theory-fighter-network/data';
import { EntityNotes } from '../entity-notes/entity-notes';
import { EntityMetadataView, ExpansionPanel } from '@theory-fighter-network/ui';

const UNSCOPED_STAGE = '';

@Component({
  selector: 'tfn-matchup-editor',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    EntityNotes,
    ExpansionPanel,
    EntityMetadataView,
  ],
  templateUrl: './matchup-editor.html',
  styleUrl: './matchup-editor.css',
})
export class MatchupEditor {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly characters = computed(
    () => this.facade.guide()?.entities.characters ?? []
  );
  readonly stages = computed(
    () => this.facade.guide()?.entities.stages ?? []
  );
  readonly matchups = computed(
    () => this.facade.guide()?.entities.matchups ?? []
  );

  readonly attackerKey = signal('');
  readonly defenderKey = signal('');
  readonly matchupError = signal('');

  readonly moves = computed(() => this.facade.guide()?.entities.moves ?? []);
  readonly sequences = computed(
    () => this.facade.guide()?.entities.sequences ?? []
  );
  readonly expandedMatchupKey = signal<string | null>(null);
  readonly selectedMatchupKey = signal<string | null>(null);
  readonly draftOpponentOptionKey = signal('');
  readonly draftScenarioName = signal('');
  readonly draftScenarioStageKey = signal(UNSCOPED_STAGE);
  readonly scenarioError = signal('');

  // Tracks a note mid-promotion so the Scenario it's prefilling can be
  // linked back to it once the Scenario is actually created.
  private readonly promotingNote = signal<{
    matchupKey: string;
    noteId: string;
  } | null>(null);

  characterName(characterKey: string): string {
    return (
      this.characters().find(
        (character) => character.semanticKey === characterKey
      )?.name ?? characterKey
    );
  }

  stageName(stageKey: string): string {
    return (
      this.stages().find((stage) => stage.semanticKey === stageKey)?.name ??
      stageKey
    );
  }

  optionLabel(optionKey: string): string {
    const move = this.moves().find(
      (candidate) => candidate.semanticKey === optionKey
    );
    if (move) {
      return move.name;
    }

    const sequence = this.sequences().find(
      (candidate) => candidate.semanticKey === optionKey
    );
    if (sequence) {
      return sequence.sequence
        .map(
          (step) =>
            this.moves().find((move) => move.semanticKey === step.moveKey)
              ?.name ?? step.moveKey
        )
        .join(' → ');
    }

    return optionKey;
  }

  async createMatchup(): Promise<void> {
    const attackerKey = this.attackerKey();
    const defenderKey = this.defenderKey();

    if (!attackerKey || !defenderKey) {
      this.matchupError.set('Select an attacker and defender Character.');
      return;
    }

    const result = await this.facade.createMatchup({
      attackerKey,
      defenderKey,
    });

    if (result.status === 'error') {
      this.matchupError.set(getErrorMessage(result.error));
      return;
    }

    this.matchupError.set('');
  }

  async deleteMatchup(matchupKey: string): Promise<void> {
    const result = await this.facade.deleteMatchup({ matchupKey });

    if (result.status === 'error') {
      this.matchupError.set(getErrorMessage(result.error));
      return;
    }

    this.matchupError.set('');
  }

  toggleMatchup(matchupKey: string): void {
    const isExpanded = this.expandedMatchupKey() === matchupKey;
    this.expandedMatchupKey.set(isExpanded ? null : matchupKey);
    this.selectedMatchupKey.set(isExpanded ? null : matchupKey);
    this.scenarioError.set('');
  }

  toggleScenarios(matchupKey: string): void {
    this.expandedMatchupKey.set(matchupKey);
    this.selectedMatchupKey.set(
      this.selectedMatchupKey() === matchupKey ? null : matchupKey
    );
    this.draftOpponentOptionKey.set('');
    this.draftScenarioName.set('');
    this.draftScenarioStageKey.set(UNSCOPED_STAGE);
    this.scenarioError.set('');
  }

  async addScenario(matchupKey: string): Promise<void> {
    const opponentOptionKey = this.draftOpponentOptionKey();
    if (!opponentOptionKey) {
      this.scenarioError.set('Select an opponent option (Move or Sequence).');
      return;
    }

    const name = this.draftScenarioName().trim() || undefined;
    const stageKey = this.draftScenarioStageKey() || undefined;
    const result = await this.facade.addMatchupScenario({
      matchupKey,
      opponentOptionKey,
      name,
      stageKey,
    });

    if (result.status === 'error') {
      this.scenarioError.set(getErrorMessage(result.error));
      return;
    }

    const promoting = this.promotingNote();
    if (promoting && promoting.matchupKey === matchupKey) {
      const scenarioKey = createMatchupScenarioSemanticKey(
        matchupKey,
        opponentOptionKey,
        stageKey
      );
      await this.facade.promoteEntityNote({
        entityType: 'matchup',
        entityKey: matchupKey,
        noteId: promoting.noteId,
        promotedToKey: scenarioKey,
      });
      this.promotingNote.set(null);
    }

    this.draftScenarioName.set('');
    this.scenarioError.set('');
  }

  async removeScenario(matchupKey: string, scenarioKey: string): Promise<void> {
    const result = await this.facade.removeMatchupScenario({
      matchupKey,
      scenarioKey,
    });

    if (result.status === 'error') {
      this.scenarioError.set(getErrorMessage(result.error));
      return;
    }

    this.scenarioError.set('');
  }

  // Opens the Scenario draft for this Matchup, prefilled with the note's
  // text, and remembers the note so it can be linked once the Scenario
  // is actually created (a note can't become a Scenario on its own since
  // it has no opponentOptionKey to reference).
  promoteNote(matchupKey: string, note: NoteEntry): void {
    this.selectedMatchupKey.set(matchupKey);
    this.draftScenarioName.set(note.text);
    this.promotingNote.set({ matchupKey, noteId: note.id });
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The Matchup could not be updated.';
}
