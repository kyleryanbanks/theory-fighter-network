/**
 * Matchup entity and scenario comparison types
 */

import {
  CommunityMetadata,
  createCommunityMetadata,
  createEntityMetadata,
  EntityMetadata,
} from './shared';
import { RuntimeStateModel } from './state';

/**
 * Matchup document for comparing two characters/teams
 */
export interface MatchupDocument {
  gameKey: string;
  stageKey?: string;

  semanticKey: string; // hash(gameSemanticKey + attackerKey + defenderKey + name)
  name: string;

  attackerKey: string;
  defenderKey: string;

  scenarios: MatchupScenario[];

  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createMatchupDocument = (
  overrides: Partial<MatchupDocument> = {}
): MatchupDocument => ({
  gameKey: '',
  semanticKey: '',
  name: '',
  attackerKey: '',
  defenderKey: '',
  scenarios: [],
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});

export interface CreateMatchupInput {
  gameKey: string;
  attackerKey: string;
  defenderKey: string;
  name: string;
  stageKey?: string;
}

export function createMatchup(input: CreateMatchupInput): MatchupDocument {
  const attackerKey = input.attackerKey.trim();
  const defenderKey = input.defenderKey.trim();
  const name = input.name.trim();

  if (attackerKey === defenderKey) {
    throw new Error('attackerKey and defenderKey must be different.');
  }
  if (!name) {
    throw new Error('name is required.');
  }

  const matchup = createMatchupDocument({
    gameKey: input.gameKey.trim(),
    attackerKey,
    defenderKey,
    name,
    stageKey: input.stageKey?.trim() || undefined,
    semanticKey: createMatchupSemanticKey(
      input.gameKey,
      attackerKey,
      defenderKey,
      name
    ),
  });
  assertValidMatchupDocument(matchup);
  return matchup;
}

export function createMatchupSemanticKey(
  gameKey: string,
  attackerKey: string,
  defenderKey: string,
  name: string
): string {
  return `matchup-${fnv1a(
    `${gameKey.trim()}:${attackerKey.trim()}:${defenderKey.trim()}:${name
      .trim()
      .toLowerCase()}`
  )}`;
}

export function validateMatchupDocument(matchup: MatchupDocument): string[] {
  const errors: string[] = [];

  if (!matchup.gameKey.trim()) {
    errors.push('gameKey is required.');
  }
  if (!matchup.attackerKey.trim()) {
    errors.push('attackerKey is required.');
  }
  if (!matchup.defenderKey.trim()) {
    errors.push('defenderKey is required.');
  }
  if (!matchup.name.trim()) {
    errors.push('name is required.');
  }
  if (
    matchup.attackerKey.trim() &&
    matchup.defenderKey.trim() &&
    matchup.attackerKey.trim() === matchup.defenderKey.trim()
  ) {
    errors.push('attackerKey and defenderKey must be different.');
  }
  if (
    matchup.gameKey.trim() &&
    matchup.attackerKey.trim() &&
    matchup.defenderKey.trim() &&
    matchup.name.trim()
  ) {
    const expectedKey = createMatchupSemanticKey(
      matchup.gameKey,
      matchup.attackerKey,
      matchup.defenderKey,
      matchup.name
    );
    if (matchup.semanticKey !== expectedKey) {
      errors.push(
        'semanticKey does not match the Game, attacker, defender, and name.'
      );
    }
  }

  return errors;
}

function assertValidMatchupDocument(matchup: MatchupDocument): void {
  const errors = validateMatchupDocument(matchup);
  if (errors.length > 0) {
    throw new Error(`Invalid Matchup document: ${errors.join(' ')}`);
  }
}

function fnv1a(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * A specific scenario within a matchup
 * Represents a single game state where opponent will execute a sequence
 * User tries different responses to find solutions
 * 
 * If parentScenarioKey is provided, attacker/defender roles flip implicitly (counter-scenario)
 */
export interface MatchupScenario {
  id: string;
  semanticKey: string; // hash(matchupKey + opponentOptionKey + initialState + playerInitialPosition + opponentInitialPosition)
  name?: string;
  notes?: string;

  // The move or sequence the opponent executes
  opponentOptionKey: string; // move or sequence semanticKey (uniqueness guaranteed)

  // Starting game state for this scenario
  initialState?: Partial<RuntimeStateModel>;

  // Initial character positioning
  playerInitialPosition?: number;
  opponentInitialPosition?: number;

  // Link to parent scenario if this is a response/counter
  // If present, attacker/defender roles flip from parent
  parentScenarioKey?: string;

  responses: ScenarioResponse[];
}

export const createMatchupScenario = (
  overrides: Partial<MatchupScenario> = {}
): MatchupScenario => ({
  id: '',
  semanticKey: '',
  opponentOptionKey: '',
  responses: [],
  ...overrides,
});

/**
 * A player response to the opponent option in a scenario
 * Captures what the player tried and the outcome
 */
export interface ScenarioResponse {
  semanticKey: string; // hash(scenarioKey + playerOptionKey)
  playerOptionKey: string; // move or sequence semanticKey (uniqueness guaranteed)
  notes?: string;
  outcome: -1 | 0 | 1; // -1 loss, 0 draw, +1 win
}

export const createScenarioResponse = (
  overrides: Partial<ScenarioResponse> = {}
): ScenarioResponse => ({
  semanticKey: '',
  playerOptionKey: '',
  outcome: 0,
  ...overrides,
});
