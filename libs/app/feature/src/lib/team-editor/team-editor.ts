import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { DeleteButton, EntityMetadataView, ExpansionPanel, TfnLink, TileGridComponent, type Tile } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';

@Component({
  selector: 'tfn-team-editor',
  imports: [MatButtonModule, RouterLink, EntityNotes, EntityMetadataView, ExpansionPanel, DeleteButton, TfnLink, TileGridComponent],
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

  /** Characters as Tiles for TileGridComponent selection mode. */
  readonly characterTiles = computed((): Tile[] =>
    this.characters().map((c) => ({ key: c.semanticKey, label: c.name }))
  );

  /** Currently selected character Tiles (drives tile-grid [selections]). */
  readonly selectedCharacterTiles = computed((): Tile[] =>
    this.draftCharacterKeys().map((key) => ({
      key,
      label: this.characterName(key),
    }))
  );
  // Persistent status explaining team size requirement.
  readonly rosterStatus = computed(() => {
    if (this.teamSize() <= 1) {
      return 'Set the Game Team Size above 1 to build Teams.';
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

  onCharacterTileUpdate(tileOrTiles: Tile | Tile[]): void {
    if (Array.isArray(tileOrTiles)) {
      this.draftCharacterKeys.set(tileOrTiles.map((t) => t.key));
      this.teamError.set('');
    }
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
