/**
 * Sequence entity and related move ref/difficulty types
 */

import { Timestamp } from 'firebase/firestore';
import { GuideVersionReference, CommunityMetadata, VerificationSectionMap } from './shared';

export interface SequenceDocument {
  id: string;
  gameId: string;

  sequenceScope: 'universal' | 'character' | 'team';
  characterId?: string;
  teamId?: string;
  teamApplicability?: {
    requiredOrderedCharacterIds: string[];
  };

  semanticKey: string; // hash(gameSemanticKey + normalizedMoveSequence)

  name?: string;
  notation?: string;

  moveRefs: SequenceMoveRef[];
  delayAfterStepFrames?: number[];

  computedDifficulty: SequenceDifficulty;
  guideVersion: GuideVersionReference;
  verification?: VerificationSectionMap;

  community: CommunityMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Reference to a move within a sequence
 */
export interface SequenceMoveRef {
  moveId: string;
  scope: 'game' | 'character';
  characterId?: string;
  selectedRangeBandKeys?: Partial<Record<'x' | 'y' | 'z', string>>;
}

/**
 * Computed difficulty for a sequence
 */
export interface SequenceDifficulty {
  score: number;
  factors: {
    comboLength: number;
    timingStrictness: number;
    totalInputComplexity: number;
    bufferLeniencyModifier: number;
  };
  computedAt: Timestamp;
  modelVersion: string;
}

/**
 * Transition edge between moves
 */
export interface MoveTransitionEdge {
  id: string;
  gameId: string;
  fromMoveId: string;
  toMoveId: string;
  scope: 'universal' | 'character' | 'team';
  characterId?: string;
  teamId?: string;

  triggerOutcome: 'onHit' | 'onBlock' | 'onCounterHit';
  requiredPlayerStateTags?: string[];
  requiredOpponentStateTags?: string[];
  requiredRangeBandKeys?: string[];
  requiredScalingState?: string;
  requiredResources?: ResourceRequirement[];
  requiredDelayFrames?: number;

  viability: 'consistent' | 'situational' | 'unconfirmed';
  evidenceLevel: 'observed' | 'measured' | 'verified';
  notes?: string;
}

/**
 * Resource requirement for a transition
 */
export interface ResourceRequirement {
  resourceKey: string;
  amount?: number;
}

/**
 * Sequence pattern for grouping move sequences
 */
export interface SequencePattern {
  id: string;
  gameId: string;
  scope: 'universal' | 'character' | 'team';
  characterId?: string;
  teamId?: string;
  moveRefs: SequenceMoveRef[];

  intentTags: Array<
    'neutralControl'
    | 'screenControl'
    | 'blockstring'
    | 'frametrap'
    | 'mixup'
    | 'comboRoute'
    | 'oki'
  >;

  outcomes?: {
    safeOnBlock?: boolean;
    convertsOnHit?: boolean;
    cornerCarryScore?: number;
    leavesAdvantageousState?: boolean;
  };
}
