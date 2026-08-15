import {
  assertSupportedSchemaVersion,
  createGuideJson,
  CURRENT_GUIDE_SCHEMA_VERSION,
  markEntitySynced,
  markEntityUnsaved,
} from './index';

describe('guide state', () => {
  it('tracks unsaved and synced status per entity', () => {
    const guide = createGuideJson({ gameKey: 'game-demo-1x' });

    markEntityUnsaved(guide, {
      entityType: 'game',
      entityKey: 'game-demo-1x',
    });
    markEntitySynced(guide, {
      entityType: 'game',
      entityKey: 'game-demo-1x',
    });

    expect(guide.schemaVersion).toBe(CURRENT_GUIDE_SCHEMA_VERSION);
    expect(guide.localChanges).not.toContain('game:game-demo-1x');
    expect(guide.syncedChanges).toContain('game:game-demo-1x');
    expect(guide.unsavedStatus['game:game-demo-1x']).toBe(false);
  });

  it('rejects unsupported schema versions', () => {
    expect(() => assertSupportedSchemaVersion(0)).toThrow(/positive integer/i);
    expect(() =>
      assertSupportedSchemaVersion(CURRENT_GUIDE_SCHEMA_VERSION + 1)
    ).toThrow(/upgrade/i);
  });
});