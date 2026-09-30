import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  GuideProgressStore,
  LocalGuideFacadeStore,
  ResearchValuesStore,
  TodoStore,
  calculateCountProgress,
  type GuideTodo,
  type ProgressResult,
  type TodoEstimateKey,
  type TodoTracker,
  type TodoTracking,
} from '@tfn/app-shell/data';
import { ProgressMeter, TodoQuickAdd } from '@tfn/shared/ui';

@Component({
  selector: 'tfn-guide-home',
  imports: [RouterLink, ProgressMeter, TodoQuickAdd],
  templateUrl: './guide-home.html',
  styleUrl: './guide-home.css',
})
export class GuideHome {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly progress = inject(GuideProgressStore);
  readonly todos = inject(TodoStore);
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
  readonly trackerManagerOpen = signal(false);
  readonly estimateKey = signal<TodoEstimateKey | null>(null);
  readonly estimateValue = signal('');
  readonly estimateError = signal('');
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
  readonly trackerSteps = computed<TrackerStep[]>(() => {
    const aggregateTrackers = this.progress
      .taskProgress()
      .flatMap((task) => task.steps)
      .map((step) => ({
        id: `guide-progress-${step.key}`,
        title: step.title,
        progress: step.progress,
        tracking: {
          type: 'estimated-count' as const,
          key: step.key as TodoEstimateKey,
        },
        tracker: {
          type: 'guide-progress' as const,
          key: step.key as TodoEstimateKey,
        },
      }));
    const guide = this.facade.guide();
    if (!guide) return aggregateTrackers;
    const entityTrackers = guide.entities.characters.flatMap((character) => {
      const completion = this.progress.fieldCompletion(
        'character',
        character.semanticKey,
      );
      if (!completion) return [];
      const moveCount = calculateCountProgress(
        `${character.name} Moves`,
        guide.entities.moves.filter(
          (move) => move.characterKey === character.semanticKey,
        ).length,
        this.research.research().movesByCharacter?.[character.semanticKey],
      );
      return [
        {
          id: `entity-completion-character-${character.semanticKey}`,
          title: `${character.name} completion`,
          progress: completion,
          tracking: {
            type: 'entity' as const,
            entityType: 'character' as const,
            entityKey: character.semanticKey,
          },
          tracker: {
            type: 'entity-completion' as const,
            entityType: 'character' as const,
            entityKey: character.semanticKey,
          },
        },
        {
          id: `character-move-count-${character.semanticKey}`,
          title: `${character.name} move count`,
          progress: moveCount,
          tracking: {
            type: 'estimated-count' as const,
            key: 'character-move-count' as const,
            scopeKey: character.semanticKey,
          },
          tracker: {
            type: 'guide-progress' as const,
            key: 'character-move-count' as const,
            scopeKey: character.semanticKey,
          },
        },
      ];
    });
    return [...aggregateTrackers, ...entityTrackers];
  });

  isPinnedTracker(step: TrackerStep): boolean {
    return this.todos
      .todos()
      .some((todo) => this.isTrackerMatch(todo, step.tracker));
  }

  async toggleTracker(step: TrackerStep): Promise<void> {
    const pinnedTodos = this.todos
      .todos()
      .filter((todo) => this.isTrackerMatch(todo, step.tracker));
    if (pinnedTodos.length) {
      await Promise.all(pinnedTodos.map((todo) => this.todos.delete(todo.id)));
      return;
    }
    await this.todos.createTracked({
      text: `TODO: ${step.tracking.type === 'entity' ? 'Complete ' : ''}${step.title}`,
      tracking: step.tracking,
      tracker: step.tracker,
    });
  }

  async pinAllTrackers(): Promise<void> {
    for (const step of this.trackerSteps()) {
      if (!this.isPinnedTracker(step)) {
        await this.toggleTracker(step);
      }
    }
  }

  async unpinAllTrackers(): Promise<void> {
    for (const step of this.trackerSteps()) {
      if (this.isPinnedTracker(step)) {
        await this.toggleTracker(step);
      }
    }
  }

  private isTrackerMatch(todo: GuideTodo, tracker: TodoTracker): boolean {
    const todoTracker = todo.tracker;
    if (!todoTracker || todoTracker.type !== tracker.type) return false;
    if (tracker.type === 'guide-progress') {
      if (todoTracker.type !== 'guide-progress') return false;
      return (
        todoTracker.key === tracker.key &&
        todoTracker.scopeKey === tracker.scopeKey
      );
    }
    if (todoTracker.type !== 'entity-completion') return false;
    return (
      todoTracker.entityType === tracker.entityType &&
      todoTracker.entityKey === tracker.entityKey
    );
  }

  openEstimateDialog(key: TodoEstimateKey): void {
    this.estimateKey.set(key);
    this.estimateValue.set('');
    this.estimateError.set('');
  }

  closeEstimateDialog(): void {
    this.estimateKey.set(null);
    this.estimateError.set('');
  }

  async saveEstimate(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const key = this.estimateKey();
    const value = Number(this.estimateValue());
    if (!key || !Number.isInteger(value) || value < 0) {
      this.estimateError.set('Enter a whole number of zero or greater.');
      return;
    }
    const kindByKey: Record<
      Exclude<TodoEstimateKey, 'character-move-count'>,
      'characters' | 'stages' | 'universalMoves'
    > = {
      'character-count': 'characters',
      'stage-count': 'stages',
      'universal-move-count': 'universalMoves',
    };
    if (key === 'character-move-count') {
      this.estimateError.set(
        'Set character move estimates from the TODO page.',
      );
      return;
    }
    const result = await this.research.setExpectedCount({
      kind: kindByKey[key],
      count: value,
    });
    if (result.status === 'error') {
      this.estimateError.set('The estimate could not be saved.');
      return;
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

type TrackerStep = {
  id: string;
  title: string;
  progress: ProgressResult;
  tracking: TodoTracking;
  tracker: TodoTracker;
};
