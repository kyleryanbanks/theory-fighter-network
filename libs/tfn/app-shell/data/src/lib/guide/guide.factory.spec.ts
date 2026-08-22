import {
  CURRENT_GUIDE_SCHEMA_VERSION,
  createGuideJson,
} from './index';

describe('createGuideJson', () => {
  it('creates a guide with the current schema and empty change tracking', () => {
    const guide = createGuideJson({ gameKey: 'game-demo-1x' });

    expect(guide).toMatchObject({
      gameKey: 'game-demo-1x',
      schemaVersion: CURRENT_GUIDE_SCHEMA_VERSION,
      localChanges: [],
      syncedChanges: [],
      unsavedStatus: {},
    });
    expect(new Date(guide.lastModified).toString()).not.toBe('Invalid Date');
  });

  it('uses an explicitly supported schema version', () => {
    expect(createGuideJson({ gameKey: 'game-demo-1x', schemaVersion: 1 }))
      .toMatchObject({ schemaVersion: 1 });
  });
});