/**
 * Matchup entity and scenario comparison types
 */

import { CommunityMetadata, EntityMetadata } from './shared';
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
