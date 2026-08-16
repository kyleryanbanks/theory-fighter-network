import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { DeleteButton, EntityMetadataView, ExpansionPanel } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';

@Component({
  selector: 'tfn-team-editor',
  imports: [MatButtonModule, EntityNotes, EntityMetadataView, ExpansionPanel, DeleteButton],
  templateUrl: './team-editor.html',
  styleUrl: './team-editor.css',
})
export class TeamEditor {
  readonly facade = inject(LocalGuideFacadeStore);
  private readonly router = inject(Router);
  readonly characters = computed(
    () => this.facade.guide()?.entities.characters ?? []
  );
  readonly teams = computed(() => this.facade.guide()?.entities.teams ?? []);
  readonly teamSize = computed(
    () => this.facade.guide()?.entities.game?.config?.teamSize ?? 0
  );
  readonly draftCharacterKeys = signal<string[]>([]);
  readonly teamError = signal('');
  readonly atTeamSizeLimit = computed(
    () => this.draftCharacterKeys().length >= this.teamSize()
  );
  // Persistent status explaining why tiles are greyed out; disabled tiles
  // never emit a click, so a transient error message can't reach the user.
  readonly rosterStatus = computed(() => {
    if (this.teamSize() <= 1) {
      return 'Set the Game Team Size above 1 to build Teams.';
    }
    if (this.atTeamSizeLimit()) {
      return `Roster full (${this.draftCharacterKeys().length}/${this.teamSize()}). Tap a picked Character to swap them out.`;
    }
    return '';
  });

  characterName(characterKey: string): string {
    return (
      this.characters().find(
        (character) => character.semanticKey === characterKey
      )?.name ?? characterKey
    );
  }

  teamLabel(characterKeys: string[]): string {
    return characterKeys.map((key) => this.characterName(key)).join(' + ');
  }

  // Position badge (1-based) for a Character already on the roster, or
  // undefined when it hasn't been picked yet.
  rosterPosition(characterKey: string): number | undefined {
    const index = this.draftCharacterKeys().indexOf(characterKey);
    return index === -1 ? undefined : index + 1;
  }

  toggleCharacterTile(characterKey: string): void {
    if (this.draftCharacterKeys().includes(characterKey)) {
      this.draftCharacterKeys.update((keys) =>
        keys.filter((key) => key !== characterKey)
      );
      this.teamError.set('');
      return;
    }

    if (this.teamSize() <= 1 || this.atTeamSizeLimit()) {
      return;
    }
    this.draftCharacterKeys.update((keys) => [...keys, characterKey]);
    this.teamError.set('');
  }

  async createTeam(): Promise<void> {
    const characterKeys = this.draftCharacterKeys();
    if (characterKeys.length === 0) {
      this.teamError.set('Add at least one Character to the Team.');
      return;
    }

    const result = await this.facade.createTeam({ characterKeys });

    if (result.status === 'error') {
      this.teamError.set(getErrorMessage(result.error));
      return;
    }

    this.draftCharacterKeys.set([]);
    this.teamError.set('');
  }

  async deleteTeam(teamKey: string): Promise<void> {
    const result = await this.facade.deleteTeam({ teamKey });

    if (result.status === 'error') {
      this.teamError.set(getErrorMessage(result.error));
      return;
    }

    this.teamError.set('');
  }

  addressNote(teamKey: string, note: { text: string }): void {
    void this.router.navigate(['/sequences'], {
      queryParams: { teamKey, addressNote: note.text },
    });
  }
}


function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The Team could not be updated.';
}
