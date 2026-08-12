/**
 * Shared types used across entities
 */

import { Timestamp } from 'firebase/firestore';

// Re-export SliderAxisDefinition and StateTagDefinition for shared use
export interface SliderAxisDefinition {
  key: string;
  label: string;
  min: number;
  max: number;
  communityAlignmentTolerancePct?: number;
  unit?: string;
  notes?: string;
}

export interface StateTagDefinition {
  key: string;
  description?: string;
  category: 'control' | 'posture' | 'stun' | 'phase' | 'custom';
}

export interface ResourceDefinition {
  key: string;
  label: string;
  max?: number;
  unit?: 'stock' | 'points' | 'percent' | 'timer' | 'custom';
  customUnitLabel?: string;
}

/**
 * Versioning tracking for guides
 */
export interface GuideVersionReference {
  targetVersion: 'latest' | string;
  isVersionLocked: boolean;
  resolvedGameVersion: string;
  lastVerifiedAt?: Timestamp;
  lastKnownLatestVersion?: string;
  isOutOfDate?: boolean;
}

/**
 * Community publishing metadata
 * Consolidated fields for all community-related state across entities
 */
export interface CommunityMetadata {
  // Entity ownership (always present)
  ownerId: string;

  // Publishing state (populated on first publish to community)
  publishedId?: string;
  lastPublishedAt?: Timestamp;

  // Community alignment (computed at publish time for convergence detection)
  semanticFingerprint?: string;
}

/**
 * Comparative attributes for exploratory research
 */
export interface ComparativeAttribute {
  property: ComparativeProperty;
  kind: 'exact' | 'observed' | 'inferred';
  value?: number;
  lowerBound?: number;
  upperBound?: number;
}

export type ComparativeProperty =
  | 'startup'
  | 'active'
  | 'recovery'
  | 'total'
  | 'damage'
  | 'rangeX'
  | 'rangeY'
  | 'rangeZ';

/**
 * Comparative constraint between two moves
 */
export interface ComparativeConstraint {
  property: ComparativeProperty;
  relation: 'lessThan' | 'greaterThan' | 'equalTo';
  otherMoveId: string;
}

/**
 * Ordered grouping of moves for a property
 */
export interface ComparativeOrdering {
  id: string;
  property: ComparativeProperty;
  groups: ComparativeOrderingGroup[];
}

export interface ComparativeOrderingGroup {
  moveIds: string[];
}

export interface ComparativeOrderingRef {
  orderingId: string;
}

/**
 * Verification tracking for entity sections
 */
export interface VerificationRecord {
  status: 'unknown' | 'observed' | 'verified-current' | 'verified-old-version' | 'needs-review';
  verifiedAgainstVersion?: string;
  verifiedAt?: Timestamp;
  notes?: string;
}

export interface VerificationSectionMap {
  sections: Record<string, VerificationRecord>;
}

/**
 * Community guide aggregation
 */
export interface GuideDocument {
  id: string;
  gameId: string;
  publishedEntities: {
    characterIds: string[];
    moveIds: string[];
    comboIds: string[];
    teamIds: string[];
    stageIds: string[];
    matchupIds: string[];
  };
  publishHistory: string[];
}


/**
 * Exploration coverage tracking
 */
export interface ExplorationCoverage {
  gameId: string;
  characterId?: string;
  teamId?: string;
  completionPhase:
    | 'foundation'
    | 'universalSystems'
    | 'roster'
    | 'moveConnectivity'
    | 'moveBalance'
    | 'moveDetails'
    | 'sequences'
    | 'matchups';
  moveCoveragePct: number;
  testedEdgeCoveragePct: number;
  unresolvedHighValueGaps: string[];
}

/**
 * Suggestion for research gaps
 */
export interface SuggestionItem {
  id: string;
  type: 'missingMove' | 'untestedTransition' | 'untestedBlockstring' | 'untestedRangeBand' | 'communityDivergence';
  gameId: string;
  characterId?: string;
  teamId?: string;
  priority: 'low' | 'medium' | 'high';
  reason: string;
  candidateMoveIds?: string[];
  candidateTransitionIds?: string[];
  suggestedForPhase?:
    | 'foundation'
    | 'universalSystems'
    | 'roster'
    | 'moveConnectivity'
    | 'moveBalance'
    | 'moveDetails'
    | 'sequences'
    | 'matchups';
}
