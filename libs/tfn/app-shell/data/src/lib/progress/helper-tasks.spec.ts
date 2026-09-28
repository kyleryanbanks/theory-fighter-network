import { describe, expect, it } from 'vitest';
import { createHelperTasks } from './helper-tasks';
import type { LocalGuide } from '../guide';

function guideWithCounts(): LocalGuide {
  return {
    guide: {
      gameKey: 'game-1',
      schemaVersion: 1,
      lastModified: '',
      localChanges: [],
      syncedChanges: [],
      unsavedStatus: {},
    },
    entities: {
      game: {} as never,
      stages: [{ semanticKey: 'stage-1' } as never],
      stageZones: [],
      characters: [{ semanticKey: 'character-1' } as never],
      teams: [],
      moves: [{ semanticKey: 'move-1' } as never],
      sequences: [],
      projectiles: [],
      matchups: [],
    },
  };
}

describe('helper tasks', () => {
  it('creates count-based task steps from research estimates', () => {
    const tasks = createHelperTasks({
      expectedCounts: { characters: 2, stages: 1, universalMoves: 2 },
    });

    expect(tasks.map((task) => task.key)).toEqual([
      'roster',
      'stages',
      'universal-moves',
      'character-moves',
    ]);
    expect(tasks[0].steps[0].getProgress(guideWithCounts())).toMatchObject({
      completed: 1,
      total: 2,
      state: 'in-progress',
    });
  });
});
