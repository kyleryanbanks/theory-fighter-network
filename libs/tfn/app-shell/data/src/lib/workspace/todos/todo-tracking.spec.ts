import { describe, expect, it } from 'vitest';
import { isPinnedGuideTracker, resolveTodoEstimate } from './todo-tracking';

describe('todo tracking', () => {
  it('resolves aggregate and scoped estimate targets', () => {
    expect(
      resolveTodoEstimate(
        { type: 'estimated-count', key: 'character-count' },
        { expectedCounts: { characters: 4 } },
      ),
    ).toBe(4);
    expect(
      resolveTodoEstimate(
        { type: 'estimated-count', key: 'character-move-count' },
        { movesByCharacter: { ryu: 3, ken: 0 } },
      ),
    ).toBe(3);
    expect(
      resolveTodoEstimate(
        {
          type: 'estimated-count',
          key: 'character-move-count',
          scopeKey: 'ken',
        },
        { movesByCharacter: { ryu: 3, ken: 0 } },
      ),
    ).toBe(0);
  });

  it('returns undefined when an estimate is missing or tracking an entity', () => {
    expect(
      resolveTodoEstimate({ type: 'estimated-count', key: 'stage-count' }, {}),
    ).toBeUndefined();
    expect(
      resolveTodoEstimate(
        { type: 'entity', entityType: 'character', entityKey: 'ryu' },
        { expectedCounts: { characters: 4 } },
      ),
    ).toBeUndefined();
  });

  it('identifies only manager-owned TODOs as pinned guide trackers', () => {
    expect(
      isPinnedGuideTracker({
        id: 'manual',
        text: 'Research character roster',
        status: 'open',
        tracking: { type: 'estimated-count', key: 'character-count' },
        createdAt: new Date(),
      }),
    ).toBe(false);
    expect(
      isPinnedGuideTracker({
        id: 'pinned',
        text: 'TODO: Add the expected Characters',
        status: 'open',
        tracking: { type: 'estimated-count', key: 'character-count' },
        tracker: { type: 'guide-progress', key: 'character-count' },
        createdAt: new Date(),
      }),
    ).toBe(true);
    expect(
      isPinnedGuideTracker({
        id: 'entity-pinned',
        text: 'TODO: Complete Ryu',
        status: 'open',
        tracking: {
          type: 'entity',
          entityType: 'character',
          entityKey: 'ryu',
        },
        tracker: {
          type: 'entity-completion',
          entityType: 'character',
          entityKey: 'ryu',
        },
        createdAt: new Date(),
      }),
    ).toBe(true);
  });
});
