import type { LocalGuide, ResearchValues } from '../guide';
import { calculateCountProgress } from './count-progress';
import type { HelperTask } from './progress.types';

export function createHelperTasks(research: ResearchValues = {}): HelperTask[] {
  const expectedCounts = research.expectedCounts ?? {};
  const expectedCharacterMoves = research.movesByCharacter ?? {};

  return [
    {
      key: 'roster',
      title: 'Document the character roster',
      steps: [
        {
          key: 'character-count',
          title: 'Add the expected Characters',
          getProgress: (guide: LocalGuide) =>
            calculateCountProgress(
              'Characters',
              guide.entities.characters.length,
              expectedCounts.characters,
            ),
        },
      ],
    },
    {
      key: 'stages',
      title: 'Document the stages',
      steps: [
        {
          key: 'stage-count',
          title: 'Add the expected Stages',
          getProgress: (guide: LocalGuide) =>
            calculateCountProgress(
              'Stages',
              guide.entities.stages.length,
              expectedCounts.stages,
            ),
        },
      ],
    },
    {
      key: 'universal-moves',
      title: 'Document universal moves',
      steps: [
        {
          key: 'universal-move-count',
          title: 'Add the expected universal Moves',
          getProgress: (guide: LocalGuide) =>
            calculateCountProgress(
              'Universal Moves',
              guide.entities.moves.filter((move) => !move.characterKey).length,
              expectedCounts.universalMoves,
            ),
        },
      ],
    },
    {
      key: 'character-moves',
      title: 'Document character moves',
      steps: [
        {
          key: 'character-move-count',
          title: "Add each Character's expected Moves",
          getProgress: (guide: LocalGuide) => {
            const expected = Object.values(expectedCharacterMoves).reduce(
              (total, count) => total + count,
              0,
            );
            const actual = guide.entities.moves.filter(
              (move) => move.characterKey,
            ).length;
            return calculateCountProgress(
              'Character Moves',
              actual,
              Object.keys(expectedCharacterMoves).length ? expected : undefined,
            );
          },
        },
      ],
    },
  ];
}
