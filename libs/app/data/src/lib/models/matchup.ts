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

  semanticKey: string; // hash(gameSemanticKey + attackerKey + defenderKey)

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
}

export function createMatchup(input: CreateMatchupInput): MatchupDocument {
  const attackerKey = input.attackerKey.trim();
  const defenderKey = input.defenderKey.trim();

  const matchup = createMatchupDocument({
    gameKey: input.gameKey.trim(),
    attackerKey,
    defenderKey,
    semanticKey: createMatchupSemanticKey(
      input.gameKey,
      attackerKey,
      defenderKey
    ),
  });
  assertValidMatchupDocument(matchup);
  return matchup;
}

export function createMatchupSemanticKey(
  gameKey: string,
  attackerKey: string,
  defenderKey: string
): string {
  return `matchup-${fnv1a(
    `${gameKey.trim()}:${attackerKey.trim()}:${defenderKey.trim()}`
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
  if (
    matchup.gameKey.trim() &&
    matchup.attackerKey.trim() &&
    matchup.defenderKey.trim()
  ) {
    const expectedKey = createMatchupSemanticKey(
      matchup.gameKey,
      matchup.attackerKey,
      matchup.defenderKey
    );
    if (matchup.semanticKey !== expectedKey) {
      errors.push('semanticKey does not match the Game, attacker, and defender.');
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
  semanticKey: string; // hash(matchupKey + opponentOptionKey + stageKey + initialState + playerInitialPosition + opponentInitialPosition)
  name?: string;
  notes?: string;

  // Optional Stage this scenario is scoped to; omitted means any Stage
  stageKey?: string;

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

export interface CreateMatchupScenarioInput {
  matchupKey: string;
  opponentOptionKey: string;
  name?: string;
  notes?: string;
  stageKey?: string;
  initialState?: Partial<RuntimeStateModel>;
  playerInitialPosition?: number;
  opponentInitialPosition?: number;
  parentScenarioKey?: string;
}

export function createMatchupScenarioEntry(
  input: CreateMatchupScenarioInput
): MatchupScenario {
  const opponentOptionKey = input.opponentOptionKey.trim();
  if (!opponentOptionKey) {
    throw new Error('opponentOptionKey is required.');
  }

  const stageKey = input.stageKey?.trim() || undefined;
  const semanticKey = createMatchupScenarioSemanticKey(
    input.matchupKey,
    opponentOptionKey,
    stageKey,
    input.initialState,
    input.playerInitialPosition,
    input.opponentInitialPosition
  );

  return createMatchupScenario({
    id: semanticKey,
    semanticKey,
    opponentOptionKey,
    name: input.name?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    stageKey,
    initialState: input.initialState,
    playerInitialPosition: input.playerInitialPosition,
    opponentInitialPosition: input.opponentInitialPosition,
    parentScenarioKey: input.parentScenarioKey?.trim() || undefined,
  });
}

export function createMatchupScenarioSemanticKey(
  matchupKey: string,
  opponentOptionKey: string,
  stageKey?: string,
  initialState?: Partial<RuntimeStateModel>,
  playerInitialPosition?: number,
  opponentInitialPosition?: number
): string {
  return `scenario-${fnv1a(
    [
      matchupKey.trim(),
      opponentOptionKey.trim(),
      stageKey?.trim() ?? '',
      canonicalize(initialState),
      playerInitialPosition ?? '',
      opponentInitialPosition ?? '',
    ].join(':')
  )}`;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`
  );
  return `{${entries.join(',')}}`;
}

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

export interface CreateScenarioResponseInput {
  scenarioKey: string;
  playerOptionKey: string;
  notes?: string;
  outcome?: -1 | 0 | 1;
}

export function createScenarioResponseEntry(
  input: CreateScenarioResponseInput
): ScenarioResponse {
  const playerOptionKey = input.playerOptionKey.trim();
  if (!playerOptionKey) {
    throw new Error('playerOptionKey is required.');
  }

  return createScenarioResponse({
    semanticKey: createScenarioResponseSemanticKey(
      input.scenarioKey,
      playerOptionKey
    ),
    playerOptionKey,
    notes: input.notes?.trim() || undefined,
    outcome: input.outcome ?? 0,
  });
}

export function createScenarioResponseSemanticKey(
  scenarioKey: string,
  playerOptionKey: string
): string {
  return `response-${fnv1a(`${scenarioKey.trim()}:${playerOptionKey.trim()}`)}`;
}
