import {
  CURRENT_GUIDE_SCHEMA_VERSION,
  assertSupportedSchemaVersion,
  buildTfnArchive,
  createGuideJson,
  markEntitySynced,
  markEntityUnsaved,
  parseTfnArchive,
  type EntityType,
  type LocalGuideEntities,
} from './models/local-guide';
import {
  loadWorkspaceFromDirectory,
  saveWorkspaceToDirectory,
} from './utils/local-guide-node';
import {
  buildArchiveFile,
  parseArchiveFile,
} from './persistence/local-guide-web';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function buildFixtureEntities(): LocalGuideEntities {
  return {
    game: {
      name: 'Demo Fighter',
      version: '1.0.0',
      semanticKey: 'game-demo-1x',
      frameRate: 60,
      is3d: false,
      teamSize: 1,
      inputs: {
        directions: [{ label: '5', value: '5' }],
        buttons: [{ label: 'LP', value: 'lp' }],
      },
      states: {},
      community: {
        ownerId: 'local-user',
      },
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
  };
}

describe('local guide foundation', () => {
  it('tracks unsaved and synced status per entity in guide metadata', () => {
    const guide = createGuideJson({ gameKey: 'game-demo-1x' });

    markEntityUnsaved(guide, {
      entityType: 'game',
      entityKey: 'game-demo-1x',
    });

    expect(guide.gameKey).toBe('game-demo-1x');
    expect(guide.schemaVersion).toBe(CURRENT_GUIDE_SCHEMA_VERSION);
    expect(guide.localChanges).toContain('game:game-demo-1x');
    expect(guide.unsavedStatus['game:game-demo-1x']).toBe(true);

    markEntitySynced(guide, {
      entityType: 'game',
      entityKey: 'game-demo-1x',
    });

    expect(guide.localChanges).not.toContain('game:game-demo-1x');
    expect(guide.syncedChanges).toContain('game:game-demo-1x');
    expect(guide.unsavedStatus['game:game-demo-1x']).toBe(false);
  });

  it('round-trips .tfn archive with checksum and date restoration', () => {
    const entities = buildFixtureEntities();
    const guide = createGuideJson({ gameKey: entities.game.semanticKey });
    markEntityUnsaved(guide, {
      entityType: 'game',
      entityKey: entities.game.semanticKey,
    });

    const archive = buildTfnArchive({ guide, entities });
    const loaded = parseTfnArchive(archive);

    expect(loaded.header.format).toBe('TFN_ARCHIVE');
    expect(loaded.entities.game.semanticKey).toBe('game-demo-1x');
    expect(loaded.entities.game.meta.createdAt).toBeInstanceOf(Date);
    expect(loaded.guide.unsavedStatus['game:game-demo-1x']).toBe(true);
  });

  it('rejects tampered .tfn content via checksum mismatch', () => {
    const entities = buildFixtureEntities();
    const guide = createGuideJson({ gameKey: entities.game.semanticKey });
    const archive = buildTfnArchive({ guide, entities });

    const tampered = archive.replace('Demo Fighter', 'Demo Fighter X');

    expect(() => parseTfnArchive(tampered)).toThrow(/checksum/i);
  });

  it('rejects unknown newer schema versions with upgrade guidance', () => {
    expect(() =>
      assertSupportedSchemaVersion(CURRENT_GUIDE_SCHEMA_VERSION + 1)
    ).toThrow(/upgrade/i);
  });

  it('imports and exports folder-based workspace data', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'tfn-local-guide-'));

    try {
      const entities = buildFixtureEntities();
      const guide = createGuideJson({ gameKey: entities.game.semanticKey });

      await saveWorkspaceToDirectory(tempRoot, { guide, entities });
      const loaded = await loadWorkspaceFromDirectory(tempRoot);

      expect(loaded.guide.gameKey).toBe('game-demo-1x');
      expect(loaded.entities.game.name).toBe('Demo Fighter');
      expect(loaded.entities.game.meta.lastUpdatedAt).toBeInstanceOf(Date);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('round-trips a .tfn archive through browser File APIs', async () => {
    const entities = buildFixtureEntities();
    const guide = createGuideJson({ gameKey: entities.game.semanticKey });

    const archiveFile = buildArchiveFile(
      { guide, entities },
      'demo-guide.tfn'
    );
    const loaded = await parseArchiveFile(archiveFile);

    expect(archiveFile.name).toBe('demo-guide.tfn');
    expect(loaded.guide.gameKey).toBe('game-demo-1x');
    expect(loaded.entities.game.meta.createdAt).toBeInstanceOf(Date);
  });
});

function _assertEntityType(_value: EntityType): void {
  // Compile-time assertion only.
}