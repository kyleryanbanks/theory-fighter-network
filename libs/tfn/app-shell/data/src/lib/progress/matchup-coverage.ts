import type {
  MatchupDocument,
  MoveDocument,
  SequenceDocument,
} from '../models';
import type { ProgressResult } from './progress.types';

export interface MatchupCoverageInput {
  moves: MoveDocument[];
  sequences: SequenceDocument[];
  matchup: MatchupDocument;
}

export function getMatchupResponseOptions(
  input: Pick<MatchupCoverageInput, 'moves' | 'sequences'> & {
    attackerKey: string;
  },
): string[] {
  const moveKeys = input.moves
    .filter(
      (move) =>
        !move.characterKey ||
        (move.characterKey === input.attackerKey && Boolean(move.parentKey)),
    )
    .map((move) => move.semanticKey);
  const sequenceKeys = input.sequences
    .filter(
      (sequence) =>
        (!sequence.characterKey && !sequence.teamKey) ||
        sequence.characterKey === input.attackerKey,
    )
    .map((sequence) => sequence.semanticKey);

  return [...moveKeys, ...sequenceKeys];
}

export function calculateMatchupCoverage(
  input: MatchupCoverageInput,
): ProgressResult {
  const options = getMatchupResponseOptions({
    moves: input.moves,
    sequences: input.sequences,
    attackerKey: input.matchup.attackerKey,
  });
  const optionKeys = new Set(options);
  const total = options.length * input.matchup.scenarios.length;
  const completed = input.matchup.scenarios.reduce(
    (count, scenario) =>
      count +
      new Set(
        scenario.responses
          .map((response) => response.playerOptionKey)
          .filter((key) => optionKeys.has(key)),
      ).size,
    0,
  );

  return {
    completed,
    total,
    label: 'Matchup coverage',
    state:
      total === 0
        ? 'blocked'
        : completed === 0
          ? 'not-started'
          : completed >= total
            ? 'complete'
            : 'in-progress',
  };
}
