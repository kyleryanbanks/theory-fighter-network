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
  type EntityType,
  type LocalGuide,
  type LocalGuideEntities,
} from '../guide';
import {
  createGame,
  updateGameMetadata,
  type CreateGameInput,
  type GameMetadataUpdate,
} from '../models/game';
import { createStage, createStageZone } from '../models/stage';
import { createCharacter } from '../models/character';
import { createMove, resolveEffectiveMove } from '../models/move';
import type { MovePhase } from '../models/move';
import { createSequence } from '../models/sequence';
import { createTeam } from '../models/team';
import {
  createMatchup,
  createMatchupScenarioEntry,
  createScenarioResponseEntry,
} from '../models/matchup';
import { createNoteEntry, type DataValue, type EntityMetadata } from '../models/shared';
import type { Step } from '../models/move';
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
      operation: (input: { name: string; stageKey?: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            let stage;

            if (input.stageKey) {
              stage = localGuide.entities.stages.find(
                (s) => s.semanticKey === input.stageKey
              );
              if (!stage) {
                throw new Error(`Stage "${input.stageKey}" does not exist.`);
              }
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
              throw new Error(`Zone "${zone.name}" already exists in this scope.`);
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'stageZone',
              entityKey: zone.semanticKey,
            });

            if (stage) {
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
            }

            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
            });

            const game = {
              ...localGuide.entities.game,
              universal: {
                ...localGuide.entities.game.universal,
                stageZoneKeys: [
                  ...localGuide.entities.game.universal.stageZoneKeys,
                  zone.semanticKey,
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
                stageZones: [...localGuide.entities.stageZones, zone],
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    overrideStageZone: rxMutation({
      operation: (input: { stageKey: string; universalZoneKey: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const stage = localGuide.entities.stages.find(
              (s) => s.semanticKey === input.stageKey
            );
            if (!stage) {
              throw new Error(`Stage "${input.stageKey}" does not exist.`);
            }

            const universalZone = localGuide.entities.stageZones.find(
              (zone) =>
                zone.semanticKey === input.universalZoneKey && !zone.stageKey
            );
            if (!universalZone) {
              throw new Error(
                `Universal Zone "${input.universalZoneKey}" does not exist.`
              );
            }

            if (
              localGuide.entities.stageZones.some(
                (zone) =>
                  zone.stageKey === stage.semanticKey &&
                  zone.inheritedFromZoneKey === universalZone.semanticKey
              )
            ) {
              throw new Error(
                `Zone "${universalZone.name}" is already overridden for this Stage.`
              );
            }

            const override = createStageZone({
              gameKey: localGuide.entities.game.semanticKey,
              stageKey: stage.semanticKey,
              name: universalZone.name,
              inheritedFromZoneKey: universalZone.semanticKey,
              // mechanicStateKeys stays unset so it live-inherits from the
              // universal Zone until this override customizes it.
            });

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'stageZone',
              entityKey: override.semanticKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'stage',
              entityKey: stage.semanticKey,
            });

            const updatedStage = {
              ...stage,
              hierarchy: {
                ...stage.hierarchy,
                zoneKeys: [...stage.hierarchy.zoneKeys, override.semanticKey],
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
                stageZones: [...localGuide.entities.stageZones, override],
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    promoteStageZone: rxMutation({
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
            if (!zone.stageKey) {
              throw new Error(`Zone "${stageZoneKey}" is already universal.`);
            }
            if (zone.inheritedFromZoneKey) {
              throw new Error(
                'An override cannot be promoted; revert it to Universal first.'
              );
            }

            const stage = localGuide.entities.stages.find(
              (s) => s.semanticKey === zone.stageKey
            );
            if (!stage) {
              throw new Error(`Stage "${zone.stageKey}" not found.`);
            }

            const promoted = createStageZone({
              gameKey: localGuide.entities.game.semanticKey,
              name: zone.name,
              mechanicStateKeys: zone.mechanicStateKeys ?? [],
            });

            if (
              localGuide.entities.stageZones.some(
                (existing) => existing.semanticKey === promoted.semanticKey
              )
            ) {
              throw new Error(
                `A universal Zone named "${zone.name}" already exists.`
              );
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'stageZone',
              entityKey: stageZoneKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'stageZone',
              entityKey: promoted.semanticKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'stage',
              entityKey: stage.semanticKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
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

            const game = {
              ...localGuide.entities.game,
              universal: {
                ...localGuide.entities.game.universal,
                stageZoneKeys: [
                  ...localGuide.entities.game.universal.stageZoneKeys,
                  promoted.semanticKey,
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
                stages: localGuide.entities.stages.map((s) =>
                  s.semanticKey === stage.semanticKey ? updatedStage : s
                ),
                stageZones: [
                  ...localGuide.entities.stageZones.filter(
                    (z) => z.semanticKey !== stageZoneKey
                  ),
                  promoted,
                ],
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

    updateMovePhaseDuration: rxMutation({
      operation: (input: {
        moveKey: string;
        phase: 'startup' | 'active' | 'recovery';
        duration: DataValue;
        phaseIndex?: number;
      }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const move = localGuide.entities.moves.find(
              (candidate) => candidate.semanticKey === input.moveKey
            );
            if (!move) {
              throw new Error(`Move "${input.moveKey}" does not exist.`);
            }

            const phaseIndex = input.phaseIndex ?? 0;
            const effectiveMove = resolveEffectiveMove(move, localGuide.entities.moves);
            const phases = [...(effectiveMove.phases ?? [])];
            while (phases.length <= phaseIndex) {
              phases.push({});
            }
            const currentPhase = phases[phaseIndex] as MovePhase;
            phases[phaseIndex] = {
              ...currentPhase,
              [input.phase]: {
                ...(currentPhase[input.phase] ?? {}),
                duration: input.duration,
              },
            };

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'move',
              entityKey: move.semanticKey,
            });

            const updatedMove = {
              ...move,
              phases,
              meta: { ...move.meta, lastUpdatedAt: new Date() },
            };

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                moves: localGuide.entities.moves.map((candidate) =>
                  candidate.semanticKey === move.semanticKey
                    ? updatedMove
                    : candidate
                ),
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

    promoteMove: rxMutation({
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
            if (!move.characterKey) {
              throw new Error(`Move "${moveKey}" is already universal.`);
            }
            if (move.parentKey) {
              throw new Error(
                'An override cannot be promoted; revert it to Universal first.'
              );
            }

            const character = localGuide.entities.characters.find(
              (c) => c.semanticKey === move.characterKey
            );
            if (!character) {
              throw new Error(`Character "${move.characterKey}" not found.`);
            }

            const promoted = {
              ...createMove({
                gameKey: localGuide.entities.game.semanticKey,
                name: move.name,
              }),
              sequence: move.sequence,
              preconditions: move.preconditions,
              phases: move.phases,
            };

            if (
              localGuide.entities.moves.some(
                (existing) => existing.semanticKey === promoted.semanticKey
              )
            ) {
              throw new Error(
                `A universal Move named "${move.name}" already exists.`
              );
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, { entityType: 'move', entityKey: moveKey });
            markEntityUnsaved(guide, {
              entityType: 'move',
              entityKey: promoted.semanticKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'character',
              entityKey: character.semanticKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
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

            const game = {
              ...localGuide.entities.game,
              universal: {
                ...localGuide.entities.game.universal,
                moveKeys: [
                  ...localGuide.entities.game.universal.moveKeys,
                  promoted.semanticKey,
                ],
              },
              meta: {
                ...localGuide.entities.game.meta,
                lastUpdatedAt: new Date(),
              },
            };

            // Sequences reference Moves by key directly in each Step, so
            // promoting must rewrite every Step that pointed at the old key.
            const sequences = localGuide.entities.sequences.map((sequence) => {
              if (
                !sequence.sequence.some((step) => step.moveKey === moveKey)
              ) {
                return sequence;
              }
              markEntityUnsaved(guide, {
                entityType: 'sequence',
                entityKey: sequence.semanticKey,
              });
              return {
                ...sequence,
                sequence: sequence.sequence.map((step) =>
                  step.moveKey === moveKey
                    ? { ...step, moveKey: promoted.semanticKey }
                    : step
                ),
              };
            });

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                game,
                characters: localGuide.entities.characters.map((c) =>
                  c.semanticKey === character.semanticKey
                    ? updatedCharacter
                    : c
                ),
                moves: [
                  ...localGuide.entities.moves.filter(
                    (m) => m.semanticKey !== moveKey
                  ),
                  promoted,
                ],
                sequences,
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    overrideMove: rxMutation({
      operation: (input: { characterKey: string; universalMoveKey: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const character = localGuide.entities.characters.find(
              (c) => c.semanticKey === input.characterKey
            );
            if (!character) {
              throw new Error(
                `Character "${input.characterKey}" does not exist.`
              );
            }

            const universalMove = localGuide.entities.moves.find(
              (move) =>
                move.semanticKey === input.universalMoveKey &&
                !move.characterKey
            );
            if (!universalMove) {
              throw new Error(
                `Universal Move "${input.universalMoveKey}" does not exist.`
              );
            }

            if (
              localGuide.entities.moves.some(
                (move) =>
                  move.characterKey === character.semanticKey &&
                  move.parentKey === universalMove.semanticKey
              )
            ) {
              throw new Error(
                `Move "${universalMove.name}" is already overridden for this Character.`
              );
            }

            const override = createMove({
              gameKey: localGuide.entities.game.semanticKey,
              characterKey: character.semanticKey,
              name: universalMove.name,
              parentKey: universalMove.semanticKey,
              // sequence/preconditions/phases stay unset so they live-inherit
              // from the universal Move until this override customizes them.
            });

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'move',
              entityKey: override.semanticKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'character',
              entityKey: character.semanticKey,
            });

            const updatedCharacter = {
              ...character,
              hierarchy: {
                ...character.hierarchy,
                moveKeys: [...character.hierarchy.moveKeys, override.semanticKey],
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
                moves: [...localGuide.entities.moves, override],
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    createSequence: rxMutation({
      operation: (input: {
        sequence: Step[];
        characterKey?: string;
        teamKey?: string;
      }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            let character;
            let team;

            if (input.characterKey) {
              character = localGuide.entities.characters.find(
                (c) => c.semanticKey === input.characterKey
              );
              if (!character) {
                throw new Error(
                  `Character "${input.characterKey}" does not exist.`
                );
              }
            } else if (input.teamKey) {
              team = localGuide.entities.teams.find(
                (t) => t.semanticKey === input.teamKey
              );
              if (!team) {
                throw new Error(`Team "${input.teamKey}" does not exist.`);
              }
            }

            const sequence = createSequence({
              gameKey: localGuide.entities.game.semanticKey,
              characterKey: input.characterKey,
              teamKey: input.teamKey,
              sequence: input.sequence,
            });

            if (
              localGuide.entities.sequences.some(
                (existing) => existing.semanticKey === sequence.semanticKey
              )
            ) {
              throw new Error('This Sequence already exists in this scope.');
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'sequence',
              entityKey: sequence.semanticKey,
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
                  sequenceKeys: [
                    ...character.hierarchy.sequenceKeys,
                    sequence.semanticKey,
                  ],
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
                  sequences: [...localGuide.entities.sequences, sequence],
                },
              };
            }

            if (team) {
              markEntityUnsaved(guide, {
                entityType: 'team',
                entityKey: team.semanticKey,
              });

              const updatedTeam = {
                ...team,
                hierarchy: {
                  ...team.hierarchy,
                  sequenceKeys: [
                    ...team.hierarchy.sequenceKeys,
                    sequence.semanticKey,
                  ],
                },
                meta: {
                  ...team.meta,
                  lastUpdatedAt: new Date(),
                },
              };

              return {
                ...localGuide,
                guide,
                entities: {
                  ...localGuide.entities,
                  teams: localGuide.entities.teams.map((t) =>
                    t.semanticKey === team.semanticKey ? updatedTeam : t
                  ),
                  sequences: [...localGuide.entities.sequences, sequence],
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
                sequenceKeys: [
                  ...localGuide.entities.game.universal.sequenceKeys,
                  sequence.semanticKey,
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
                sequences: [...localGuide.entities.sequences, sequence],
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    deleteSequence: rxMutation({
      operation: ({ sequenceKey }: { sequenceKey: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const sequence = localGuide.entities.sequences.find(
              (s) => s.semanticKey === sequenceKey
            );
            if (!sequence) {
              throw new Error(`Sequence "${sequenceKey}" does not exist.`);
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'sequence',
              entityKey: sequenceKey,
            });

            if (sequence.characterKey) {
              const character = localGuide.entities.characters.find(
                (c) => c.semanticKey === sequence.characterKey
              );
              if (!character) {
                throw new Error(
                  `Character "${sequence.characterKey}" for sequence "${sequenceKey}" not found.`
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
                  sequenceKeys: character.hierarchy.sequenceKeys.filter(
                    (key) => key !== sequenceKey
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
                  sequences: localGuide.entities.sequences.filter(
                    (s) => s.semanticKey !== sequenceKey
                  ),
                },
              };
            }

            if (sequence.teamKey) {
              const team = localGuide.entities.teams.find(
                (t) => t.semanticKey === sequence.teamKey
              );
              if (!team) {
                throw new Error(
                  `Team "${sequence.teamKey}" for sequence "${sequenceKey}" not found.`
                );
              }

              markEntityUnsaved(guide, {
                entityType: 'team',
                entityKey: team.semanticKey,
              });

              const updatedTeam = {
                ...team,
                hierarchy: {
                  ...team.hierarchy,
                  sequenceKeys: team.hierarchy.sequenceKeys.filter(
                    (key) => key !== sequenceKey
                  ),
                },
                meta: {
                  ...team.meta,
                  lastUpdatedAt: new Date(),
                },
              };

              return {
                ...localGuide,
                guide,
                entities: {
                  ...localGuide.entities,
                  teams: localGuide.entities.teams.map((t) =>
                    t.semanticKey === team.semanticKey ? updatedTeam : t
                  ),
                  sequences: localGuide.entities.sequences.filter(
                    (s) => s.semanticKey !== sequenceKey
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
                sequenceKeys:
                  localGuide.entities.game.universal.sequenceKeys.filter(
                    (key) => key !== sequenceKey
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
                sequences: localGuide.entities.sequences.filter(
                  (s) => s.semanticKey !== sequenceKey
                ),
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    createTeam: rxMutation({
      operation: (input: { characterKeys: string[] }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const teamSize = localGuide.entities.game.config.teamSize;

            if (teamSize <= 1) {
              throw new Error(
                'Teams require a Game Team Size greater than 1.'
              );
            }
            if (input.characterKeys.length > teamSize) {
              throw new Error(
                `A Team cannot have more than ${teamSize} Characters.`
              );
            }

            for (const characterKey of input.characterKeys) {
              if (
                !localGuide.entities.characters.some(
                  (character) => character.semanticKey === characterKey
                )
              ) {
                throw new Error(`Character "${characterKey}" does not exist.`);
              }
            }

            const team = createTeam({
              gameKey: localGuide.entities.game.semanticKey,
              orderedCharacterKeys: input.characterKeys,
            });

            if (
              localGuide.entities.teams.some(
                (existing) => existing.semanticKey === team.semanticKey
              )
            ) {
              throw new Error('A Team with this Character order already exists.');
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'team',
              entityKey: team.semanticKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
            });

            const game = {
              ...localGuide.entities.game,
              hierarchy: {
                ...localGuide.entities.game.hierarchy,
                teamKeys: [
                  ...localGuide.entities.game.hierarchy.teamKeys,
                  team.semanticKey,
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
                teams: [...localGuide.entities.teams, team],
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    deleteTeam: rxMutation({
      operation: ({ teamKey }: { teamKey: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            if (
              !localGuide.entities.teams.some(
                (team) => team.semanticKey === teamKey
              )
            ) {
              throw new Error(`Team "${teamKey}" does not exist.`);
            }
            if (
              localGuide.entities.sequences.some(
                (sequence) => sequence.teamKey === teamKey
              )
            ) {
              throw new Error('A Team with local Sequences cannot be deleted.');
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'team',
              entityKey: teamKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
            });

            const game = {
              ...localGuide.entities.game,
              hierarchy: {
                ...localGuide.entities.game.hierarchy,
                teamKeys: localGuide.entities.game.hierarchy.teamKeys.filter(
                  (key) => key !== teamKey
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
                teams: localGuide.entities.teams.filter(
                  (team) => team.semanticKey !== teamKey
                ),
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    createMatchup: rxMutation({
      operation: (input: { attackerKey: string; defenderKey: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());

            for (const characterKey of [input.attackerKey, input.defenderKey]) {
              if (
                !localGuide.entities.characters.some(
                  (character) => character.semanticKey === characterKey
                )
              ) {
                throw new Error(`Character "${characterKey}" does not exist.`);
              }
            }

            const matchup = createMatchup({
              gameKey: localGuide.entities.game.semanticKey,
              attackerKey: input.attackerKey,
              defenderKey: input.defenderKey,
            });

            if (
              localGuide.entities.matchups.some(
                (existing) => existing.semanticKey === matchup.semanticKey
              )
            ) {
              throw new Error(
                'A Matchup with this attacker and defender already exists.'
              );
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'matchup',
              entityKey: matchup.semanticKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
            });

            const game = {
              ...localGuide.entities.game,
              hierarchy: {
                ...localGuide.entities.game.hierarchy,
                matchupKeys: [
                  ...localGuide.entities.game.hierarchy.matchupKeys,
                  matchup.semanticKey,
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
                matchups: [...localGuide.entities.matchups, matchup],
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    deleteMatchup: rxMutation({
      operation: ({ matchupKey }: { matchupKey: string }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            if (
              !localGuide.entities.matchups.some(
                (matchup) => matchup.semanticKey === matchupKey
              )
            ) {
              throw new Error(`Matchup "${matchupKey}" does not exist.`);
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'matchup',
              entityKey: matchupKey,
            });
            markEntityUnsaved(guide, {
              entityType: 'game',
              entityKey: localGuide.entities.game.semanticKey,
            });

            const game = {
              ...localGuide.entities.game,
              hierarchy: {
                ...localGuide.entities.game.hierarchy,
                matchupKeys:
                  localGuide.entities.game.hierarchy.matchupKeys.filter(
                    (key) => key !== matchupKey
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
                matchups: localGuide.entities.matchups.filter(
                  (matchup) => matchup.semanticKey !== matchupKey
                ),
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    addMatchupScenario: rxMutation({
      operation: (input: {
        matchupKey: string;
        opponentOptionKey: string;
        name?: string;
        notes?: string;
        stageKey?: string;
        parentScenarioKey?: string;
      }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const matchup = localGuide.entities.matchups.find(
              (existing) => existing.semanticKey === input.matchupKey
            );
            if (!matchup) {
              throw new Error(`Matchup "${input.matchupKey}" does not exist.`);
            }

            const optionExists =
              localGuide.entities.moves.some(
                (move) => move.semanticKey === input.opponentOptionKey
              ) ||
              localGuide.entities.sequences.some(
                (sequence) => sequence.semanticKey === input.opponentOptionKey
              );
            if (!optionExists) {
              throw new Error(
                `Move or Sequence "${input.opponentOptionKey}" does not exist.`
              );
            }

            if (
              input.stageKey &&
              !localGuide.entities.stages.some(
                (stage) => stage.semanticKey === input.stageKey
              )
            ) {
              throw new Error(`Stage "${input.stageKey}" does not exist.`);
            }

            if (
              input.parentScenarioKey &&
              !matchup.scenarios.some(
                (scenario) => scenario.semanticKey === input.parentScenarioKey
              )
            ) {
              throw new Error(
                `Scenario "${input.parentScenarioKey}" does not exist.`
              );
            }

            const scenario = createMatchupScenarioEntry({
              matchupKey: input.matchupKey,
              opponentOptionKey: input.opponentOptionKey,
              name: input.name,
              notes: input.notes,
              stageKey: input.stageKey,
              parentScenarioKey: input.parentScenarioKey,
            });

            if (
              matchup.scenarios.some(
                (existing) => existing.semanticKey === scenario.semanticKey
              )
            ) {
              throw new Error('A Scenario with this identity already exists.');
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'matchup',
              entityKey: matchup.semanticKey,
            });

            const updatedMatchup = {
              ...matchup,
              scenarios: [...matchup.scenarios, scenario],
              meta: { ...matchup.meta, lastUpdatedAt: new Date() },
            };

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                matchups: localGuide.entities.matchups.map((existing) =>
                  existing.semanticKey === matchup.semanticKey
                    ? updatedMatchup
                    : existing
                ),
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    removeMatchupScenario: rxMutation({
      operation: ({
        matchupKey,
        scenarioKey,
      }: {
        matchupKey: string;
        scenarioKey: string;
      }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const matchup = localGuide.entities.matchups.find(
              (existing) => existing.semanticKey === matchupKey
            );
            if (!matchup) {
              throw new Error(`Matchup "${matchupKey}" does not exist.`);
            }
            if (
              !matchup.scenarios.some(
                (scenario) => scenario.semanticKey === scenarioKey
              )
            ) {
              throw new Error(`Scenario "${scenarioKey}" does not exist.`);
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'matchup',
              entityKey: matchup.semanticKey,
            });

            const updatedMatchup = {
              ...matchup,
              scenarios: matchup.scenarios.filter(
                (scenario) => scenario.semanticKey !== scenarioKey
              ),
              meta: { ...matchup.meta, lastUpdatedAt: new Date() },
            };

            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                matchups: localGuide.entities.matchups.map((existing) =>
                  existing.semanticKey === matchup.semanticKey
                    ? updatedMatchup
                    : existing
                ),
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    addScenarioResponse: rxMutation({
      operation: (input: {
        matchupKey: string;
        scenarioKey: string;
        playerOptionKey: string;
        outcome?: -1 | 0 | 1;
        notes?: string;
      }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const matchup = localGuide.entities.matchups.find(
              (candidate) => candidate.semanticKey === input.matchupKey
            );
            if (!matchup) {
              throw new Error(`Matchup "${input.matchupKey}" does not exist.`);
            }
            const scenario = matchup.scenarios.find(
              (candidate) => candidate.semanticKey === input.scenarioKey
            );
            if (!scenario) {
              throw new Error(`Scenario "${input.scenarioKey}" does not exist.`);
            }
            const optionExists =
              localGuide.entities.moves.some(
                (move) => move.semanticKey === input.playerOptionKey
              ) ||
              localGuide.entities.sequences.some(
                (sequence) => sequence.semanticKey === input.playerOptionKey
              );
            if (!optionExists) {
              throw new Error(
                `Move or Sequence "${input.playerOptionKey}" does not exist.`
              );
            }
            const response = createScenarioResponseEntry({
              scenarioKey: input.scenarioKey,
              playerOptionKey: input.playerOptionKey,
              outcome: input.outcome,
              notes: input.notes,
            });
            if (
              scenario.responses.some(
                (candidate) => candidate.semanticKey === response.semanticKey
              )
            ) {
              throw new Error('A Response with this option already exists.');
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'matchup',
              entityKey: matchup.semanticKey,
            });
            const updatedMatchup = {
              ...matchup,
              scenarios: matchup.scenarios.map((candidate) =>
                candidate.semanticKey === scenario.semanticKey
                  ? {
                      ...candidate,
                      responses: [...candidate.responses, response],
                    }
                  : candidate
              ),
              meta: { ...matchup.meta, lastUpdatedAt: new Date() },
            };
            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                matchups: localGuide.entities.matchups.map((candidate) =>
                  candidate.semanticKey === matchup.semanticKey
                    ? updatedMatchup
                    : candidate
                ),
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    removeScenarioResponse: rxMutation({
      operation: (input: {
        matchupKey: string;
        scenarioKey: string;
        responseKey: string;
      }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const matchup = localGuide.entities.matchups.find(
              (candidate) => candidate.semanticKey === input.matchupKey
            );
            if (!matchup) {
              throw new Error(`Matchup "${input.matchupKey}" does not exist.`);
            }
            const scenario = matchup.scenarios.find(
              (candidate) => candidate.semanticKey === input.scenarioKey
            );
            if (!scenario) {
              throw new Error(`Scenario "${input.scenarioKey}" does not exist.`);
            }
            if (
              !scenario.responses.some(
                (candidate) => candidate.semanticKey === input.responseKey
              )
            ) {
              throw new Error(`Response "${input.responseKey}" does not exist.`);
            }

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'matchup',
              entityKey: matchup.semanticKey,
            });
            const updatedMatchup = {
              ...matchup,
              scenarios: matchup.scenarios.map((candidate) =>
                candidate.semanticKey === scenario.semanticKey
                  ? {
                      ...candidate,
                      responses: candidate.responses.filter(
                        (response) => response.semanticKey !== input.responseKey
                      ),
                    }
                  : candidate
              ),
              meta: { ...matchup.meta, lastUpdatedAt: new Date() },
            };
            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                matchups: localGuide.entities.matchups.map((candidate) =>
                  candidate.semanticKey === matchup.semanticKey
                    ? updatedMatchup
                    : candidate
                ),
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    updateScenarioResponse: rxMutation({
      operation: (input: {
        matchupKey: string;
        scenarioKey: string;
        responseKey: string;
        outcome: -1 | 0 | 1;
      }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const matchup = localGuide.entities.matchups.find(
              (candidate) => candidate.semanticKey === input.matchupKey
            );
            if (!matchup) {
              throw new Error(`Matchup "${input.matchupKey}" does not exist.`);
            }
            const scenario = matchup.scenarios.find(
              (candidate) => candidate.semanticKey === input.scenarioKey
            );
            if (!scenario) {
              throw new Error(`Scenario "${input.scenarioKey}" does not exist.`);
            }
            if (
              !scenario.responses.some(
                (response) => response.semanticKey === input.responseKey
              )
            ) {
              throw new Error(`Response "${input.responseKey}" does not exist.`);
            }
            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, {
              entityType: 'matchup',
              entityKey: matchup.semanticKey,
            });
            const updatedMatchup = {
              ...matchup,
              scenarios: matchup.scenarios.map((candidate) =>
                candidate.semanticKey === scenario.semanticKey
                  ? {
                      ...candidate,
                      responses: candidate.responses.map((response) =>
                        response.semanticKey === input.responseKey
                          ? { ...response, outcome: input.outcome }
                          : response
                      ),
                    }
                  : candidate
              ),
              meta: { ...matchup.meta, lastUpdatedAt: new Date() },
            };
            return {
              ...localGuide,
              guide,
              entities: {
                ...localGuide.entities,
                matchups: localGuide.entities.matchups.map((candidate) =>
                  candidate.semanticKey === matchup.semanticKey
                    ? updatedMatchup
                    : candidate
                ),
              },
            };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    addEntityNote: rxMutation({
      operation: ({
        entityType,
        entityKey,
        text,
      }: {
        entityType: EntityType;
        entityKey: string;
        text: string;
      }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const note = createNoteEntry({ text });

            const entities = updateEntityMeta(
              localGuide.entities,
              entityType,
              entityKey,
              (meta) => ({
                ...meta,
                notes: [...(meta.notes ?? []), note],
                lastUpdatedAt: new Date(),
              })
            );

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, { entityType, entityKey });

            return { ...localGuide, guide, entities };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    removeEntityNote: rxMutation({
      operation: ({
        entityType,
        entityKey,
        noteId,
      }: {
        entityType: EntityType;
        entityKey: string;
        noteId: string;
      }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const existingMeta = requireEntityMeta(
              localGuide.entities,
              entityType,
              entityKey
            );
            if (!existingMeta.notes?.some((note) => note.id === noteId)) {
              throw new Error(`Note "${noteId}" does not exist.`);
            }

            const entities = updateEntityMeta(
              localGuide.entities,
              entityType,
              entityKey,
              (meta) => ({
                ...meta,
                notes: (meta.notes ?? []).filter(
                  (note) => note.id !== noteId
                ),
                lastUpdatedAt: new Date(),
              })
            );

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, { entityType, entityKey });

            return { ...localGuide, guide, entities };
          })()
        ),
      onSuccess: (guide) => patchState(store, { value: guide }),
    }),

    promoteEntityNote: rxMutation({
      operation: ({
        entityType,
        entityKey,
        noteId,
        promotedToKey,
      }: {
        entityType: EntityType;
        entityKey: string;
        noteId: string;
        promotedToKey: string;
      }) =>
        from(
          (async () => {
            const localGuide = requireGuide(store.value());
            const existingMeta = requireEntityMeta(
              localGuide.entities,
              entityType,
              entityKey
            );
            if (!existingMeta.notes?.some((note) => note.id === noteId)) {
              throw new Error(`Note "${noteId}" does not exist.`);
            }

            const entities = updateEntityMeta(
              localGuide.entities,
              entityType,
              entityKey,
              (meta) => ({
                ...meta,
                notes: (meta.notes ?? []).map((note) =>
                  note.id === noteId ? { ...note, promotedToKey } : note
                ),
                lastUpdatedAt: new Date(),
              })
            );

            const guide = cloneGuideMetadata(localGuide);
            markEntityUnsaved(guide, { entityType, entityKey });

            return { ...localGuide, guide, entities };
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
    }),    exportArchive: rxMutation({
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

// Generic per-entity-type meta lookup/update so notes (and any future
// meta-level feature) work identically across every entity type without
// bespoke per-entity mutations.
function requireEntityMeta(
  entities: LocalGuideEntities,
  entityType: EntityType,
  entityKey: string
): EntityMetadata {
  const meta = findEntityMeta(entities, entityType, entityKey);
  if (!meta) {
    throw new Error(`${entityType} "${entityKey}" does not exist.`);
  }
  return meta;
}

function findEntityMeta(
  entities: LocalGuideEntities,
  entityType: EntityType,
  entityKey: string
): EntityMetadata | undefined {
  if (entityType === 'game') {
    return entities.game.semanticKey === entityKey
      ? entities.game.meta
      : undefined;
  }
  const collection = entityCollection(entities, entityType);
  return collection.find((entity) => entity.semanticKey === entityKey)?.meta;
}

function updateEntityMeta(
  entities: LocalGuideEntities,
  entityType: EntityType,
  entityKey: string,
  updater: (meta: EntityMetadata) => EntityMetadata
): LocalGuideEntities {
  if (entityType === 'game') {
    if (entities.game.semanticKey !== entityKey) {
      throw new Error(`game "${entityKey}" does not exist.`);
    }
    return {
      ...entities,
      game: { ...entities.game, meta: updater(entities.game.meta) },
    };
  }

  const key = collectionKey(entityType);
  const collection = entities[key] as Array<{ semanticKey: string; meta: EntityMetadata }>;
  if (!collection.some((entity) => entity.semanticKey === entityKey)) {
    throw new Error(`${entityType} "${entityKey}" does not exist.`);
  }

  return {
    ...entities,
    [key]: collection.map((entity) =>
      entity.semanticKey === entityKey
        ? { ...entity, meta: updater(entity.meta) }
        : entity
    ),
  };
}

function entityCollection(
  entities: LocalGuideEntities,
  entityType: EntityType
): Array<{ semanticKey: string; meta: EntityMetadata }> {
  return entities[
    collectionKey(entityType)
  ] as unknown as Array<{ semanticKey: string; meta: EntityMetadata }>;
}

function collectionKey(
  entityType: EntityType
): Exclude<keyof LocalGuideEntities, 'game'> {
  const keys: Record<Exclude<EntityType, 'game'>, Exclude<keyof LocalGuideEntities, 'game'>> = {
    stage: 'stages',
    stageZone: 'stageZones',
    character: 'characters',
    team: 'teams',
    move: 'moves',
    sequence: 'sequences',
    projectile: 'projectiles',
    matchup: 'matchups',
  };
  return keys[entityType as Exclude<EntityType, 'game'>];
}