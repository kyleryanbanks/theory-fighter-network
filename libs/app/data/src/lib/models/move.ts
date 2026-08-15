/**
 * Move entity and related effect/phase types
 */

import {
  CommunityMetadata,
  createCommunityMetadata,
  createEntityMetadata,
  EntityMetadata,
  DataValue,
} from './shared';
import { Region } from './region';
import { RuntimeStatePatch, StateModel } from './state';

export interface MoveDocument {
  gameKey: string;
  characterKey?: string;
  semanticKey: string; // hash(gameSemanticKey + characterSemanticKey + normalizedInputFrames + normalizedPreconditions)
  name: string;

  // Inheritence from game-level or character-level move, if applicable
  parentKey?: string;
  parentOverrides?: (keyof MoveDocument)[];
  
  // Input sequence for this move, using input values from GameDocument.inputs
  sequence?: Step[];

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

export const createMoveDocument = (
  overrides: Partial<MoveDocument> = {}
): MoveDocument => ({
  gameKey: '',
  semanticKey: '',
  name: '',
  preconditions: {},
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});

/**
 * Frame-by-frame input representation
 */
export interface Step {
  directions: string[];  // e.g., ["5", "6"] from GameDocument.inputs.directions values
  buttons: string[];   // e.g., ["mp", "hp"] from GameDocument.inputs.buttons values
  moveKey?: string;  // Optional reference to a MoveDocument semanticKey for this frame
  frames?: number; // number of frames until next input frame (defaults to 1 if omitted)
}

export const createStep = (overrides: Partial<Step> = {}): Step => ({
  directions: [],
  buttons: [],
  frames: 1,
  ...overrides,
});

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

export const createFrameStage = (
  overrides: Partial<FrameStage> = {}
): FrameStage => ({ ...overrides });

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

  /**
   * Projectile spawned on the first active frame of this phase.
   * References a ProjectileDocument by its semanticKey.
   * undefined = no projectile spawned.
   */
  projectileKey?: string;

  notes?: string;
}

export const createMovePhase = (
  overrides: Partial<MovePhase> = {}
): MovePhase => ({ ...overrides });

/**
 * Outcome effects when a move connects, is blocked, etc.
 */
export interface MoveOutcomeEffect<
  TStateModel extends StateModel = StateModel
> {
  hitStop?: DataValue;  // Brief visual pause when move connects (defaults to frames)
  stun?: DataValue;     // Number of frames until target can act again (after hitStop)

  source?: RuntimeStatePatch<TStateModel>;
  target?: RuntimeStatePatch<TStateModel>;
  game?: RuntimeStatePatch<TStateModel>;
}

export const createMoveOutcomeEffect = (
  overrides: Partial<MoveOutcomeEffect> = {}
): MoveOutcomeEffect => ({ ...overrides });

/**
 * Cancel rule for a move phase
 */
export interface PhaseCancelRule {
  startFrame?: number;
  endFrame?: number;
  allowedMoveKeys?: string[];

  notes?: string;
}

export const createPhaseCancelRule = (
  overrides: Partial<PhaseCancelRule> = {}
): PhaseCancelRule => ({ ...overrides });
