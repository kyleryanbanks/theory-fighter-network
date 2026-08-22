import { JsonPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LocalGuideFacadeStore, buildCharacterMoveList, type StateModel } from '@theory-fighter-network/data';
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
    const guide = this.facade.guide();
    if (!guide) return [];
    const character = this.character();
    const universalMoveKeys = guide.entities.game.universal.moveKeys;
    const characterMoveKeys = character?.hierarchy?.moveKeys ?? [];
    return buildCharacterMoveList(universalMoveKeys, characterMoveKeys, guide.entities.moves)
      .map((entry) => ({
        key: entry.semanticKey,
        label: entry.name,
        tags: entry.isUniversal ? [{ label: 'Universal', color: 'info' as const }] : undefined,
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

