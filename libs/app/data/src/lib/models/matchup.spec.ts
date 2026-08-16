import { describe, expect, it } from 'vitest';
import {
  createMatchup,
  createMatchupScenarioEntry,
  createMatchupScenarioSemanticKey,
  createMatchupSemanticKey,
  validateMatchupDocument,
} from './matchup';

describe('createMatchupSemanticKey', () => {
  it('derives a stable key from game, attacker, and defender', () => {
    const key = createMatchupSemanticKey('game-1', 'char-a', 'char-b');
    expect(key).toBe(createMatchupSemanticKey('game-1', 'char-a', 'char-b'));
  });

  it('produces different keys when attacker/defender roles are swapped', () => {
    const key1 = createMatchupSemanticKey('game-1', 'char-a', 'char-b');
    const key2 = createMatchupSemanticKey('game-1', 'char-b', 'char-a');
    expect(key1).not.toBe(key2);
  });
});

describe('createMatchup', () => {
  it('builds a valid MatchupDocument with a derived semanticKey', () => {
    const matchup = createMatchup({
      gameKey: 'game-1',
      attackerKey: 'char-a',
      defenderKey: 'char-b',
    });

    expect(matchup.gameKey).toBe('game-1');
    expect(matchup.attackerKey).toBe('char-a');
    expect(matchup.defenderKey).toBe('char-b');
    expect(matchup.scenarios).toEqual([]);
    expect(matchup.semanticKey).toBe(
      createMatchupSemanticKey('game-1', 'char-a', 'char-b')
    );
  });

  it('trims keys', () => {
    const matchup = createMatchup({
      gameKey: '  game-1  ',
      attackerKey: '  char-a  ',
      defenderKey: '  char-b  ',
    });

    expect(matchup.gameKey).toBe('game-1');
    expect(matchup.attackerKey).toBe('char-a');
    expect(matchup.defenderKey).toBe('char-b');
  });

  it('allows a mirror match where attacker and defender are the same character', () => {
    const matchup = createMatchup({
      gameKey: 'game-1',
      attackerKey: 'char-a',
      defenderKey: 'char-a',
    });

    expect(matchup.attackerKey).toBe('char-a');
    expect(matchup.defenderKey).toBe('char-a');
    expect(matchup.semanticKey).toBe(
      createMatchupSemanticKey('game-1', 'char-a', 'char-a')
    );
  });
});

describe('validateMatchupDocument', () => {
  it('reports a mismatched semanticKey', () => {
    const matchup = createMatchup({
      gameKey: 'game-1',
      attackerKey: 'char-a',
      defenderKey: 'char-b',
    });

    const errors = validateMatchupDocument({
      ...matchup,
      semanticKey: 'matchup-wrong',
    });

    expect(errors).toContain(
      'semanticKey does not match the Game, attacker, and defender.'
    );
  });
});

describe('createMatchupScenarioSemanticKey', () => {
  it('derives a stable key from matchup, opponent option, stage, state, and positions', () => {
    const key = createMatchupScenarioSemanticKey(
      'matchup-1',
      'move-fireball',
      'stage-1',
      { attacks: { active: true } },
      10,
      -10
    );
    expect(key).toBe(
      createMatchupScenarioSemanticKey(
        'matchup-1',
        'move-fireball',
        'stage-1',
        { attacks: { active: true } },
        10,
        -10
      )
    );
  });

  it('produces different keys for different opponent options', () => {
    const key1 = createMatchupScenarioSemanticKey('matchup-1', 'move-a');
    const key2 = createMatchupScenarioSemanticKey('matchup-1', 'move-b');
    expect(key1).not.toBe(key2);
  });

  it('produces different keys for different stages', () => {
    const key1 = createMatchupScenarioSemanticKey(
      'matchup-1',
      'move-a',
      'stage-1'
    );
    const key2 = createMatchupScenarioSemanticKey(
      'matchup-1',
      'move-a',
      'stage-2'
    );
    expect(key1).not.toBe(key2);
  });

  it('produces different keys for different initial state', () => {
    const key1 = createMatchupScenarioSemanticKey(
      'matchup-1',
      'move-a',
      undefined,
      { attacks: { active: true } }
    );
    const key2 = createMatchupScenarioSemanticKey(
      'matchup-1',
      'move-a',
      undefined,
      { attacks: { active: false } }
    );
    expect(key1).not.toBe(key2);
  });

  it('is not sensitive to initial state key order', () => {
    const key1 = createMatchupScenarioSemanticKey(
      'matchup-1',
      'move-a',
      undefined,
      { attacks: { active: true }, blocks: { held: false } }
    );
    const key2 = createMatchupScenarioSemanticKey(
      'matchup-1',
      'move-a',
      undefined,
      { blocks: { held: false }, attacks: { active: true } }
    );
    expect(key1).toBe(key2);
  });

  it('produces different keys for different positions', () => {
    const key1 = createMatchupScenarioSemanticKey(
      'matchup-1',
      'move-a',
      undefined,
      undefined,
      10
    );
    const key2 = createMatchupScenarioSemanticKey(
      'matchup-1',
      'move-a',
      undefined,
      undefined,
      20
    );
    expect(key1).not.toBe(key2);
  });
});

describe('createMatchupScenarioEntry', () => {
  it('builds a valid MatchupScenario with a derived semanticKey', () => {
    const scenario = createMatchupScenarioEntry({
      matchupKey: 'matchup-1',
      opponentOptionKey: 'move-fireball',
      name: 'Fireball punish',
    });

    expect(scenario.opponentOptionKey).toBe('move-fireball');
    expect(scenario.name).toBe('Fireball punish');
    expect(scenario.responses).toEqual([]);
    expect(scenario.id).toBe(scenario.semanticKey);
    expect(scenario.semanticKey).toBe(
      createMatchupScenarioSemanticKey('matchup-1', 'move-fireball')
    );
  });

  it('throws when opponentOptionKey is empty', () => {
    expect(() =>
      createMatchupScenarioEntry({
        matchupKey: 'matchup-1',
        opponentOptionKey: '   ',
      })
    ).toThrow(/opponentOptionKey is required/);
  });

  it('supports an optional stageKey', () => {
    const scenario = createMatchupScenarioEntry({
      matchupKey: 'matchup-1',
      opponentOptionKey: 'move-fireball',
      stageKey: 'stage-1',
    });

    expect(scenario.stageKey).toBe('stage-1');
    expect(scenario.semanticKey).toBe(
      createMatchupScenarioSemanticKey(
        'matchup-1',
        'move-fireball',
        'stage-1'
      )
    );
  });

  it('carries optional initial state and positions through to the semanticKey', () => {
    const scenario = createMatchupScenarioEntry({
      matchupKey: 'matchup-1',
      opponentOptionKey: 'move-fireball',
      initialState: { attacks: { active: true } },
      playerInitialPosition: 10,
      opponentInitialPosition: -10,
    });

    expect(scenario.semanticKey).toBe(
      createMatchupScenarioSemanticKey(
        'matchup-1',
        'move-fireball',
        undefined,
        { attacks: { active: true } },
        10,
        -10
      )
    );
  });
});
