import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { GuideProgressStore, LocalGuideFacadeStore } from '@tfn/app-shell/data';
import { ProgressMeter, TodoQuickAdd } from '@tfn/shared/ui';
import { EstimateDialog, type EstimateKind } from './estimate-dialog';

@Component({
  selector: 'tfn-guide-home',
  imports: [MatDialogModule, ProgressMeter, RouterLink, TodoQuickAdd],
  templateUrl: './guide-home.html',
  styleUrl: './guide-home.css',
})
export class GuideHome {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly progress = inject(GuideProgressStore);
  private readonly dialog = inject(MatDialog);
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
  openEstimateDialog(stepKey: string, expectedCount?: number): void {
    const kindByStep: Record<string, EstimateKind> = {
      'character-count': 'characters',
      'stage-count': 'stages',
      'universal-move-count': 'universalMoves',
      'character-move-count': 'characterMoves',
    };
    const kind = kindByStep[stepKey];
    if (!kind) return;
    this.dialog.open(EstimateDialog, {
      data: { kind, characters: this.characters(), expectedCount },
      ariaModal: true,
      ariaLabelledBy: 'estimate-title',
      width: 'min(28rem, calc(100vw - 2rem))',
    });
  }

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
