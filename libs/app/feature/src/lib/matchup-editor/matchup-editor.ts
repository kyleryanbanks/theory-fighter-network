import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';

const UNSCOPED_STAGE = '';

@Component({
  selector: 'tfn-matchup-editor',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
  readonly draftName = signal('');
  readonly draftStageKey = signal(UNSCOPED_STAGE);
  readonly matchupError = signal('');

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

  async createMatchup(): Promise<void> {
    const attackerKey = this.attackerKey();
    const defenderKey = this.defenderKey();
    const name = this.draftName().trim();

    if (!attackerKey || !defenderKey) {
      this.matchupError.set('Select an attacker and defender Character.');
      return;
    }
    if (!name) {
      this.matchupError.set('name is required.');
      return;
    }

    const stageKey = this.draftStageKey() || undefined;
    const result = await this.facade.createMatchup({
      attackerKey,
      defenderKey,
      name,
      stageKey,
    });

    if (result.status === 'error') {
      this.matchupError.set(getErrorMessage(result.error));
      return;
    }

    this.draftName.set('');
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
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The Matchup could not be updated.';
}
