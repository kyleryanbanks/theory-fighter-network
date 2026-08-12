/**
 * Matchup entity and related scenario graph types
 */

import { Timestamp } from 'firebase/firestore';
import { GuideVersionReference, VerificationSectionMap } from './shared';

export interface MatchupDocument {
  id: string;
  gameId: string;

  playerSide: MatchupSide;
  opponentSide: MatchupSide;
  scenarioGraph: MatchupScenarioGraph;
  notes?: string;

  semanticKey: string; // hash(gameSemanticKey + ordered character pair semanticKeys)
  semanticFingerprint?: string; // published payload fingerprint

  guideVersion: GuideVersionReference;
  verification?: VerificationSectionMap;

  ownerId: string;
  publishedId?: string;
  lastPublishedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Side of a matchup (player or opponent)
 */
export interface MatchupSide {
  characterId?: string;
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
