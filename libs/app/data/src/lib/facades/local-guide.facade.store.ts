import {
  InjectionToken,
  computed,
  inject,
  resource,
} from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import {
  rxMutation,
  withMutations,
  withResource,
} from '@angular-architects/ngrx-toolkit';
import { from, of } from 'rxjs';
import {
  createGuideJson,
  type LocalGuideWorkspace,
} from '../models/local-guide';
import type { StateModel } from '../models/state';
import {
  buildArchiveFile,
  parseArchiveFile,
  loadWorkspaceFromDirectoryHandle,
  saveWorkspaceToDirectoryHandle,
} from '../persistence/local-guide-web';

/**
 * Port abstraction for local guide persistence.
 *
 * The facade store depends on this interface instead of concrete IO helpers,
 * which keeps orchestration testable and allows swapping implementations.
 */
export interface LocalGuidePersistencePort {
  loadFromDirectoryHandle(
    directoryHandle: FileSystemDirectoryHandle
  ): Promise<LocalGuideWorkspace | undefined>;
  saveToDirectoryHandle(
    directoryHandle: FileSystemDirectoryHandle,
    workspace: LocalGuideWorkspace
  ): Promise<void>;
  parseArchiveFile(archiveFile: File): Promise<LocalGuideWorkspace>;
  buildArchiveFile(
    workspace: LocalGuideWorkspace,
    fileName?: string
  ): Promise<File>;
}

/**
 * Default browser persistence adapter used in runtime.
 */
const DEFAULT_LOCAL_GUIDE_PERSISTENCE: LocalGuidePersistencePort = {
  loadFromDirectoryHandle: loadWorkspaceFromDirectoryHandle,
  saveToDirectoryHandle: saveWorkspaceToDirectoryHandle,
  parseArchiveFile,
  buildArchiveFile: async (workspace, fileName) =>
    buildArchiveFile(workspace, fileName),
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
  directoryHandle: FileSystemDirectoryHandle | null;
  reloadToken: number;
};

type CreateWorkspaceInput = {
  gameKey: string;
  gameName: string;
  version: string;
};

/**
 * Primary data-layer facade for local guide workflows.
 *
 * Pattern:
 * - Resource: directory-handle driven load lifecycle.
 * - Mutations: explicit commands (create/save/import/export).
 * - Computed signals: derived view state for feature components.
 */
export const LocalGuideFacadeStore = signalStore(
  { providedIn: 'root' },
  withState<LocalGuideFacadeState>({
    directoryHandle: null,
    reloadToken: 0,
  }),
  withProps(() => ({
    persistence: inject(TFN_LOCAL_GUIDE_PERSISTENCE),
  })),
  // Resource is the read model for filesystem-backed workspace loading.
  withResource((store) =>
    resource<LocalGuideWorkspace | undefined, {
      directoryHandle: FileSystemDirectoryHandle | null;
      reloadToken: number;
    }>({
      params: () => ({
        directoryHandle: store.directoryHandle(),
        reloadToken: store.reloadToken(),
      }),
      loader: async ({ params }) => {
        if (!params.directoryHandle) {
          return undefined;
        }

        return store.persistence.loadFromDirectoryHandle(
          params.directoryHandle
        );
      },
      defaultValue: undefined,
    })
  ),
  // Mutations are command handlers for local guide workflows.
  withMutations((store) => ({
    createWorkspace: rxMutation({
      operation: (input: CreateWorkspaceInput) =>
        of(buildInitialWorkspace(input)),
      onSuccess: (workspace) => {
        patchState(store, { value: workspace });
      },
    }),

    saveWorkspaceToDirectory: rxMutation({
      operation: ({
        directoryHandle,
      }: {
        directoryHandle?: FileSystemDirectoryHandle | null;
      }) =>
        from(
          (async () => {
            const handle =
              directoryHandle ?? store.directoryHandle();
            const workspace = store.value();

            if (!handle) {
              throw new Error('Directory handle is required before save.');
            }

            if (!workspace) {
              throw new Error('No active workspace to save.');
            }

            await store.persistence.saveToDirectoryHandle(
              handle,
              workspace
            );
          })()
        ),
    }),

    importArchive: rxMutation({
      operation: (archiveFile: File) =>
        from(store.persistence.parseArchiveFile(archiveFile)),
      onSuccess: (workspace) => {
        patchState(store, { value: workspace });
      },
    }),

    exportArchive: rxMutation({
      operation: ({ fileName }: { fileName?: string }) =>
        from(
          (async () => {
            const workspace = store.value();

            if (!workspace) {
              throw new Error('No active workspace to export.');
            }

            return store.persistence.buildArchiveFile(
              workspace,
              fileName
            );
          })()
        ),
    }),
  })),
  withMethods((store) => ({
    /**
     * Sets the active directory handle that drives the load resource.
     */
    setDirectoryHandle(
      directoryHandle: FileSystemDirectoryHandle | null
    ): void {
      patchState(store, { directoryHandle });
    },

    /**
     * Forces a reload of directory-backed data by bumping resource params.
     */
    reloadDirectoryWorkspace(): void {
      patchState(store, (state) => ({
        reloadToken: state.reloadToken + 1,
      }));
    },

    /**
     * Clears in-memory active workspace value.
     */
    clearActiveWorkspace(): void {
      patchState(store, { value: undefined });
    },
  })),
  // Computed helpers keep feature components declarative and thin.
  withComputed((store) => ({
    workspace: computed(() => store.value()),
    hasWorkspace: computed(() => !!store.value()),
    isBusy: computed(
      () =>
        store.isLoading() ||
        store.createWorkspaceIsPending() ||
        store.saveWorkspaceToDirectoryIsPending() ||
        store.importArchiveIsPending() ||
        store.exportArchiveIsPending()
    ),
  }))
);

/**
 * Creates a minimal initialized workspace used by createWorkspace mutation.
 */
function buildInitialWorkspace(
  input: CreateWorkspaceInput
): LocalGuideWorkspace {
  const now = new Date();

  return {
    guide: createGuideJson({ gameKey: input.gameKey }),
    entities: {
      game: {
        name: input.gameName,
        version: input.version,
        semanticKey: input.gameKey,
        frameRate: 60,
        is3d: false,
        teamSize: 1,
        inputs: {
          directions: [],
          buttons: [],
        },
        states: createEmptyStateModel(),
        community: {
          ownerId: 'local-user',
        },
        meta: {
          createdAt: now,
          lastUpdatedAt: now,
        },
      },
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

function createEmptyStateModel(): StateModel {
  return {
    attacks: {},
    blocks: {},
    knockdowns: {},
    juggles: {},
    positions: {},
    stageMechanics: {},
    characters: {},
    resources: {},
    comboMechanics: {},
    projectiles: {},
  };
}