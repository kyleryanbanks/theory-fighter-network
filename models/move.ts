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
  name: string;

  // Inheritence from game-level or character-level move, if applicable
  ParentKey?: string;
  overrides?: (keyof MoveDocument)[];
  
  // Input sequence for this move, using input values from GameDocument.inputs
  inputFrames?: TriggerInputFrame[];

  preconditions: {
    requiredPlayerState?: string[];
    forbiddenPlayerState?: string[];
    requiredOpponentState?: string[];
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
 * Phase within a move
 */
export interface MovePhase {
  label?: string;

  hitStop?: DataValue;  // Brief visual pause when move connects (defaults to frames)
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

  /**
   * Projectile spawned on the first active frame of this phase.
   * References a ProjectileDocument by its semanticKey.
   * undefined = no projectile spawned.
   */
  projectileKey?: string;

  notes?: string;
}

/**
 * Outcome effects when a move connects, is blocked, etc.
 * Targets:
 * - source: the character/projectile that created this effect
 * - target: the character/projectile that received this effect
 */
export interface MoveOutcomeEffect {

  source?: {
    displacement?: DisplacementEffect;
    resources?: ResourceEffect[];
    appliesStateTags?: string[];
  };

  target?: {
    stun?: DataValue;  // Hitstun on hit, blockstun on block, etc. (type implicit in parent outcome)
    displacement?: DisplacementEffect;
    resources?: ResourceEffect[];
    appliesStateTags?: string[];
  };

  /**
   * If true, the projectile that caused this effect is destroyed.
   * Only applies if the source is a projectile.
   */
  projectileDestroyed?: boolean;
}

/**
 * Cancel rule for a move phase
 */
export interface PhaseCancelRule {
  startFrame?: number;
  endFrame?: number;
  allowedMoveKeys?: string[];
  notes?: string;
}

/**
 * Displacement effects on characters/projectiles
 */
export interface DisplacementEffect {
  x?: DataValue;
  y?: DataValue;
  z?: DataValue;        // Only used if game.is3d
  
  velocity?: {
    x?: DataValue;      // For continuous motion during displacement
    y?: DataValue;
    z?: DataValue;      // Only used if game.is3d
  };
  
  delay?: DataValue;    // Frames before displacement starts
  duration?: DataValue; // How long displacement lasts
  notes?: string;
}

/**
 * Resource effect (meter gain/cost, etc.)
 */
export interface ResourceEffect {
  resourceKey: string;
  amount: DataValue;        // Add/subtract from resource (legacy: gain meter, spend meter)
}

/**
 * Projectile profile for projectile moves
 */
export interface ProjectileProfile {
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
