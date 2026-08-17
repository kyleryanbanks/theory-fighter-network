import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MoveDocument, DataValue } from '@theory-fighter-network/data';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { ComparisonAxis, TfnLink } from '@theory-fighter-network/ui';

export type ComparisonPhaseType = 'startup' | 'active' | 'recovery';

export interface ComparisonType {
  phase: ComparisonPhaseType;
  phaseIndex: number;
}

@Component({
  selector: 'tfn-move-comparison',
  imports: [ComparisonAxis, RouterLink, TfnLink],
  templateUrl: './move-comparison.html',
  styleUrl: './move-comparison.css',
})
export class MoveComparison {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly moves = computed(() => this.facade.guide()?.entities.moves ?? []);
  readonly selectedKeys = signal<string[]>([]);
  readonly comparisonType = signal<ComparisonType>({
    phase: 'startup',
    phaseIndex: 0,
  });

  readonly selectedMoves = computed(() =>
    this.moves().filter(move => this.selectedKeys().includes(move.semanticKey))
  );

  readonly pins = computed(() =>
    this.selectedMoves().map(move => ({
      key: move.semanticKey,
      label: move.name,
      relative: this.extractDataValue(move)?.relative ?? 50,
      exact: this.extractDataValue(move)?.exact,
    }))
  );

  toggleMove(moveKey: string): void {
    this.selectedKeys.update(keys =>
      keys.includes(moveKey) ? keys.filter(key => key !== moveKey) : [...keys, moveKey]
    );
  }

  isSelected(moveKey: string): boolean {
    return this.selectedKeys().includes(moveKey);
  }

  setComparisonType(type: ComparisonType): void {
    this.comparisonType.set(type);
  }

  private extractDataValue(move: MoveDocument): DataValue | undefined {
    const { phase, phaseIndex } = this.comparisonType();
    const movePhase = move.phases?.[phaseIndex];
    if (!movePhase) return undefined;
    return movePhase[phase]?.duration;
  }

  async updatePosition(change: { key: string; relative: number }): Promise<void> {
    const move = this.moves().find(candidate => candidate.semanticKey === change.key);
    if (!move) return;

    const { phase, phaseIndex } = this.comparisonType();
    const currentDuration = this.extractDataValue(move);

    await this.facade.updateMovePhaseDuration({
      moveKey: move.semanticKey,
      phaseIndex,
      phase,
      duration: {
        ...(currentDuration ?? {}),
        relative: change.relative,
      },
    });
  }
}
