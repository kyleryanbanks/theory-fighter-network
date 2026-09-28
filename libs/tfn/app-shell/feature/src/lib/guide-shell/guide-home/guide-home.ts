import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GuideProgressStore, LocalGuideFacadeStore } from '@tfn/app-shell/data';
import { ProgressMeter, TodoQuickAdd } from '@tfn/shared/ui';

@Component({
  selector: 'tfn-guide-home',
  imports: [ProgressMeter, RouterLink, TodoQuickAdd],
  templateUrl: './guide-home.html',
  styleUrl: './guide-home.css',
})
export class GuideHome {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly progress = inject(GuideProgressStore);
  private readonly router = inject(Router);
  readonly creationTypes: Array<{ key: CreationType; label: string }> = [
    { key: 'character', label: 'Character' },
    { key: 'move', label: 'Move' },
    { key: 'stage', label: 'Stage' },
    { key: 'sequence', label: 'Sequence' },
    { key: 'team', label: 'Team' },
    { key: 'matchup', label: 'Matchup' },
  ];
  readonly selectedCreationType = signal<CreationType>('character');
  readonly selectedCreationScope = signal('');
  readonly characters = computed(
    () => this.facade.guide()?.entities.characters ?? [],
  );

  needsCreationScope(): boolean {
    return (
      this.selectedCreationType() === 'move' ||
      this.selectedCreationType() === 'sequence'
    );
  }

  async openCreationEditor(): Promise<void> {
    const pathByType: Record<CreationType, string> = {
      character: 'characters',
      move: 'moves',
      stage: 'stages',
      sequence: 'sequences',
      team: 'teams',
      matchup: 'matchups',
    };
    const scope = this.selectedCreationScope();
    await this.router.navigate([pathByType[this.selectedCreationType()]], {
      queryParams:
        this.needsCreationScope() && scope ? { characterKey: scope } : {},
    });
  }
}

type CreationType =
  | 'character'
  | 'move'
  | 'stage'
  | 'sequence'
  | 'team'
  | 'matchup';
