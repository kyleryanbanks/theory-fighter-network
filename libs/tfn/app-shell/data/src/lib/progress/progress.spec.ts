import { describe, expect, it } from 'vitest';
import {
  calculateCountProgress,
  calculateFieldCompletion,
  calculateMatchupCoverage,
  createFieldDescriptors,
} from './index';
import {
  createCharacterDocument,
  createMatchupDocument,
  createMoveDocument,
  createSequenceDocument,
} from '../models';

describe('progress calculators', () => {
  it('calculates estimated versus actual counts', () => {
    expect(calculateCountProgress('Characters', 3, 5)).toEqual({
      completed: 3,
      total: 5,
      label: 'Characters',
      state: 'in-progress',
    });
  });

  it('marks count progress blocked when no estimate is available', () => {
    expect(calculateCountProgress('Stages', 0, undefined)).toEqual({
      completed: 0,
      total: undefined,
      label: 'Stages',
      state: 'blocked',
    });
  });

  it('uses the matchup editor response option rules for coverage', () => {
    const universalMove = createMoveDocument({ semanticKey: 'move-universal' });
    const attackerMove = createMoveDocument({
      semanticKey: 'move-attacker',
      characterKey: 'char-attacker',
      parentKey: 'move-universal',
    });
    const defenderMove = createMoveDocument({
      semanticKey: 'move-defender',
      characterKey: 'char-defender',
    });
    const universalSequence = createSequenceDocument({
      semanticKey: 'sequence-universal',
    });
    const attackerSequence = createSequenceDocument({
      semanticKey: 'sequence-attacker',
      characterKey: 'char-attacker',
    });
    const teamSequence = createSequenceDocument({
      semanticKey: 'sequence-team',
      teamKey: 'team-1',
    });
    const matchup = createMatchupDocument({
      attackerKey: 'char-attacker',
      defenderKey: 'char-defender',
      scenarios: [
        {
          id: 'scenario-1',
          semanticKey: 'scenario-1',
          opponentOptionKey: 'move-universal',
          responses: [
            {
              semanticKey: 'response-1',
              playerOptionKey: 'move-universal',
              outcome: 1,
            },
            {
              semanticKey: 'response-2',
              playerOptionKey: 'sequence-attacker',
              outcome: 0,
            },
          ],
        },
      ],
    });

    expect(
      calculateMatchupCoverage({
        moves: [universalMove, attackerMove, defenderMove],
        sequences: [universalSequence, attackerSequence, teamSequence],
        matchup,
      }),
    ).toEqual({
      completed: 2,
      total: 4,
      label: 'Matchup coverage',
      state: 'in-progress',
    });
  });

  it('calculates generic populated versus possible fields', () => {
    const character = createCharacterDocument({
      name: 'Ryu',
      archetypes: ['rushdown'],
    });

    expect(
      calculateFieldCompletion(character, createFieldDescriptors('character')),
    ).toEqual({
      completed: 2,
      total: 4,
      label: 'Character fields',
      nextStep: 'Moves',
      state: 'in-progress',
    });
  });
});
