import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  GuideProgressStore,
  LocalGuideFacadeStore,
  ResearchValuesStore,
} from '@tfn/app-shell/data';
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
  readonly research = inject(ResearchValuesStore);
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
  readonly estimateKind = signal<EstimateKind | null>(null);
  readonly estimateValue = signal('');
  readonly estimateCharacterKey = signal('');
  readonly estimateError = signal('');

  estimateLabel(): string {
    if (this.estimateKind() === 'universalMoves') return 'universal Moves';
    if (this.estimateKind() === 'characterMoves') {
      const character = this.characters().find(
        (item) => item.semanticKey === this.estimateCharacterKey(),
      );
      return `${character?.name ?? 'character'} Moves`;
    }
    return this.estimateKind() ?? '';
  }

  openEstimateDialog(stepKey: string): void {
    const kindByStep: Record<string, EstimateKind> = {
      'character-count': 'characters',
      'stage-count': 'stages',
      'universal-move-count': 'universalMoves',
      'character-move-count': 'characterMoves',
    };
    const kind = kindByStep[stepKey];
    if (!kind) return;
    this.estimateKind.set(kind);
    this.estimateValue.set('');
    this.estimateCharacterKey.set(this.characters()[0]?.semanticKey ?? '');
    this.estimateError.set('');
  }

  closeEstimateDialog(): void {
    this.estimateKind.set(null);
    this.estimateError.set('');
  }

  async saveEstimate(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const kind = this.estimateKind();
    const value = Number(this.estimateValue());
    if (!kind || !Number.isInteger(value) || value < 0) {
      this.estimateError.set('Enter a whole number of zero or greater.');
      return;
    }

    if (kind === 'characterMoves') {
      if (!this.estimateCharacterKey()) {
        this.estimateError.set('Select a character first.');
        return;
      }
      const setExpectedCharacterMoves =
        this.research.setExpectedCharacterMoves as unknown as (
          characterKey: string,
          count: number,
        ) => Promise<{ status: string; error?: unknown }>;
      const result = await setExpectedCharacterMoves(
        this.estimateCharacterKey(),
        value,
      );
      if (result.status === 'error') {
        this.estimateError.set('The estimate could not be saved.');
        return;
      }
    } else {
      const setExpectedCount = this.research.setExpectedCount as unknown as (
        kind: 'characters' | 'stages' | 'universalMoves',
        count: number,
      ) => Promise<{ status: string; error?: unknown }>;
      const result = await setExpectedCount(kind, value);
      if (result.status === 'error') {
        this.estimateError.set('The estimate could not be saved.');
        return;
      }
    }
    this.closeEstimateDialog();
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

type EstimateKind =
  | 'characters'
  | 'stages'
  | 'universalMoves'
  | 'characterMoves';
