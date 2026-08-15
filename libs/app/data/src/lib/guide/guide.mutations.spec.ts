import {
  createGuideJson,
  markEntitySynced,
  markEntityUnsaved,
} from './index';

describe('guide mutations', () => {
  it('does not duplicate an unsaved entity key', () => {
    const guide = createGuideJson({ gameKey: 'game-demo-1x' });
    const ref = { entityType: 'game' as const, entityKey: 'game-demo-1x' };

    markEntityUnsaved(guide, ref);
    markEntityUnsaved(guide, ref);

    expect(guide.localChanges).toEqual(['game:game-demo-1x']);
    expect(guide.unsavedStatus['game:game-demo-1x']).toBe(true);
  });

  it('moves an entity from local to synced changes', () => {
    const guide = createGuideJson({ gameKey: 'game-demo-1x' });
    const ref = { entityType: 'game' as const, entityKey: 'game-demo-1x' };

    markEntityUnsaved(guide, ref);
    markEntitySynced(guide, ref);

    expect(guide.localChanges).toEqual([]);
    expect(guide.syncedChanges).toEqual(['game:game-demo-1x']);
    expect(guide.unsavedStatus['game:game-demo-1x']).toBe(false);
  });
});