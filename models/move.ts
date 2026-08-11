/**
 * Move entity and related effect/phase types
 */

import { Timestamp } from 'firebase/firestore';
import {
  GuideVersionReference,
  ComparativeAttribute,
  ComparativeConstraint,
  ComparativeOrderingRef,
  VerificationSectionMap,
} from './shared';

export interface MoveDocument {
  id: string;
  gameId: string;
  characterId?: string;

  inheritedFromMoveId?: string;
  fieldOverrides?: (keyof MoveDocument)[];

  name: string;
  categoryKey?: string;

  // Input sequence for this move, using buttons defined in GameDocument.inputSystem
  inputFrames?: TriggerInputFrame[];

  preconditions: {
    requiredAllPlayerStateTags?: string[];
    forbiddenPlayerStateTags?: string[];
    requiredAllOpponentStateTags?: string[];
    followUpOnlyFromMoveIds?: string[];
    cancelFromMoveIds?: string[];
  };

  phases?: MovePhase[];

  frameDataKnowledge: {
    status: 'observed' | 'measured' | 'verified';
    sourceNotes?: string;
  };
  verification?: VerificationSectionMap;

  comparativeAttributes: ComparativeAttribute[];
  comparativeConstraints?: ComparativeConstraint[];
  comparativeOrderings?: ComparativeOrderingRef[];

  ownerId: string;
  communityId?: string;
  lastPublishedAt?: Timestamp;
  guideVersion: GuideVersionReference;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Frame-by-frame input representation
 */
export interface TriggerInputFrame {
  directions: number[];
  buttons: string[];
  durationFrames?: number;
}

/**
 * Phase within a move
 */
export interface MovePhase {
  label?: string;
  startFrame?: number;
  frameData?: {
    startup?: number;
    active?: number;
    recovery?: number;
  };

  rangeProfile?: MoveRangeProfile;
  comboScalingEffects?: MoveComboScalingEffects;

  effects?: {
    onHit?: MoveOutcomeEffect;
    onBlock?: MoveOutcomeEffect;
    onCounterHit?: MoveOutcomeEffect;
    onWhiff?: MoveOutcomeEffect;
    onSecondaryTrigger?: MoveOutcomeEffect;
  };

  cancelOptions?: {
    onHit?: PhaseCancelRule[];
    onBlock?: PhaseCancelRule[];
    onCounterHit?: PhaseCancelRule[];
    onWhiff?: PhaseCancelRule[];
    onSecondaryTrigger?: PhaseCancelRule[];
  };

  canBeBlocked?: string[];

  knowledgeStatus: 'observed' | 'measured' | 'verified';
  notes?: string;
}

/**
 * Range profile for a move or phase
 */
export interface MoveRangeProfile {
  comparativeAxes?: RangeAxisProfile[];
  bands: RangeBand[];
}

/**
 * Range band for precise distance tracking
 */
export interface RangeBand {
  key: string;
  label: string;
  axis: 'x' | 'y' | 'z';
  minDistance?: number;
  maxDistance?: number;
  relativeSide?: 'front' | 'behind' | 'both';
}

/**
 * Comparative range axis
 */
export interface RangeAxisProfile {
  axis: 'x' | 'y' | 'z';
  comparisons?: Array<{
    otherMoveId: string;
    relation: 'shorter' | 'same' | 'longer';
  }>;
}

/**
 * Combo scaling effects for a move phase
 */
export interface MoveComboScalingEffects {
  hitstun?: {
    modifierFrames?: number;
    causesForcedProration?: boolean;
    ignoresScaling?: boolean;
    resetsTrigger?: boolean;
  };
  damage?: {
    scalingPercentDelta?: number;
    causesForcedProration?: boolean;
    ignoresScaling?: boolean;
    resetsTrigger?: boolean;
  };
  juggleCost?: number;
  juggleGain?: number;
  repeatPenaltyClass?: string;
  notes?: string;
}

/**
 * Outcome effects when a move connects, is blocked, etc.
 */
export interface MoveOutcomeEffect {
  playerEffects?: {
    positionalEffect?: PositionalEffect;
    resourceEffects?: ResourceEffect[];
    appliesStateTags?: string[];
  };

  opponentEffects?: {
    positionalEffect?: PositionalEffect;
    resourceEffects?: ResourceEffect[];
    appliesStateTags?: string[];
  };

  stageInteraction?: {
    targetZoneIds?: string[];
    targetZoneTypes?: Array<'wall' | 'floor' | 'ceiling'>;
    causesSplat?: {
      enabled: boolean;
      appliesOpponentStateTag?: string;
    };
    causesBreak?: {
      enabled: boolean;
      appliesOpponentStateTag?: string;
    };
    causesScreenTransition?: {
      transitions: boolean;
      repositionCharacters?: {
        playerX?: number;
        playerY?: number;
        opponentX?: number;
        opponentY?: number;
      };
      stillComboable?: boolean;
    };
    durabilityEffect?: {
      applies: boolean;
      points?: number;
    };
  };

  frameAdvantage?: FrameOutcomeWindow;
  knowledgeStatus?: 'observed' | 'measured' | 'verified';
}

/**
 * Frame advantage window
 */
export interface FrameOutcomeWindow {
  base?: number;
  min?: number;
  max?: number;
  meatyAdvantageGain?: number;
  notes?: string;
}

/**
 * Cancel rule for a move phase
 */
export interface PhaseCancelRule {
  windowStartFrame?: number;
  windowEndFrame?: number;
  allowedMoveIds?: string[];
  requiredPlayerStateTags?: string[];
  requiredOpponentStateTags?: string[];
  notes?: string;
}

/**
 * Positional effects on the attacker
 */
export interface PositionalEffect {
  displacesCharacter: boolean;
  displacement?: {
    x?: ComparativeAttribute;
    y?: ComparativeAttribute;
  };
  displacementStartFrame?: number;
  displacementDuration?: number;
  crossupCapable?: boolean;
  notes?: string;
}

/**
 * Positional effects on the opponent
 */
export interface OpponentPositionalEffect {
  displacement?: {
    x?: ComparativeAttribute;
    y?: ComparativeAttribute;
  };
  displacementStartFrame?: number;
  displacementDuration?: number;
  notes?: string;
}

/**
 * Resource effect (meter gain/cost, etc.)
 */
export interface ResourceEffect {
  resourceKey: string;
  amount: number;
}

/**
 * Projectile profile for projectile moves
 */
export interface ProjectileProfile {
  isProjectile: true;

  behavior: {
    motion: 'fixed-forward' | 'fixed-diagonal' | 'arc' | 'homing' | 'stationary' | 'custom';
    customMotionNotes?: string;
    destroyedOnHit: boolean;
    canBeDestroyedByPhysical: boolean;
    hitsBeforeDestroyed?: number;
    activeFrames?: number;
    travelSpeed?: number;
  };

  durability: {
    priorityLevel?: number;
    durabilityPoints?: number;
    knowledgeStatus: 'observed' | 'measured' | 'verified';
    customNotes?: string;
  };

  interaction: {
    interactsWithProjectiles: boolean;
    interactsWithPhysical: boolean;
    interactionConditions?: string[];
  };

  clashResults?: ProjectileClashResult[];
}

/**
 * Projectile clash result
 */
export interface ProjectileClashResult {
  againstMoveId: string;
  result: 'wins' | 'ties' | 'loses' | 'passes-through' | 'unknown';
  conditionsNotes?: string;
  knowledgeClass: 'observed' | 'measured' | 'verified';
}
