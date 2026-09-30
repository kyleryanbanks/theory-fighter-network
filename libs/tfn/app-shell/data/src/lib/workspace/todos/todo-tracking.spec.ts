import { describe, expect, it } from 'vitest';
import { resolveTodoEstimate } from './todo-tracking';

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
});
