/**
 * Projectile entity and related types
 * 
 * Projectiles are moves without input triggers.
 * They are spawned by moves and live as independent entities during simulation.
 * Users define projectile properties using the game's states.projectiles category.
 */

import {
  CommunityMetadata,
  EntityMetadata,
  DataValue,
} from './shared';
import { StateModel, RuntimeStateModel, GameStateContext } from './state';

/**
 * ProjectileDocument defines a reusable projectile template.
 * Similar to MoveDocument, but with no inputFrames (spawned by moves, not player input).
 * Projectiles have phases that describe their motion and interaction over time.
 */
export interface ProjectileDocument<
  TStateModel extends StateModel = StateModel
> {
  gameKey: string;
  characterKey?: string;  // Character-specific projectile (or undefined for universal)
  semanticKey: string;    // hash(gameSemanticKey + [characterSemanticKey] + projectileName)
  name: string;

  /**
   * Phases describing projectile lifetime:
   * - Duration: how long this phase lasts (frames)
   * - Velocity: motion per frame (in game dimensions, e.g., x/y or x/y/z)
   * - Position: starting position for this phase
   * - Hitboxes: regions that cause damage
   * - Hurtboxes: regions that can be destroyed
   * - Collisionboxes: non-damaging collision regions
   * - Effects: what happens on hit/block/whiff
   * - destroyedAfter: if true, projectile ends after this phase
   */
  phases: ProjectilePhase[];

  /**
   * Initial state values for this projectile template.
   * These are copied into ProjectileInstance.runtimeState when the projectile spawns.
   * Users can set any state from game.states.projectiles here.
   * 
   * Example:
   * state: {
   *   projectiles: {
   *     durability: 1,
   *     priority: 3
   *   }
   * }
   */
  state: RuntimeStateModel<TStateModel>;

  community: CommunityMetadata;
  meta: EntityMetadata;
}

/**
 * Single phase of a projectile's lifetime
 */
export interface ProjectilePhase {
  label?: string;

  /**
   * Duration of this phase (frames)
   */
  duration: DataValue;

  /**
   * Velocity per frame during this phase.
   * Keys depend on game.is3d:
   * - 2D games: x, y
   * - 3D games: x, y, z
   * 
   * Example: { x: { exact: 5 }, y: { exact: 0 } }
   * Position at frame N = initialPosition + (velocity * N)
   */
  velocity?: {
    x?: DataValue;
    y?: DataValue;
    z?: DataValue;  // Only used if game.is3d
  };

  /**
   * Starting position for this phase (absolute coordinates).
   * If undefined, continues from previous phase's end position.
   * 
   * Keys depend on game.is3d:
   * - 2D games: x, y
   * - 3D games: x, y, z
   * 
   * Example: { x: { exact: 0 }, y: { exact: 100 } }
   */
  initialPosition?: {
    x?: DataValue;
    y?: DataValue;
    z?: DataValue;  // Only used if game.is3d
  };

  /**
   * Hitboxes that deal damage when they touch opponent hurtboxes.
   * Defined relative to projectile origin.
   */
  hitBoxes?: Region[];

  /**
   * Hurtboxes that receive damage (e.g., projectile can be destroyed by opponent attack).
   * Defined relative to projectile origin.
   */
  hurtBoxes?: Region[];

  /**
   * Collision boxes for stage boundaries or non-damaging obstruction.
   * Defined relative to projectile origin.
   */
  collisionBoxes?: Region[];

  /**
   * Effects this projectile applies when it connects
   */
  effects?: {
    onHit?: MoveOutcomeEffect;        // Hit opponent character/projectile
    onBlock?: MoveOutcomeEffect;      // Opponent blocked the projectile
    onCounterHit?: MoveOutcomeEffect; // Hit opponent during their active frames
    onWhiff?: MoveOutcomeEffect;      // Missed entirely
  };

  /**
   * If true, projectile is destroyed at the end of this phase (lifetime expiration).
   * If false, transitions to next phase.
   */
  destroyedAfter?: boolean;

  notes?: string;
}

/**
 * Collision geometry (hitbox, hurtbox, collision box)
 * Defined as offset from entity origin
 */
export interface Region {
  x?: number;
  y?: number;
  z?: number;       // Only used if game.is3d
  width?: number;   // For rectangular regions
  height?: number;  // For rectangular regions
  depth?: number;   // For rectangular regions (3D)
  radius?: number;  // For circular regions
}

/**
 * Outcome effects (re-export from move.ts for convenience)
 */
export interface MoveOutcomeEffect {
  source?: {
    displacement?: DisplacementEffect;
    resources?: ResourceEffect[];
    appliesStateTags?: string[];
  };

  target?: {
    stun?: DataValue;
    displacement?: DisplacementEffect;
    resources?: ResourceEffect[];
    appliesStateTags?: string[];
  };

  projectileDestroyed?: boolean;
}

/**
 * Displacement effect structure
 */
export interface DisplacementEffect {
  x?: DataValue;
  y?: DataValue;
  z?: DataValue;
  velocity?: {
    x?: DataValue;
    y?: DataValue;
    z?: DataValue;
  };
  delay?: DataValue;
  duration?: DataValue;
  notes?: string;
}

/**
 * Resource effect structure
 */
export interface ResourceEffect {
  resourceKey: string;
  amount: DataValue;
}

/**
 * Runtime instance of an active projectile during simulation
 */
export interface ProjectileInstance<
  TStateModel extends StateModel = StateModel
> {
  /**
   * Unique ID for this projectile instance during the current simulation
   */
  id: string;

  /**
   * Reference to the ProjectileDocument this instance was created from
   */
  projectileSemanticKey: string;

  /**
   * When was this projectile spawned (game frame number)
   */
  spawnedAtGameFrame: number;

  /**
   * Which phase of the projectile are we currently in (0-indexed)
   */
  currentPhaseIndex: number;

  /**
   * Current runtime state of the projectile
   * This is the mutable copy of projectileDocument.state
   * Can be modified by effects or onUpdate/onFrameAdvance callbacks
   */
  runtimeState: RuntimeStateModel<TStateModel>;

  /**
   * Current position of projectile origin in world space
   */
  currentPosition: {
    x: number;
    y: number;
    z?: number;  // Only used if game.is3d
  };

  /**
   * When was this projectile destroyed (frame number), if applicable
   * undefined = still active
   */
  destroyedAtGameFrame?: number;
}
