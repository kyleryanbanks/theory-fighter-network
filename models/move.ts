/**
 * Move entity and related effect/phase types
 */

import {
  CommunityMetadata,
  EntityMetadata,
  DataValue,
} from './shared';
import { Region } from './region';

export interface MoveDocument {
  gameKey: string;
  characterKey?: string;
  semanticKey: string; // hash(gameSemanticKey + characterSemanticKey + normalizedInputFrames + normalizedPreconditions)

  inheritedFromMoveKey?: string;
  fieldOverrides?: (keyof MoveDocument)[];

  name: string;
  
  // Input sequence for this move, using input values from GameDocument.inputs
  inputFrames?: TriggerInputFrame[];

  preconditions: {
    requiredAllPlayerStateTags?: string[];
    forbiddenPlayerStateTags?: string[];
    requiredAllOpponentStateTags?: string[];
    followUpOnlyFromMoveKeys?: string[];
    cancelFromMoveKeys?: string[];
  };

  phases?: MovePhase[];

  community: CommunityMetadata;
  meta: EntityMetadata;
}

/**
 * Frame-by-frame input representation
 */
export interface TriggerInputFrame {
  directions: string[];  // e.g., ["5", "6"] from GameDocument.inputs.directions values
  buttons: string[];     // e.g., ["mp", "hp"] from GameDocument.inputs.buttons values
  durationFrames?: number;
}

/**
 * Single frame stage (startup, active, or recovery) with region and duration information
 */
export interface FrameStage {
  duration?: DataValue;
  collisionBoxes?: Region[];
  hurtBoxes?: Region[];
  hitBoxes?: Region[];
  throwBoxes?: Region[];
}

/**
 * Phase within a move (startup, active, recovery)
 */
export interface MovePhase {
  startup?: FrameStage;
  active?: FrameStage;
  recovery?: FrameStage;

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
  hitStop?: DataValue;  // Brief visual pause when move connects (defaults to frames)

  player?: {
    positional?: PositionalEffect;
    resources?: ResourceEffect[];
    appliesStateTags?: string[];
  };

  opponent?: {
    stun?: DataValue;  // Hitstun on hit, blockstun on block, etc. (type implicit in parent outcome)
    positional?: PositionalEffect;
    resources?: ResourceEffect[];
    appliesStateTags?: string[];
  };

  stageInteraction?: {
    targetZoneKeys?: string[];
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
  allowedMoveKeys?: string[];
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
    x?: DataValue;
    y?: DataValue;
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
    x?: DataValue;
    y?: DataValue;
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
  
  // One of the following must be present:
  amount?: DataValue;        // Add/subtract from resource (legacy: gain meter, spend meter)
  delta?: DataValue;         // Modify resource by delta amount (reduce scaling by 10%)
  multiply?: DataValue;      // Multiply resource by factor (scale hitstun by 0.9)
  exact?: DataValue;         // Set resource to exact value (reset scaling to 100%)
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
  againstMoveKey: string;
  result: 'wins' | 'ties' | 'loses' | 'passes-through' | 'unknown';
  conditionsNotes?: string;
}
