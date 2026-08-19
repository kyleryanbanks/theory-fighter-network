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
import type { Tile } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';
import { CancelGroupsEditorComponent } from '../cancel-groups-editor/cancel-groups-editor';

@Component({
  selector: 'tfn-character-detail',
  imports: [JsonPipe, EntityDetailShell, EntityNotes, ExpansionPanel, GameStateManagerComponent, CancelGroupsEditorComponent],
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

  readonly cancelGroups = computed(() => this.character()?.cancelGroups ?? {});

  readonly moveList = computed((): Tile[] => {
    const character = this.character();
    const allMoves = this.facade.guide()?.entities.moves ?? [];
    const keys = character?.hierarchy?.moveKeys ?? [];
    return keys.map((key): Tile => ({
      key,
      label: allMoves.find(m => m.semanticKey === key)?.name ?? key,
      value: false,
    }));
  });

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

  async saveCancelGroup(rule: { name?: string; moveList: string[] }): Promise<void> {
    await this.facade.createCancelGroup({
      scopeKey: this.entityKey,
      isGameLevel: false,
      groupName: rule.name ?? '',
      moveKeys: rule.moveList,
    });
  }

  async renameCancelGroup(event: { oldName: string; newName: string }): Promise<void> {
    await this.facade.renameCancelGroup({
      scopeKey: this.entityKey,
      isGameLevel: false,
      oldName: event.oldName,
      newName: event.newName,
    });
  }

  async deleteCancelGroup(event: { groupName: string }): Promise<void> {
    await this.facade.deleteCancelGroup({
      scopeKey: this.entityKey,
      isGameLevel: false,
      groupName: event.groupName,
    });
  }
}

