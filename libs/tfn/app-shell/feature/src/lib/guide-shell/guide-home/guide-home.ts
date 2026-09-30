import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  GuideProgressStore,
  LocalGuideFacadeStore,
  TodoStore,
  type TodoEstimateKey,
} from '@tfn/app-shell/data';
import { TodoQuickAdd } from '@tfn/shared/ui';

@Component({
  selector: 'tfn-guide-home',
  imports: [RouterLink, TodoQuickAdd],
  templateUrl: './guide-home.html',
  styleUrl: './guide-home.css',
})
export class GuideHome {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly progress = inject(GuideProgressStore);
  readonly todos = inject(TodoStore);
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
  readonly trackingEntities = computed(() => {
    const entities = this.facade.guide()?.entities;
    if (!entities) return [];
    return [
      ...entities.characters.map((entity) => ({
        entityType: 'character' as const,
        entityKey: entity.semanticKey,
        label: `Character · ${entity.name}`,
      })),
      ...entities.stages.map((entity) => ({
        entityType: 'stage' as const,
        entityKey: entity.semanticKey,
        label: `Stage · ${entity.name}`,
      })),
      ...entities.teams.map((entity) => ({
        entityType: 'team' as const,
        entityKey: entity.semanticKey,
        label: `Team · ${entity.semanticKey}`,
      })),
      ...entities.moves.map((entity) => ({
        entityType: 'move' as const,
        entityKey: entity.semanticKey,
        label: `Move · ${entity.name}`,
      })),
      ...entities.sequences.map((entity) => ({
        entityType: 'sequence' as const,
        entityKey: entity.semanticKey,
        label: `Sequence · ${entity.semanticKey}`,
      })),
      ...entities.projectiles.map((entity) => ({
        entityType: 'projectile' as const,
        entityKey: entity.semanticKey,
        label: `Projectile · ${entity.semanticKey}`,
      })),
      ...entities.matchups.map((entity) => ({
        entityType: 'matchup' as const,
        entityKey: entity.semanticKey,
        label: `Matchup · ${entity.semanticKey}`,
      })),
    ];
  });
  async populateTodos(): Promise<void> {
    const existingKeys = new Set(
      this.todos
        .todos()
        .map((todo) =>
          todo.tracking?.type === 'estimated-count'
            ? todo.tracking.key
            : undefined,
        )
        .filter((key): key is TodoEstimateKey => Boolean(key)),
    );
    for (const task of this.progress.tasks()) {
      for (const step of task.steps) {
        const key = step.key as TodoEstimateKey;
        if (existingKeys.has(key)) continue;
        await this.todos.createTracked({
          text: `TODO: ${step.title}`,
          tracking: { type: 'estimated-count', key },
        });
        existingKeys.add(key);
      }
    }
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
