import { Component, computed, inject } from '@angular/core';
import { JsonPipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LocalGuideFacadeStore, resolveEffectiveMove } from '@theory-fighter-network/data';
import type { DataValue } from '@theory-fighter-network/data';
import { ExpansionPanel, EntityDetailShell, DataValueEditor } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';

@Component({
  selector: 'tfn-move-detail',
  imports: [JsonPipe, TitleCasePipe, DataValueEditor, ExpansionPanel, EntityDetailShell, EntityNotes],
  templateUrl: './move-detail.html',
  styleUrl: './move-detail.css',
})
export class MoveDetail {
  readonly phaseNames = ['startup', 'active', 'recovery'] as const;
  private readonly route = inject(ActivatedRoute);
  readonly facade = inject(LocalGuideFacadeStore);
  readonly move = computed(() => {
    const key = this.route.snapshot.paramMap.get('moveKey');
    const moves = this.facade.guide()?.entities.moves ?? [];
    const move = moves.find((candidate) => candidate.semanticKey === key);
    return move ? resolveEffectiveMove(move, moves) : undefined;
  });

  phaseDuration(phase: 'startup' | 'active' | 'recovery'): DataValue {
    return this.move()?.phases?.[0]?.[phase]?.duration ?? {};
  }

  async updatePhaseDuration(
    phase: 'startup' | 'active' | 'recovery',
    duration: DataValue
  ): Promise<void> {
    const moveKey = this.move()?.semanticKey;
    if (moveKey) {
      await this.facade.updateMovePhaseDuration({ moveKey, phase, duration });
    }
  }
}
