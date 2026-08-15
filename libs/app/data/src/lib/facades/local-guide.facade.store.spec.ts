import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  LocalGuideFacadeStore,
  TFN_LOCAL_GUIDE_PERSISTENCE,
  type LocalGuidePersistencePort,
} from './local-guide.facade.store';
import {
  createGuideJson,
  type LocalGuideWorkspace,
} from '../guide';

// Shared fixture builder used to keep tests focused on facade behavior.
function buildWorkspace(gameKey = 'game-demo-1x'): LocalGuideWorkspace {
  return {
    guide: createGuideJson({ gameKey }),
    entities: {
      game: {
        name: 'Demo Fighter',
        version: '1.0.0',
        semanticKey: gameKey,
        frameRate: 60,
        is3d: false,
        teamSize: 1,
        inputs: {
          directions: [{ label: '5', value: '5' }],
          buttons: [{ label: 'LP', value: 'lp' }],
        },
        states: {},
        community: { ownerId: 'local-user' },
        meta: {
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          lastUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
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

// Mock port lets tests verify orchestration without real filesystem side effects.
function createPersistenceMock(): LocalGuidePersistencePort {
  return {
    loadFromDirectoryHandle: vi.fn(async () => undefined),
    saveToDirectoryHandle: vi.fn(async () => undefined),
    parseArchiveFile: vi.fn(async () => buildWorkspace('imported-game')),
    buildArchiveFile: vi.fn(
      async (_workspace, fileName = 'guide.tfn') =>
        new File(['{}'], fileName, { type: 'application/json' })
    ),
  };
}

describe('LocalGuideFacadeStore', () => {
  let store: InstanceType<typeof LocalGuideFacadeStore>;
  let persistence: LocalGuidePersistencePort;

  beforeEach(() => {
    persistence = createPersistenceMock();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: TFN_LOCAL_GUIDE_PERSISTENCE,
          useValue: persistence,
        },
      ],
    });

    store = TestBed.inject(LocalGuideFacadeStore);
  });

  it('loads workspace through resource when directory handle changes', async () => {
    const directoryHandle =
      {} as unknown as FileSystemDirectoryHandle;
    const expected = buildWorkspace('resource-game');

    vi.mocked(persistence.loadFromDirectoryHandle).mockResolvedValue(
      expected
    );

    store.setDirectoryHandle(directoryHandle);

    await vi.waitFor(() => {
      expect(store.value()).toBeDefined();
      expect(store.value()?.guide.gameKey).toBe('resource-game');
    });

    expect(persistence.loadFromDirectoryHandle).toHaveBeenCalledWith(
      directoryHandle
    );
  });

  it('creates a new workspace through a mutation and stores it as the active value', async () => {
    const result = await store.createWorkspace({
      gameKey: 'created-game',
      gameName: 'Created Fighter',
      version: '1.2.0',
    });

    expect(result.status).toBe('success');
    expect(store.value()?.guide.gameKey).toBe('created-game');
    expect(store.value()?.entities.game.name).toBe('Created Fighter');
  });

  it('saves the active workspace through a mutation', async () => {
    const directoryHandle =
      {} as unknown as FileSystemDirectoryHandle;

    await store.createWorkspace({
      gameKey: 'save-game',
      gameName: 'Save Fighter',
      version: '2.0.0',
    });

    const result = await store.saveWorkspaceToDirectory({
      directoryHandle,
    });

    expect(result.status).toBe('success');
    expect(persistence.saveToDirectoryHandle).toHaveBeenCalledTimes(1);
  });

  it('imports a workspace through a mutation and replaces active value', async () => {
    const importedWorkspace = buildWorkspace('imported-game');
    const archiveFile = new File(['{}'], 'import.tfn', {
      type: 'application/json',
    });

    vi.mocked(persistence.parseArchiveFile).mockResolvedValue(
      importedWorkspace
    );

    const result = await store.importArchive(archiveFile);

    expect(result.status).toBe('success');
    expect(store.value()?.guide.gameKey).toBe('imported-game');
  });

  it('exports the active workspace through a mutation', async () => {
    await store.createWorkspace({
      gameKey: 'export-game',
      gameName: 'Export Fighter',
      version: '3.0.0',
    });

    const result = await store.exportArchive({
      fileName: 'exported-guide.tfn',
    });

    expect(result.status).toBe('success');

    if (result.status === 'success') {
      expect(result.value.name).toBe('exported-guide.tfn');
    }

    expect(persistence.buildArchiveFile).toHaveBeenCalledTimes(1);
  });
});