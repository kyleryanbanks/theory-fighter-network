import { describe, expect, it } from 'vitest';
import {
  createScenarioResponseEntry,
  createScenarioResponseSemanticKey,
} from './matchup';

describe('createScenarioResponse', () => {
  it('derives a stable key and defaults to trade', () => {
    const response = createScenarioResponseEntry({
      scenarioKey: 'scenario-1',
      playerOptionKey: 'move-backdash',
    });

    expect(response.semanticKey).toBe(
      createScenarioResponseSemanticKey('scenario-1', 'move-backdash')
    );
    expect(response.outcome).toBe(0);
  });

  it('preserves an explicit outcome and notes', () => {
    const response = createScenarioResponseEntry({
      scenarioKey: 'scenario-1',
      playerOptionKey: 'move-dp',
      outcome: 1,
      notes: 'Punishes cleanly',
    });

    expect(response.outcome).toBe(1);
    expect(response.notes).toBe('Punishes cleanly');
  });

  it('rejects an empty player option', () => {
    expect(() =>
      createScenarioResponseEntry({
        scenarioKey: 'scenario-1',
        playerOptionKey: ' ',
      })
    ).toThrow(/playerOptionKey is required/);
  });
});
