import { rxMutation, withMutations } from '@angular-architects/ngrx-toolkit';
import { patchState, signalStore, withState } from '@ngrx/signals';
import { from, of } from 'rxjs';
import type { ResearchValues, TfnWorkspace } from '../../guide/guide.types';

type ResearchValuesStoreState = {
  research: ResearchValues;
  dirty: boolean;
};

/**
 * Persisted user research values (expected counts), synced with .tfn file.
 */
export const ResearchValuesStore = signalStore(
  { providedIn: 'root' },
  withState<ResearchValuesStoreState>({
    research: {},
    dirty: false,
  }),
  withMutations((store) => ({
    setExpectedCount: rxMutation({
      operation: ((
        kind: 'characters' | 'stages' | 'universalMoves',
        count: number | undefined,
      ) =>
        from(
          (async () => {
            const expectedCounts = {
              ...(store.research().expectedCounts ?? {}),
            };
            if (count === undefined) {
              delete expectedCounts[kind];
            } else if (count >= 0) {
              expectedCounts[kind] = count;
            } else {
              throw new Error(
                `Expected count must be non-negative, got ${count}`,
              );
            }
            return {
              ...store.research(),
              expectedCounts: Object.keys(expectedCounts).length
                ? expectedCounts
                : undefined,
            };
          })(),
        )) as any,
      onSuccess: (research) => {
        patchState(store, { research, dirty: true });
      },
    }),

    setExpectedCharacterMoves: rxMutation({
      operation: ((characterKey: string, count: number | undefined) =>
        from(
          (async () => {
            const movesByCharacter = {
              ...(store.research().movesByCharacter ?? {}),
            };
            if (count === undefined) {
              delete movesByCharacter[characterKey];
            } else if (count >= 0) {
              movesByCharacter[characterKey] = count;
            } else {
              throw new Error(
                `Expected count must be non-negative, got ${count}`,
              );
            }
            return {
              ...store.research(),
              movesByCharacter: Object.keys(movesByCharacter).length
                ? movesByCharacter
                : undefined,
            };
          })(),
        )) as any,
      onSuccess: (research) => {
        patchState(store, { research, dirty: true });
      },
    }),

    pruneCharacter: rxMutation({
      operation: (characterKey: string) =>
        from(
          (async () => {
            const movesByCharacter = {
              ...(store.research().movesByCharacter ?? {}),
            };
            delete movesByCharacter[characterKey];
            return {
              ...store.research(),
              movesByCharacter: Object.keys(movesByCharacter).length
                ? movesByCharacter
                : undefined,
            };
          })(),
        ),
      onSuccess: (research) => {
        patchState(store, { research, dirty: true });
      },
    }),

    hydrate: rxMutation({
      operation: (workspace: TfnWorkspace) => of(workspace.research ?? {}),
      onSuccess: (research) => {
        patchState(store, { research, dirty: false });
      },
    }),

    reset: rxMutation({
      operation: () => of(void 0),
      onSuccess: () => {
        patchState(store, { research: {}, dirty: false });
      },
    }),

    markClean: rxMutation({
      operation: () => of(void 0),
      onSuccess: () => {
        patchState(store, { dirty: false });
      },
    }),
  })),
);
