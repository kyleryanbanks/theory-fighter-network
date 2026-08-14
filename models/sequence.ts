/**
 * Sequence entity and related move ref/difficulty types
 */

import { Timestamp } from 'firebase/firestore';
import { CommunityMetadata, EntityMetadata } from './shared';

export interface SequenceDocument {
  gameKey: string;

  sequenceScope: 'universal' | 'character' | 'team';
  characterKey?: string;
  teamKey?: string;
  teamApplicability?: {
    requiredOrderedCharacterKeys: string[];
  };

  semanticKey: string; // hash(gameSemanticKey + normalizedMoveSequence)

  name?: string;
  notation?: string;
  moveRefs: SequenceMoveRef[];
  delayAfterStepFrames?: number[];
  computedDifficulty: SequenceDifficulty;

  community: CommunityMetadata;
  meta: EntityMetadata;
}

/**
 * Reference to a move within a sequence
 */
export interface SequenceMoveRef {
  moveKey: string;
  scope: 'game' | 'character';
  characterKey?: string;
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
  gameKey: string;
  scope: 'universal' | 'character' | 'team';
  characterKey?: string;
  teamKey?: string;
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
