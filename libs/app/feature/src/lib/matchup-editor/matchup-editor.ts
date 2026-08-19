import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { DeleteButton, EntityMetadataView, ExpansionPanel, TfnLink, TileGridComponent, type Tile, type TileChoice } from '@theory-fighter-network/ui';

const UNSCOPED_STAGE = '';

@Component({
  selector: 'tfn-matchup-editor',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
    TfnLink,
    EntityNotes,
    ExpansionPanel,
    EntityMetadataView,
    DeleteButton,
    TileGridComponent,
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
  readonly draftResponseOptionKey = signal('');
  readonly draftResponseOutcome = signal<-1 | 0 | 1>(0);
  readonly editingResponseKey = signal<string | null>(null);
  readonly scenarioError = signal('');

  @HostListener('document:click')
  closeResponseMenu(): void {
    this.editingResponseKey.set(null);
  }

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

  responseMoves(matchup: { attackerKey: string }) {
    return this.moves().filter(
      (move) =>
        !move.characterKey ||
        (move.characterKey === matchup.attackerKey && Boolean(move.parentKey))
    );
  }

  responseSequences(matchup: { attackerKey: string }) {
    return this.sequences().filter(
      (sequence) =>
        (!sequence.characterKey && !sequence.teamKey) ||
        sequence.characterKey === matchup.attackerKey
    );
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
    this.draftResponseOptionKey.set('');
    this.draftResponseOutcome.set(0);
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

  async addResponse(matchupKey: string, scenarioKey: string): Promise<void> {
    const playerOptionKey = this.draftResponseOptionKey();
    if (!playerOptionKey) {
      this.scenarioError.set('Select a response Move or Sequence.');
      return;
    }
    const result = await this.facade.addScenarioResponse({
      matchupKey,
      scenarioKey,
      playerOptionKey,
      outcome: this.draftResponseOutcome(),
    });
    if (result.status === 'error') {
      this.scenarioError.set(getErrorMessage(result.error));
      return;
    }
    this.draftResponseOptionKey.set('');
    this.draftResponseOutcome.set(0);
    this.scenarioError.set('');
  }

  async removeResponse(
    matchupKey: string,
    scenarioKey: string,
    responseKey: string
  ): Promise<void> {
    const result = await this.facade.removeScenarioResponse({
      matchupKey,
      scenarioKey,
      responseKey,
    });
    if (result.status === 'error') {
      this.scenarioError.set(getErrorMessage(result.error));
      return;
    }
    this.scenarioError.set('');
  }

  toggleResponseMenu(responseKey: string): void {
    this.editingResponseKey.set(
      this.editingResponseKey() === responseKey ? null : responseKey
    );
  }

  async updateResponseOutcome(
    matchupKey: string,
    scenarioKey: string,
    responseKey: string,
    outcome: -1 | 0 | 1
  ): Promise<void> {
    const result = await this.facade.updateScenarioResponse({
      matchupKey,
      scenarioKey,
      responseKey,
      outcome,
    });
    if (result.status === 'error') {
      this.scenarioError.set(getErrorMessage(result.error));
      return;
    }
    this.editingResponseKey.set(null);
    this.scenarioError.set('');
  }

  async resetResponse(
    matchupKey: string,
    scenarioKey: string,
    responseKey: string
  ): Promise<void> {
    const result = await this.facade.removeScenarioResponse({
      matchupKey,
      scenarioKey,
      responseKey,
    });
    if (result.status === 'error') {
      this.scenarioError.set(getErrorMessage(result.error));
      return;
    }
    this.editingResponseKey.set(null);
    this.scenarioError.set('');
  }

  responseOutcomeClass(outcome: -1 | 0 | 1): string {
    return outcome === 1 ? 'win' : outcome === -1 ? 'loss' : 'trade';
  }

  responseOutcomeLabel(outcome: -1 | 0 | 1): string {
    return outcome === 1 ? 'Win' : outcome === -1 ? 'Loss' : 'Trade';
  }

  responseFor(scenario: { responses?: Array<{ playerOptionKey: string; outcome: -1 | 0 | 1; semanticKey: string }> }, optionKey: string) {
    return scenario.responses?.find((response) => response.playerOptionKey === optionKey);
  }

  responseTileKey(scenarioKey: string, optionKey: string): string {
    return `${scenarioKey}:${optionKey}`;
  }

  /** Shared outcome choices for all response tiles. */
  readonly responseChoices: Record<string, TileChoice> = {
    win:   { label: 'Win',   value: 1,  color: '#4caf50' },
    trade: { label: 'Trade', value: 0,  color: '#ff9800' },
    reset: { label: 'Reset', value: undefined },
    lose:  { label: 'Lose',  value: -1, color: '#e53935' },
  };

  /** Build a Tile for one response option within a scenario. */
  responseTile(
    scenario: { semanticKey: string; responses?: Array<{ playerOptionKey: string; outcome: -1 | 0 | 1; semanticKey: string }> },
    optionKey: string,
    label: string
  ): Tile {
    const response = this.responseFor(scenario, optionKey);
    const outcomeToChoice: Record<number, TileChoice> = {
      1: this.responseChoices['win'],
      0: this.responseChoices['trade'],
      [-1]: this.responseChoices['lose'],
    };
    return {
      key: optionKey,
      label,
      choices: this.responseChoices,
      value: response ? outcomeToChoice[response.outcome] : undefined,
    };
  }

  /** Build the full tile list for a scenario's response grid. */
  responseTiles(
    matchup: { attackerKey: string },
    scenario: { semanticKey: string; responses?: Array<{ playerOptionKey: string; outcome: -1 | 0 | 1; semanticKey: string }> }
  ): Tile[] {
    return [
      ...this.responseMoves(matchup).map((m) => this.responseTile(scenario, m.semanticKey, m.name)),
      ...this.responseSequences(matchup).map((s) => this.responseTile(scenario, s.semanticKey, this.optionLabel(s.semanticKey))),
    ];
  }

  async onResponseTileUpdate(
    matchupKey: string,
    scenarioKey: string,
    { tile }: { tile: Tile; selection: string[] }
  ): Promise<void> {
    if (typeof tile.value === 'boolean') return;

    if (!tile.value || tile.value.value === undefined) {
      // Reset — remove existing response if present
      const scenario = this.matchups()
        .flatMap((m) => m.scenarios)
        .find((s) => s.semanticKey === scenarioKey);
      const existing = scenario ? this.responseFor(scenario, tile.key) : undefined;
      if (existing) {
        await this.resetResponse(matchupKey, scenarioKey, existing.semanticKey);
      }
      return;
    }

    await this.chooseResponseOutcome(matchupKey, scenarioKey, tile.key, tile.value.value as -1 | 0 | 1);
  }

  async chooseResponseOutcome(
    matchupKey: string,
    scenarioKey: string,
    optionKey: string,
    outcome: -1 | 0 | 1
  ): Promise<void> {
    const scenario = this.matchups()
      .flatMap((matchup) => matchup.scenarios)
      .find((candidate) => candidate.semanticKey === scenarioKey);
    const existing = scenario ? this.responseFor(scenario, optionKey) : undefined;
    if (existing) {
      await this.updateResponseOutcome(matchupKey, scenarioKey, existing.semanticKey, outcome);
    } else {
      this.draftResponseOptionKey.set(optionKey);
      this.draftResponseOutcome.set(outcome);
      await this.addResponse(matchupKey, scenarioKey);
    }
    this.editingResponseKey.set(null);
  }

  // Opens the Scenario draft for this Matchup, prefilled with the note's
  // text, and remembers the note so it can be linked once the Scenario
  // is actually created (a note can't become a Scenario on its own since
  // it has no opponentOptionKey to reference).
  addressNote(matchupKey: string, note: NoteEntry): void {
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
