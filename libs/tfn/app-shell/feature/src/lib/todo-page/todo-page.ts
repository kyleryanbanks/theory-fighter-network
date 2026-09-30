import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LocalGuideFacadeStore,
  ResearchValuesStore,
  TodoStore,
  resolveTodoEstimate,
  type EntityRef,
  type TodoEstimateKey,
  type TodoTracking,
} from '@tfn/app-shell/data';
import { ProgressMeter, TodoQuickAdd } from '@tfn/shared/ui';

@Component({
  selector: 'tfn-todo-page',
  imports: [DatePipe, RouterLink, ProgressMeter, TodoQuickAdd],
  templateUrl: './todo-page.html',
  styleUrl: './todo-page.css',
})
export class TodoPage {
  readonly todos = inject(TodoStore);
  readonly facade = inject(LocalGuideFacadeStore);
  readonly research = inject(ResearchValuesStore);
  readonly characters = computed(
    () => this.facade.guide()?.entities.characters ?? [],
  );
  readonly trackingEntities = computed(() => {
    const entities = this.facade.guide()?.entities;
    if (!entities) return [];
    return [
      {
        entityType: 'game' as const,
        entityKey: entities.game.semanticKey,
        label: `Game · ${entities.game.name}`,
      },
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
  readonly estimateKind = signal<EstimateKind | null>(null);
  readonly estimateValue = signal('');
  readonly estimateCharacterKey = signal('');
  readonly estimateError = signal('');

  trackedTotal(tracking: TodoTracking): number | undefined {
    return resolveTodoEstimate(tracking, this.research.research());
  }

  trackingLabel(tracking: TodoTracking): string {
    if (tracking.type === 'estimated-count') {
      return tracking.scopeKey
        ? `Estimated ${tracking.key} · ${tracking.scopeKey}`
        : `Estimated ${tracking.key}`;
    }
    return `${tracking.entityType} · ${tracking.entityKey}`;
  }

  openEstimateDialog(tracking: TodoTracking): void {
    if (tracking.type !== 'estimated-count') return;
    const kindByKey: Record<TodoEstimateKey, EstimateKind> = {
      'character-count': 'characters',
      'stage-count': 'stages',
      'universal-move-count': 'universalMoves',
      'character-move-count': 'characterMoves',
    };
    this.estimateKind.set(kindByKey[tracking.key]);
    this.estimateValue.set('');
    this.estimateCharacterKey.set(
      tracking.scopeKey || this.characters()[0]?.semanticKey || '',
    );
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
      const result = await this.research.setExpectedCharacterMoves({
        characterKey: this.estimateCharacterKey(),
        count: value,
      });
      if (result.status === 'error') {
        this.estimateError.set('The estimate could not be saved.');
        return;
      }
    } else {
      const result = await this.research.setExpectedCount({
        kind,
        count: value,
      });
      if (result.status === 'error') {
        this.estimateError.set('The estimate could not be saved.');
        return;
      }
    }
    this.closeEstimateDialog();
  }

  routeFor(ref: EntityRef): string {
    const paths: Record<EntityRef['entityType'], string> = {
      game: 'game',
      stage: 'stages',
      stageZone: 'zones',
      character: 'characters',
      team: 'teams',
      move: 'moves',
      sequence: 'sequences',
      projectile: 'projectiles',
      matchup: 'matchups',
    };
    return `/${paths[ref.entityType]}/${ref.entityKey}`;
  }

  async toggle(todoId: string, done: boolean): Promise<void> {
    if (done) await this.todos.reopen(todoId);
    else await this.todos.complete(todoId);
  }

  async remove(todoId: string): Promise<void> {
    await this.todos.delete(todoId);
  }
}

type EstimateKind =
  | 'characters'
  | 'stages'
  | 'universalMoves'
  | 'characterMoves';
