import {
  InjectionToken,
  computed,
  inject,
} from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMutation, withMutations } from '@angular-architects/ngrx-toolkit';
import { from, of } from 'rxjs';
import {
  createGuideJson,
  markEntityUnsaved,
  type LocalGuide,
} from '../guide';
import {
  createGame,
  updateGameMetadata,
  type CreateGameInput,
  type GameMetadataUpdate,
} from '../models/game';
import { createStage } from '../models/stage';
import {
  buildArchiveFile,
  parseArchiveFile,
} from '../persistence/local-guide-web';

/**
 * Port abstraction for local guide persistence.
 *
 * The facade store depends on this interface instead of concrete IO helpers,
 * which keeps orchestration testable and allows swapping implementations.
 */
export interface LocalGuidePersistencePort {
  parseArchiveFile(archiveFile: File): Promise<LocalGuide>;
  buildArchiveFile(
    guide: LocalGuide,
    fileName?: string
  ): Promise<File>;
}

/**
 * Default browser persistence adapter used in runtime.
 */
const DEFAULT_LOCAL_GUIDE_PERSISTENCE: LocalGuidePersistencePort = {
  parseArchiveFile,
  buildArchiveFile: async (guide, fileName) =>
    buildArchiveFile(guide, fileName),
};

/**
 * Injection token used to provide persistence implementation to the facade.
 */
export const TFN_LOCAL_GUIDE_PERSISTENCE =
  new InjectionToken<LocalGuidePersistencePort>(
    'TFN_LOCAL_GUIDE_PERSISTENCE',
    {
      providedIn: 'root',
      factory: () => DEFAULT_LOCAL_GUIDE_PERSISTENCE,
    }
  );

type LocalGuideFacadeState = {
  value: LocalGuide | undefined;
};

type CreateGuideInput = CreateGameInput;

/**
 * Primary data-layer facade for local guide workflows.
 *
 * Pattern:
 * - State: active in-memory Guide loaded from or saved to a `.tfn` file.
 * - Mutations: explicit commands (create/update/import/export).
 * - Computed signals: derived view state for feature components.
 */
export const LocalGuideFacadeStore = signalStore(
  { providedIn: 'root' },
  withState<LocalGuideFacadeState>({
    value: undefined,
  }),
  withProps(() => ({
    persistence: inject(TFN_LOCAL_GUIDE_PERSISTENCE),
  })),
  // Mutations are command handlers for local guide workflows.
  withMutations((store) => ({
    createGuide: rxMutation({
      operation: (input: CreateGuideInput) =>
        of(buildInitialGuide(input)),
      onSuccess: (guide) => {
        patchState(store, { value: guide });
      },
    }),

    updateActiveGame: rxMutation({
      operation: (updates: GameMetadataUpdate) =>
        from(
          (async () => {
            const localGuide = store.value();
            if (!localGuide) {
              throw new Error('No active Guide to update.');
            }

            const game = updateGameMetadata(localGuide.entities.game, updates);
            const guide = {
              ...localGuide.guide,
              localChanges: [...localGuide.guide.localChanges],
              syncedChanges: [...localGuide.guide.syncedChanges],
              unsavedStatus: { ...localGuide.guide.unsavedStatus },
            };
            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: game.semanticKey,
            });

            return {
              ...localGuide,
              guide,
              entities: { ...localGuide.entities, game },
            };
          })()
        ),
      onSuccess: (guide) => {
        patchState(store, { value: guide });
      },
    }),

    createStage: rxMutation({
      operation: ({ name }: { name: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const stage = createStage({
              gameKey: localGuide.entities.game.semanticKey,
              name,
            });

            if (
              localGuide.entities.stages.some(
                (existing) => existing.semanticKey === stage.semanticKey
              )
            ) {
              throw new Error(`Stage "${stage.name}" already exists.`);
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'stage',
              entityKey: stage.semanticKey,
            });

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                stages: [...localGuide.entities.stages, stage],
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    deleteStage: rxMutation({
      operation: ({ stageKey }: { stageKey: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            if (
              !localGuide.entities.stages.some(
                (stage) => stage.semanticKey === stageKey
              )
            ) {
              throw new Error(`Stage "${stageKey}" does not exist.`);
            }
            if (
              localGuide.entities.stageZones.some(
                (zone) => zone.stageKey === stageKey
              )
            ) {
              throw new Error('A Stage with local zones cannot be deleted.');
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'stage',
              entityKey: stageKey,
            });

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                stages: localGuide.entities.stages.filter(
                  (stage) => stage.semanticKey !== stageKey
                ),
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    importArchive: rxMutation({
      operation: (archiveFile: File) =>
        from(store.persistence.parseArchiveFile(archiveFile)),
      onSuccess: (guide) => {
        patchState(store, { value: guide });
      },
    }),

    exportArchive: rxMutation({
      operation: ({ fileName }: { fileName?: string }) =>
        from(
          (async () => {
            const guide = store.value();

            if (!guide) {
              throw new Error('No active Guide to export.');
            }

            return store.persistence.buildArchiveFile(
              guide,
              fileName
            );
          })()
        ),
    }),
  })),
  withMethods((store) => ({
    /**
    * Clears the active in-memory Guide.
     */
    clearActiveGuide(): void {
      patchState(store, { value: undefined });
    },
  })),
  // Computed helpers keep feature components declarative and thin.
  withComputed((store) => ({
    guide: computed(() => store.value()),
    hasGuide: computed(() => !!store.value()),
    isBusy: computed(
      () =>
        store.createGuideIsPending() ||
        store.updateActiveGameIsPending() ||
        store.importArchiveIsPending() ||
        store.exportArchiveIsPending()
    ),
  }))
);

/**
 * Creates a minimal initialized Guide.
 */
function buildInitialGuide(
  input: CreateGuideInput
): LocalGuide {
  const game = createGame(input);

  return {
    guide: createGuideJson({ gameKey: game.semanticKey }),
    entities: {
      game,
      stages: [],
      stageZones: [],
      characters: [],
      teams: [],
      moves: [],
      sequences: [],
      projectiles: [],
      matchups: [],
    },
  };
}

function requireGuide(
  guide: LocalGuide | undefined
): LocalGuide {
  if (!guide) {
    throw new Error('No active Guide.');
  }
  return guide;
}

function cloneGuideMetadata(localGuide: LocalGuide) {
  return {
    ...localGuide.guide,
    localChanges: [...localGuide.guide.localChanges],
    syncedChanges: [...localGuide.guide.syncedChanges],
    unsavedStatus: { ...localGuide.guide.unsavedStatus },
  };
}