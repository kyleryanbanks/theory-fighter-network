import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { ComparisonAxis, TfnLink } from '@theory-fighter-network/ui';

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
  readonly selectedMoves = computed(() =>
    this.moves().filter(move => this.selectedKeys().includes(move.semanticKey))
  );
  readonly pins = computed(() =>
    this.selectedMoves().map(move => ({
      key: move.semanticKey,
      label: move.name,
      relative: move.phases?.[0]?.startup?.duration?.relative ?? 50,
      exact: move.phases?.[0]?.startup?.duration?.exact,
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

  async updatePosition(change: { key: string; relative: number }): Promise<void> {
    const move = this.moves().find(candidate => candidate.semanticKey === change.key);
    if (!move) return;
    await this.facade.updateMovePhaseDuration({
      moveKey: move.semanticKey,
      phaseIndex: 0,
      phase: 'startup',
      duration: {
        ...(move.phases?.[0]?.startup?.duration ?? {}),
        relative: change.relative,
      },
    });
  }
}
