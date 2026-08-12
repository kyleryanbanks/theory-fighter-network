/**
 * Matchup entity and related scenario graph types
 */

import { CommunityMetadata, EntityMetadata } from './shared';

export interface MatchupDocument {
  id: string;
  gameKey: string;

  playerSide: MatchupSide;
  opponentSide: MatchupSide;
  scenarioGraph: MatchupScenarioGraph;
  notes?: string;

  semanticKey: string; // hash(gameSemanticKey + ordered character pair semanticKeys)

  community: CommunityMetadata;
  meta: EntityMetadata;
}

/**
 * Side of a matchup (player or opponent)
 */
export interface MatchupSide {
  characterKey?: string;
  teamId?: string;
}

/**
 * Scenario graph for matchup navigation
 */
export interface MatchupScenarioGraph {
  nodes: MatchupScenarioNode[];
  edges: MatchupScenarioEdge[];
}

/**
 * Node in a scenario graph
 */
export interface MatchupScenarioNode {
  id: string;
  phase: 'neutral' | 'pressure' | 'confirm' | 'combo' | 'oki' | 'reset' | 'defense';
  label: string;
  sequencePatternId?: string;
}

/**
 * Edge in a scenario graph
 */
export interface MatchupScenarioEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  actingSide: 'player' | 'opponent';
  optionLabel: string;
  counteredByEdgeIds?: string[];
  projectedSuccessRate?: number;
  rewardScore?: number;
  riskScore?: number;
  notes?: string;
}
