import { describe, expect, it } from 'vitest';
import {
  createMatchup,
  createMatchupSemanticKey,
  validateMatchupDocument,
} from './matchup';

describe('createMatchupSemanticKey', () => {
  it('derives a stable key from game, attacker, defender, and name', () => {
    const key = createMatchupSemanticKey('game-1', 'char-a', 'char-b', 'Corner pressure');
    expect(key).toBe(
      createMatchupSemanticKey('game-1', 'char-a', 'char-b', 'Corner pressure')
    );
  });

  it('produces different keys when attacker/defender roles are swapped', () => {
    const key1 = createMatchupSemanticKey('game-1', 'char-a', 'char-b', 'Corner pressure');
    const key2 = createMatchupSemanticKey('game-1', 'char-b', 'char-a', 'Corner pressure');
    expect(key1).not.toBe(key2);
  });

  it('produces different keys for different names', () => {
    const key1 = createMatchupSemanticKey('game-1', 'char-a', 'char-b', 'Corner pressure');
    const key2 = createMatchupSemanticKey('game-1', 'char-a', 'char-b', 'Neutral game');
    expect(key1).not.toBe(key2);
  });
});

describe('createMatchup', () => {
  it('builds a valid MatchupDocument with a derived semanticKey', () => {
    const matchup = createMatchup({
      gameKey: 'game-1',
      attackerKey: 'char-a',
      defenderKey: 'char-b',
      name: 'Corner pressure',
    });

    expect(matchup.gameKey).toBe('game-1');
    expect(matchup.attackerKey).toBe('char-a');
    expect(matchup.defenderKey).toBe('char-b');
    expect(matchup.name).toBe('Corner pressure');
    expect(matchup.scenarios).toEqual([]);
    expect(matchup.semanticKey).toBe(
      createMatchupSemanticKey('game-1', 'char-a', 'char-b', 'Corner pressure')
    );
  });

  it('trims name and keys', () => {
    const matchup = createMatchup({
      gameKey: '  game-1  ',
      attackerKey: '  char-a  ',
      defenderKey: '  char-b  ',
      name: '  Corner pressure  ',
    });

    expect(matchup.gameKey).toBe('game-1');
    expect(matchup.attackerKey).toBe('char-a');
    expect(matchup.defenderKey).toBe('char-b');
    expect(matchup.name).toBe('Corner pressure');
  });

  it('supports an optional stageKey', () => {
    const matchup = createMatchup({
      gameKey: 'game-1',
      attackerKey: 'char-a',
      defenderKey: 'char-b',
      name: 'Corner pressure',
      stageKey: 'stage-1',
    });

    expect(matchup.stageKey).toBe('stage-1');
  });

  it('throws when attacker and defender are the same character', () => {
    expect(() =>
      createMatchup({
        gameKey: 'game-1',
        attackerKey: 'char-a',
        defenderKey: 'char-a',
        name: 'Mirror match',
      })
    ).toThrow(/attackerKey and defenderKey must be different/);
  });

  it('throws when name is empty', () => {
    expect(() =>
      createMatchup({
        gameKey: 'game-1',
        attackerKey: 'char-a',
        defenderKey: 'char-b',
        name: '   ',
      })
    ).toThrow(/name is required/);
  });
});

describe('validateMatchupDocument', () => {
  it('reports a mismatched semanticKey', () => {
    const matchup = createMatchup({
      gameKey: 'game-1',
      attackerKey: 'char-a',
      defenderKey: 'char-b',
      name: 'Corner pressure',
    });

    const errors = validateMatchupDocument({
      ...matchup,
      semanticKey: 'matchup-wrong',
    });

    expect(errors).toContain(
      'semanticKey does not match the Game, attacker, defender, and name.'
    );
  });
});
