import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, JsonPipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LocalGuideFacadeStore, resolveEffectiveMove, buildCharacterMoveList } from '@theory-fighter-network/data';
import type { DataValue, PhaseCancelRule, StatePatch, StateModel, MovePreconditions } from '@theory-fighter-network/data';
import { MatButtonModule } from '@angular/material/button';
import { DeleteButton, ExpansionPanel, EntityDetailShell, DataValueEditor, StatePatchEditorComponent, Tile, StateCreateDialogComponent, type StateCreateDialogResult, MovePreconditionEditorComponent } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';
import { CancelGroupsEditorComponent } from '../cancel-groups-editor/cancel-groups-editor';

@Component({
  selector: 'tfn-move-detail',
  imports: [CommonModule, JsonPipe, TitleCasePipe, MatButtonModule, DataValueEditor, DeleteButton, ExpansionPanel, EntityDetailShell, EntityNotes, CancelGroupsEditorComponent, StatePatchEditorComponent, MovePreconditionEditorComponent],
  templateUrl: './move-detail.html',
  styleUrl: './move-detail.css',
})
export class MoveDetail {
  readonly phaseNames = ['startup', 'active', 'recovery'] as const;
  readonly outcomeNames = ['onHit', 'onBlock', 'onCounterHit', 'onWhiff', 'onSecondaryTrigger'] as const;
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  readonly facade = inject(LocalGuideFacadeStore);
  readonly move = computed(() => {
    const key = this.route.snapshot.paramMap.get('moveKey');
    const moves = this.facade.guide()?.entities.moves ?? [];
    const move = moves.find((candidate) => candidate.semanticKey === key);
    return move ? resolveEffectiveMove(move, moves) : undefined;
  });

  readonly phaseIndices = computed(() => {
    const count = this.move()?.phases?.length ?? 0;
    return Array.from({ length: Math.max(1, count) }, (_, index) => index);
  });

  readonly universalGroups = computed((): Record<string, string[]> =>
    this.facade.guide()?.entities.game?.universal.cancelGroups ?? {}
  );

  readonly characterGroups = computed((): Record<string, string[]> => {
    const move = this.move();
    if (!move?.characterKey) return {};
    const character = this.facade.guide()?.entities.characters.find(
      (c) => c.semanticKey === move.characterKey
    );
    return character?.cancelGroups ?? {};
  });

  readonly cancelMoveList = computed((): Tile[] => {
    const guide = this.facade.guide();
    if (!guide) return [];
    const move = this.move();
    const universalMoveKeys = guide.entities.game.universal.moveKeys;
    const characterMoveKeys = move?.characterKey
      ? (guide.entities.characters.find((c) => c.semanticKey === move.characterKey)?.hierarchy?.moveKeys ?? [])
      : [];
    return buildCharacterMoveList(universalMoveKeys, characterMoveKeys, guide.entities.moves)
      .map((entry) => ({
        key: entry.semanticKey,
        label: entry.name,
        tags: entry.isUniversal ? [{ label: 'Universal', color: 'info' as const }] : undefined,
      }));
  });

  readonly stateModel = computed((): StateModel => {
    const guide = this.facade.guide();
    if (!guide) return {};
    const gameStates = guide.entities.game.states;
    const move = this.move();
    if (!move?.characterKey) return gameStates;
    const characterStates = guide.entities.characters.find(
      (c) => c.semanticKey === move.characterKey
    )?.states ?? {};
    const merged: StateModel = { ...gameStates };
    for (const [category, states] of Object.entries(characterStates)) {
      merged[category] = { ...(merged[category] ?? {}), ...states };
    }
    return merged;
  });

