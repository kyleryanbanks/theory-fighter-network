import { Component, computed, inject } from '@angular/core';
import { JsonPipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LocalGuideFacadeStore, resolveEffectiveMove } from '@theory-fighter-network/data';
import type { DataValue, PhaseCancelRule } from '@theory-fighter-network/data';
import { MatButtonModule } from '@angular/material/button';
import { DeleteButton, ExpansionPanel, EntityDetailShell, DataValueEditor } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';

@Component({
  selector: 'tfn-move-detail',
  imports: [JsonPipe, TitleCasePipe, MatButtonModule, DataValueEditor, DeleteButton, ExpansionPanel, EntityDetailShell, EntityNotes],
  templateUrl: './move-detail.html',
  styleUrl: './move-detail.css',
})
export class MoveDetail {
  readonly phaseNames = ['startup', 'active', 'recovery'] as const;
  readonly outcomeNames = ['onHit', 'onBlock', 'onCounterHit', 'onWhiff', 'onSecondaryTrigger'] as const;
  private readonly route = inject(ActivatedRoute);
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
