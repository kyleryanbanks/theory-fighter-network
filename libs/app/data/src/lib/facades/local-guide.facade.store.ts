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
import { createStage, createStageZone } from '../models/stage';
import { createCharacter } from '../models/character';
import { createMove } from '../models/move';
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
            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
            });

            const game = {
              ...localGuide.entities.game,
              hierarchy: {
                ...localGuide.entities.game.hierarchy,
                stageKeys: [
                  ...localGuide.entities.game.hierarchy.stageKeys,
                  stage.semanticKey,
                ],
              },
              meta: {
                ...localGuide.entities.game.meta,
                lastUpdatedAt: new Date(),
              },
            };

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                game,
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
            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
            });

            const game = {
              ...localGuide.entities.game,
              hierarchy: {
                ...localGuide.entities.game.hierarchy,
                stageKeys: localGuide.entities.game.hierarchy.stageKeys.filter(
                  (key) => key !== stageKey
                ),
              },
              meta: {
                ...localGuide.entities.game.meta,
                lastUpdatedAt: new Date(),
              },
            };

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                game,
                stages: localGuide.entities.stages.filter(
                  (stage) => stage.semanticKey !== stageKey
                ),
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    createStageZone: rxMutation({
      operation: (input: { name: string; stageKey: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const stage = localGuide.entities.stages.find(
              (s) => s.semanticKey === input.stageKey
            );
            if (!stage) {
              throw new Error(`Stage "${input.stageKey}" does not exist.`);
            }

            const zone = createStageZone({
              gameKey: localGuide.entities.game.semanticKey,
              stageKey: input.stageKey,
              name: input.name,
            });

            if (
              localGuide.entities.stageZones.some(
                (existing) => existing.semanticKey === zone.semanticKey
              )
            ) {
              throw new Error(`Zone "${zone.name}" already exists in this Stage.`);
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'stageZone',
              entityKey: zone.semanticKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'stage',
              entityKey: stage.semanticKey,
            });

            const updatedStage = {
              ...stage,
              hierarchy: {
                ...stage.hierarchy,
                zoneKeys: [...stage.hierarchy.zoneKeys, zone.semanticKey],
              },
              meta: {
                ...stage.meta,
                lastUpdatedAt: new Date(),
              },
            };

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                stages: localGuide.entities.stages.map((s) =>
                  s.semanticKey === stage.semanticKey ? updatedStage : s
                ),
                stageZones: [...localGuide.entities.stageZones, zone],
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    deleteStageZone: rxMutation({
      operation: ({ stageZoneKey }: { stageZoneKey: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const zone = localGuide.entities.stageZones.find(
              (z) => z.semanticKey === stageZoneKey
            );
            if (!zone) {
              throw new Error(`Zone "${stageZoneKey}" does not exist.`);
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'stageZone',
              entityKey: stageZoneKey,
            });

            if (zone.stageKey) {
              // Stage-scoped zone
              const stage = localGuide.entities.stages.find(
                (s) => s.semanticKey === zone.stageKey
              );
              if (!stage) {
                throw new Error(
                  `Stage "${zone.stageKey}" for zone "${stageZoneKey}" not found.`
                );
              }

              markEntityUnsaved(guide, {
                entityType: 'stage',
                entityKey: stage.semanticKey,
              });

              const updatedStage = {
                ...stage,
                hierarchy: {
                  ...stage.hierarchy,
                  zoneKeys: stage.hierarchy.zoneKeys.filter(
                    (key) => key !== stageZoneKey
                  ),
                },
                meta: {
                  ...stage.meta,
                  lastUpdatedAt: new Date(),
                },
              };

              return {
                ...localGuide,
                guide,
                entities: {
                  ...localGuide.entities,
                  stages: localGuide.entities.stages.map((s) =>
                    s.semanticKey === stage.semanticKey ? updatedStage : s
                  ),
                  stageZones: localGuide.entities.stageZones.filter(
                    (z) => z.semanticKey !== stageZoneKey
                  ),
                },
              };
            } else {
              // Game-level universal zone
              markEntityUnsaved(guide, {
                entityType: 'game',
                entityKey: localGuide.entities.game.semanticKey,
              });

              const game = {
                ...localGuide.entities.game,
                universal: {
                  ...localGuide.entities.game.universal,
                  stageZoneKeys: localGuide.entities.game.universal.stageZoneKeys.filter(
                    (key) => key !== stageZoneKey
                  ),
                },
                meta: {
                  ...localGuide.entities.game.meta,
                  lastUpdatedAt: new Date(),
                },
              };

              return {
                ...localGuide,
                guide,
                entities: {
                  ...localGuide.entities,
                  game,
                  stageZones: localGuide.entities.stageZones.filter(
                    (z) => z.semanticKey !== stageZoneKey
                  ),
                },
              };
            }
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    createCharacter: rxMutation({
      operation: (input: { name: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());

            const character = createCharacter({
              gameKey: localGuide.entities.game.semanticKey,
              name: input.name,
            });

            if (
              localGuide.entities.characters.some(
                (existing) => existing.semanticKey === character.semanticKey
              )
            ) {
              throw new Error(
                `Character "${character.name}" already exists.`
              );
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'character',
              entityKey: character.semanticKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
            });

            const game = {
              ...localGuide.entities.game,
              hierarchy: {
                ...localGuide.entities.game.hierarchy,
                characterKeys: [
                  ...localGuide.entities.game.hierarchy.characterKeys,
                  character.semanticKey,
                ],
              },
              meta: {
                ...localGuide.entities.game.meta,
                lastUpdatedAt: new Date(),
              },
            };

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                game,
                characters: [...localGuide.entities.characters, character],
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    deleteCharacter: rxMutation({
      operation: ({ characterKey }: { characterKey: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            if (
              !localGuide.entities.characters.some(
                (character) => character.semanticKey === characterKey
              )
            ) {
              throw new Error(`Character "${characterKey}" does not exist.`);
            }
            if (
              localGuide.entities.moves.some(
                (move) => move.characterKey === characterKey
              ) ||
              localGuide.entities.sequences.some(
                (sequence) => sequence.characterKey === characterKey
              ) ||
              localGuide.entities.projectiles.some(
                (projectile) => projectile.characterKey === characterKey
              )
            ) {
              throw new Error(
                'A Character with local moves, sequences, or projectiles cannot be deleted.'
              );
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'character',
              entityKey: characterKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
            });

            const game = {
              ...localGuide.entities.game,
              hierarchy: {
                ...localGuide.entities.game.hierarchy,
                characterKeys:
                  localGuide.entities.game.hierarchy.characterKeys.filter(
                    (key) => key !== characterKey
                  ),
              },
              meta: {
                ...localGuide.entities.game.meta,
                lastUpdatedAt: new Date(),
              },
            };

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                game,
                characters: localGuide.entities.characters.filter(
                  (character) => character.semanticKey !== characterKey
                ),
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    createMove: rxMutation({
      operation: (input: { name: string; characterKey?: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            let character;

            if (input.characterKey) {
              character = localGuide.entities.characters.find(
                (c) => c.semanticKey === input.characterKey
              );
              if (!character) {
                throw new Error(
                  `Character "${input.characterKey}" does not exist.`
                );
              }
            }

            const move = createMove({
              gameKey: localGuide.entities.game.semanticKey,
              characterKey: input.characterKey,
              name: input.name,
            });

            if (
              localGuide.entities.moves.some(
                (existing) => existing.semanticKey === move.semanticKey
              )
            ) {
              throw new Error(`Move "${move.name}" already exists in this scope.`);
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'move',
              entityKey: move.semanticKey,
            });

            if (character) {
              markEntityUnsaved(guide, {
                entityType: 'character',
                entityKey: character.semanticKey,
              });

              const updatedCharacter = {
                ...character,
                hierarchy: {
                  ...character.hierarchy,
                  moveKeys: [...character.hierarchy.moveKeys, move.semanticKey],
                },
                meta: {
                  ...character.meta,
                  lastUpdatedAt: new Date(),
                },
              };

              return {
                ...localGuide,
                guide,
                entities: {
                  ...localGuide.entities,
                  characters: localGuide.entities.characters.map((c) =>
                    c.semanticKey === character.semanticKey
                      ? updatedCharacter
                      : c
                  ),
                  moves: [...localGuide.entities.moves, move],
                },
              };
            }

            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
            });

            const game = {
              ...localGuide.entities.game,
              universal: {
                ...localGuide.entities.game.universal,
                moveKeys: [
                  ...localGuide.entities.game.universal.moveKeys,
                  move.semanticKey,
                ],
              },
              meta: {
                ...localGuide.entities.game.meta,
                lastUpdatedAt: new Date(),
              },
            };

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                game,
                moves: [...localGuide.entities.moves, move],
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    deleteMove: rxMutation({
      operation: ({ moveKey }: { moveKey: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const move = localGuide.entities.moves.find(
              (m) => m.semanticKey === moveKey
            );
            if (!move) {
              throw new Error(`Move "${moveKey}" does not exist.`);
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'move',
              entityKey: moveKey,
            });

            if (move.characterKey) {
              const character = localGuide.entities.characters.find(
                (c) => c.semanticKey === move.characterKey
              );
              if (!character) {
                throw new Error(
                  `Character "${move.characterKey}" for move "${moveKey}" not found.`
                );
              }

              markEntityUnsaved(guide, {
                entityType: 'character',
                entityKey: character.semanticKey,
              });

              const updatedCharacter = {
                ...character,
                hierarchy: {
                  ...character.hierarchy,
                  moveKeys: character.hierarchy.moveKeys.filter(
                    (key) => key !== moveKey
                  ),
                },
                meta: {
                  ...character.meta,
                  lastUpdatedAt: new Date(),
                },
              };

              return {
                ...localGuide,
                guide,
                entities: {
                  ...localGuide.entities,
                  characters: localGuide.entities.characters.map((c) =>
                    c.semanticKey === character.semanticKey
                      ? updatedCharacter
                      : c
                  ),
                  moves: localGuide.entities.moves.filter(
                    (m) => m.semanticKey !== moveKey
                  ),
                },
              };
            }

            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
            });

            const game = {
              ...localGuide.entities.game,
              universal: {
                ...localGuide.entities.game.universal,
                moveKeys: localGuide.entities.game.universal.moveKeys.filter(
                  (key) => key !== moveKey
                ),
              },
              meta: {
                ...localGuide.entities.game.meta,
                lastUpdatedAt: new Date(),
              },
            };

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                game,
                moves: localGuide.entities.moves.filter(
                  (m) => m.semanticKey !== moveKey
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