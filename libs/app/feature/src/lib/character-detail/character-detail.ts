import { JsonPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LocalGuideFacadeStore, type StateModel } from '@theory-fighter-network/data';
import {
  EntityDetailShell,
  ExpansionPanel,
  GameStateManagerComponent,
  StateCreateDialogComponent,
  type StateCreateDialogResult,
} from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';

@Component({
  selector: 'tfn-character-detail',
  imports: [JsonPipe, EntityDetailShell, EntityNotes, ExpansionPanel, GameStateManagerComponent],
  templateUrl: './character-detail.html',
})
export class CharacterDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  readonly facade = inject(LocalGuideFacadeStore);

  readonly entityKey = this.route.snapshot.paramMap.get('entityKey') ?? '';

  readonly character = computed(() =>
    (this.facade.guide()?.entities.characters ?? []).find(
      (c) => c.semanticKey === this.entityKey
    )
  );

  readonly states = computed((): StateModel => this.character()?.states ?? {});

  readonly gameStateCategories = computed(() =>
    Object.keys(this.facade.guide()?.entities.game.states ?? {})
  );

  openStateDialog(): void {
    const ref = this.dialog.open<
      StateCreateDialogComponent,
      { existingStates: StateModel; existingCategories: string[] },
      StateCreateDialogResult | undefined
    >(StateCreateDialogComponent, {
      data: {
        existingStates: this.states(),
        existingCategories: [
          ...new Set([
            ...Object.keys(this.states()),
            ...this.gameStateCategories(),
          ]),
        ].sort(),
      },
    });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      void this.facade.createCharacterState({ characterKey: this.entityKey, ...result });
    });
  }

  deleteState(event: { category: string; semanticKey: string }): void {
    void this.facade.deleteCharacterState({ characterKey: this.entityKey, ...event });
  }
}