  openCreateGameStateDialog(): void {
    const guide = this.facade.guide();
    if (!guide) return;
    const ref = this.dialog.open<StateCreateDialogComponent, unknown, StateCreateDialogResult | undefined>(
      StateCreateDialogComponent,
      {
        data: {
          existingStates: guide.entities.game.states,
          existingCategories: Object.keys(guide.entities.game.states),
        },
      }
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      void this.facade.createGameState(result);
    });
  }

  openCreateCharacterStateDialog(): void {
    const guide = this.facade.guide();
    const characterKey = this.move()?.characterKey;
    if (!guide || !characterKey) return;
    const character = guide.entities.characters.find((c) => c.semanticKey === characterKey);
    const characterStates: StateModel = character?.states ?? {};
    const existingCategories = [
      ...new Set([
        ...Object.keys(characterStates),
        ...Object.keys(guide.entities.game.states),
      ]),
    ].sort();
    const ref = this.dialog.open<StateCreateDialogComponent, unknown, StateCreateDialogResult | undefined>(
      StateCreateDialogComponent,
      { data: { existingStates: characterStates, existingCategories } }
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      void this.facade.createCharacterState({ characterKey, ...result });
    });
  }

  preconditions(): MovePreconditions {
    return this.move()?.preconditions ?? {};
  }

  async updatePreconditions(preconditions: MovePreconditions): Promise<void> {
    const moveKey = this.move()?.semanticKey;
    if (moveKey) {
      await this.facade.updateMovePreconditions({ moveKey, preconditions });
    }
  }

  outcomeStatePatch(
    phaseIndex: number,
    outcome: typeof this.outcomeNames[number],
    field: 'source' | 'target' | 'game'
  ): StatePatch {
    return this.move()?.phases?.[phaseIndex]?.effects?.[outcome]?.[field] ?? {};
  }

  async updateOutcomeStatePatch(
    phaseIndex: number,
    outcome: typeof this.outcomeNames[number],
    field: 'source' | 'target' | 'game',
    patch: StatePatch
  ): Promise<void> {
    const moveKey = this.move()?.semanticKey;
    if (moveKey) {
      await this.facade.updateMoveOutcomeStatePatch({ moveKey, phaseIndex, outcome, field, patch });
    }
  }

  cancelOverrides(cancel: PhaseCancelRule): Record<string, boolean> {
    return cancel.userOverrideMoves ?? {};
  }

  cancelUniversalGroupSelections(cancel: PhaseCancelRule): Set<string> {
    return new Set(cancel.universalCancelGroupNames ?? []);
  }

  async onCancelRuleSave(
    phaseIndex: number,
    outcome: typeof this.outcomeNames[number],
    cancelIndex: number,
    event: { universalGroups: string[]; overrides: Record<string, boolean>; cancelWindowStart?: number | null; cancelWindowEnd?: number | null }
  ): Promise<void> {
    const currentCancels = this.outcomeCancels(phaseIndex, outcome);
    const cancel = currentCancels[cancelIndex];
    if (!cancel) return;
    const updated = {
      ...cancel,
      universalCancelGroupNames: event.universalGroups,
      userOverrideMoves: event.overrides,
      startFrame: event.cancelWindowStart ?? cancel.startFrame,
      endFrame: event.cancelWindowEnd ?? cancel.endFrame,
    };
    await this.updateOutcomeCancel(phaseIndex, outcome, cancelIndex, updated);
  }

  phaseDuration(phaseIndex: number, phase: 'startup' | 'active' | 'recovery'): DataValue {
    return this.move()?.phases?.[phaseIndex]?.[phase]?.duration ?? {};
  }

  outcomeLabel(outcome: typeof this.outcomeNames[number]): string {
    return {
      onHit: 'On Hit',
      onBlock: 'On Block',
      onCounterHit: 'On Counter Hit',
      onWhiff: 'On Whiff',
      onSecondaryTrigger: 'On Secondary Trigger',
    }[outcome];
  }

  async updatePhaseDuration(
    phaseIndex: number,
    phase: 'startup' | 'active' | 'recovery',
    duration: DataValue
  ): Promise<void> {
    const moveKey = this.move()?.semanticKey;
    if (moveKey) {
      await this.facade.updateMovePhaseDuration({ moveKey, phaseIndex, phase, duration });
    }
  }

  outcomeDataValue(
    phaseIndex: number,
    outcome: typeof this.outcomeNames[number],
    field: 'hitStop' | 'stun'
  ): DataValue {
    return this.move()?.phases?.[phaseIndex]?.effects?.[outcome]?.[field] ?? {};
  }

  async updateOutcomeDataValue(
    phaseIndex: number,
    outcome: typeof this.outcomeNames[number],
    field: 'hitStop' | 'stun',
    value: DataValue
  ): Promise<void> {
    const moveKey = this.move()?.semanticKey;
    if (moveKey) {
      await this.facade.updateMoveOutcomeDataValue({
        moveKey,
        phaseIndex,
        outcome,
        field,
        value,
      });
    }
  }

  outcomeCancels(
    phaseIndex: number,
    outcome: typeof this.outcomeNames[number]
  ): PhaseCancelRule[] {
    return this.move()?.phases?.[phaseIndex]?.effects?.[outcome]?.cancels ?? [];
  }

  async updateOutcomeCancels(
    phaseIndex: number,
    outcome: typeof this.outcomeNames[number],
    cancels: PhaseCancelRule[]
  ): Promise<void> {
    const moveKey = this.move()?.semanticKey;
    if (moveKey) {
      await this.facade.updateMoveOutcomeCancels({
        moveKey,
        phaseIndex,
        outcome,
        cancels,
      });
    }
  }

  async addOutcomeCancel(
    phaseIndex: number,
    outcome: typeof this.outcomeNames[number],
    cancel: PhaseCancelRule
  ): Promise<void> {
    const currentCancels = this.outcomeCancels(phaseIndex, outcome);
    await this.updateOutcomeCancels(phaseIndex, outcome, [...currentCancels, cancel]);
  }

  async removeOutcomeCancel(
    phaseIndex: number,
    outcome: typeof this.outcomeNames[number],
    cancelIndex: number
  ): Promise<void> {
    const currentCancels = this.outcomeCancels(phaseIndex, outcome);
    const updated = currentCancels.filter((_, index) => index !== cancelIndex);
    await this.updateOutcomeCancels(phaseIndex, outcome, updated);
  }

  async updateOutcomeCancel(
    phaseIndex: number,
    outcome: typeof this.outcomeNames[number],
    cancelIndex: number,
    cancel: PhaseCancelRule
  ): Promise<void> {
    const currentCancels = this.outcomeCancels(phaseIndex, outcome);
    const updated = currentCancels.map((c, index) => (index === cancelIndex ? cancel : c));
    await this.updateOutcomeCancels(phaseIndex, outcome, updated);
  }

  async addPhase(): Promise<void> {
    const moveKey = this.move()?.semanticKey;
    if (moveKey) await this.facade.addMovePhase({ moveKey });
  }

  async removePhase(phaseIndex: number): Promise<void> {
    const moveKey = this.move()?.semanticKey;
    if (moveKey && this.phaseIndices().length > 1) {
      await this.facade.removeMovePhase({ moveKey, phaseIndex });
    }
  }
}
