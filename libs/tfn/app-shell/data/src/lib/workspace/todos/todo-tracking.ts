import type { GuideTodo, ResearchValues, TodoTracking } from '../../guide';

export function isPinnedGuideTracker(todo: GuideTodo): boolean {
  return (
    todo.tracker?.type === 'guide-progress' ||
    todo.tracker?.type === 'entity-completion'
  );
}

export function resolveTodoEstimate(
  tracking: TodoTracking,
  research: ResearchValues,
): number | undefined {
  if (tracking.type !== 'estimated-count') return undefined;

  switch (tracking.key) {
    case 'character-count':
      return research.expectedCounts?.characters;
    case 'stage-count':
      return research.expectedCounts?.stages;
    case 'universal-move-count':
      return research.expectedCounts?.universalMoves;
    case 'character-move-count': {
      const movesByCharacter = research.movesByCharacter;
      if (!movesByCharacter) return undefined;
      if (tracking.scopeKey) return movesByCharacter[tracking.scopeKey];
      return Object.values(movesByCharacter).reduce(
        (total, count) => total + count,
        0,
      );
    }
  }
}
