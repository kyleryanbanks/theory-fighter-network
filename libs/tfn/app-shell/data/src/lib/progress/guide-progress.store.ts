import { computed, inject } from '@angular/core';
import {
  signalStore,
  withComputed,
  withMethods,
  withProps,
} from '@ngrx/signals';
import { LocalGuideFacadeStore } from '../facades/local-guide.facade.store';
import type { EntityType, LocalGuide } from '../guide';
import { ResearchValuesStore } from '../workspace/research/research-values.store';
import { createHelperTasks } from './helper-tasks';
import {
  calculateFieldCompletion,
  createFieldDescriptors,
} from './field-completion';
import { calculateMatchupCoverage } from './matchup-coverage';

export const GuideProgressStore = signalStore(
  { providedIn: 'root' },
  withProps(() => ({
    facade: inject(LocalGuideFacadeStore),
    researchStore: inject(ResearchValuesStore),
  })),
  withComputed((store) => ({
    tasks: computed(() => createHelperTasks(store.researchStore.research())),
    taskProgress: computed(() => {
      const guide = store.facade.value();
      if (!guide) return [];
      return createHelperTasks(store.researchStore.research()).map((task) => ({
        ...task,
        steps: task.steps.map((step) => ({
          ...step,
          progress: step.getProgress(guide),
        })),
      }));
    }),
  })),
  withMethods((store) => ({
    fieldCompletion(
      entityType: Extract<
        EntityType,
        'character' | 'move' | 'stage' | 'matchup'
      >,
      entityKey: string,
    ) {
      const guide = store.facade.value();
      if (!guide) return undefined;
      const entity = findEntity(guide, entityType, entityKey);
      if (!entity) return undefined;
      return calculateFieldCompletion(
        entity as never,
        createFieldDescriptors(entityType) as never,
      );
    },

    matchupCoverage(matchupKey: string) {
      const guide = store.facade.value();
      const matchup = guide?.entities.matchups.find(
        (candidate) => candidate.semanticKey === matchupKey,
      );
      if (!guide || !matchup) return undefined;
      return calculateMatchupCoverage({
        moves: guide.entities.moves,
        sequences: guide.entities.sequences,
        matchup,
      });
    },
  })),
);

function findEntity(
  guide: LocalGuide,
  entityType: Extract<EntityType, 'character' | 'move' | 'stage' | 'matchup'>,
  entityKey: string,
): unknown {
  switch (entityType) {
    case 'character':
      return guide.entities.characters.find(
        (entity) => entity.semanticKey === entityKey,
      );
    case 'move':
      return guide.entities.moves.find(
        (entity) => entity.semanticKey === entityKey,
      );
    case 'stage':
      return guide.entities.stages.find(
        (entity) => entity.semanticKey === entityKey,
      );
    case 'matchup':
      return guide.entities.matchups.find(
        (entity) => entity.semanticKey === entityKey,
      );
  }
}
