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
import { normalizeGameName } from './game';

export interface MoveDocument {
  gameKey: string;
  characterKey?: string;
  semanticKey: string; // hash(gameSemanticKey + [characterSemanticKey] + normalizedMoveName)
  name: string;

  // Inheritence from game-level or character-level move, if applicable.
  // Overrides are full forks (copied once, then independent) rather than a
  // live per-field merge, so there is no separate override-tracking array.
  parentKey?: string;
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

export interface CreateMoveInput {
  gameKey: string;
  name: string;
  characterKey?: string; // If provided, move is character-scoped; otherwise game-level/universal
  parentKey?: string; // Set when this Move overrides a universal Move
}

export function createMove(input: CreateMoveInput): MoveDocument {
  const move = createMoveDocument({
    gameKey: input.gameKey.trim(),
    characterKey: input.characterKey,
    name: input.name.trim(),
    semanticKey: createMoveSemanticKey(
      input.gameKey,
      input.characterKey,
      input.name
    ),
    parentKey: input.parentKey,
  });
  assertValidMoveDocument(move);
  return move;
}

export function createMoveSemanticKey(
  gameKey: string,
  characterKey: string | undefined,
  name: string
): string {
  const normalizedName = normalizeGameName(name);
  const scope = characterKey
    ? `${gameKey.trim()}:${characterKey.trim()}:${normalizedName}`
    : `${gameKey.trim()}:${normalizedName}`;
  return `move-${fnv1a(scope)}`;
}

export function validateMoveDocument(move: MoveDocument): string[] {
  const errors: string[] = [];

  if (!move.gameKey.trim()) {
    errors.push('gameKey is required.');
  }
  if (!move.name.trim()) {
    errors.push('name is required.');
  }
  if (move.gameKey.trim() && move.name.trim()) {
    const expectedKey = createMoveSemanticKey(
      move.gameKey,
      move.characterKey,
      move.name
    );
    if (move.semanticKey !== expectedKey) {
      errors.push(
        'semanticKey does not match the Game, Character, and Move name.'
      );
    }
  }

  return errors;
}

function assertValidMoveDocument(move: MoveDocument): void {
  const errors = validateMoveDocument(move);
  if (errors.length > 0) {
    throw new Error(`Invalid Move document: ${errors.join(' ')}`);
  }
}

/**
 * Merges an override Move with its parent universal Move: any data field the
 * override hasn't set locally (still at its unset/factory-default value)
 * live-inherits the parent's current value, so later parent edits keep
 * propagating to overrides that never customized that specific field.
 */
export function resolveEffectiveMove(
  move: MoveDocument,
  allMoves: MoveDocument[]
): MoveDocument {
  if (!move.parentKey) {
    return move;
  }
  const parent = allMoves.find((m) => m.semanticKey === move.parentKey);
  if (!parent) {
    return move;
  }

  return {
    ...move,
    sequence: move.sequence ?? parent.sequence,
    phases: move.phases ?? parent.phases,
    preconditions:
      Object.keys(move.preconditions ?? {}).length > 0
        ? move.preconditions
        : parent.preconditions,
  };
}

function fnv1a(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

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

  cancels?: PhaseCancelRule[]; // Cancel windows available from this outcome

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
  cancelGroupKeys?: string[];   // References to reusable cancel groups (game or character level)
  allowedMoveKeys?: string[];   // Phase-level custom move additions (merged with all referenced groups)

  notes?: string;
}

export const createPhaseCancelRule = (
  overrides: Partial<PhaseCancelRule> = {}
): PhaseCancelRule => ({ ...overrides });
