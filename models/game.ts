/**
 * Game entity and related configuration types
 */

import { Timestamp } from 'firebase/firestore';
import { GuideVersionReference, SliderAxisDefinition, StateTagDefinition, ResourceDefinition } from './shared';

// Re-export common types for convenience
export { SliderAxisDefinition, StateTagDefinition, ResourceDefinition };

export interface GameDocument {
  id: string;
  semanticKey: string; // hash(normalizedGameName + versionFamily)
  semanticFingerprint?: string; // published payload fingerprint
  name: string;
  releaseYear: number;
  publisher: string;

  matchRules: {
    roundsToWinMatch: number;
    stocksPerRound?: number;
    timerSeconds?: number;
    teamSize: number;
  };

  frameDataPolicy: {
    exactFrameBehaviorExists: true;
    publishedByGame: boolean;
  };

  customSliderAxes: SliderAxisDefinition[];
  inputSystem: InputSystemProfile;
  playerStateModel: PlayerStateModel;
  opponentStateModel: OpponentStateModel;
  resourceModel: ResourceModel;
  moveTypes: MoveTypeDefinition[];
  comboScalingSystem: ComboScalingSystem;
  guideVersion: GuideVersionReference;

  blockStates: string[];
  stagesAffectGameplay: boolean;

  ownerId: string;
  publishedId?: string;
  lastPublishedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Input system configuration
 */
export interface InputSystemProfile {
  inputBufferLeniencyScore: number;
  motionComplexityWeights: {
    singleNormal: number;
    charge: number;
    quarterCircle: number;
    dragonPunch: number;
    halfCircle: number;
    doubleQuarterCircle: number;
    custom?: Record<string, number>;
  };
}

/**
 * Player state model with available tags
 */
export interface PlayerStateModel {
  stateTags: StateTagDefinition[];
}

/**
 * Opponent state model with available tags
 */
export interface OpponentStateModel {
  stateTags: StateTagDefinition[];
}

/**
 * Resource model defining available resources
 */
export interface ResourceModel {
  resources: ResourceDefinition[];
}

/**
 * Move type definition for game-specific attack classifications
 */
export interface MoveTypeDefinition {
  key: string;
  label: string;
  description?: string;
}

/**
 * Combo scaling system configuration
 */
export interface ComboScalingSystem {
  hitstunScaling?: HitstunScalingSystem;
  damageScaling?: DamageScalingSystem;
  antiInfiniteRules?: AntiInfiniteSystem;
  projectileDurabilitySystem?: ProjectileDurabilitySystem;
}

/**
 * Hitstun scaling rules
 */
export interface HitstunScalingSystem {
  enabled: boolean;
  model: 'linear' | 'step' | 'proration-table' | 'custom';
  minimumHitstunFrames?: number;
  resetConditions?: string[];
  notes?: string;
}

/**
 * Damage scaling rules
 */
export interface DamageScalingSystem {
  enabled: boolean;
  model: 'linear' | 'step' | 'proration-table' | 'custom';
  minimumDamagePercent?: number;
  resetConditions?: string[];
  notes?: string;
}

/**
 * Anti-infinite mechanics
 */
export interface AntiInfiniteSystem {
  enabled: boolean;
  mechanics: string[];
  notes?: string;
}

/**
 * Projectile durability system configuration
 */
export interface ProjectileDurabilitySystem {
  systemType: 'priority' | 'points' | 'priority-and-points' | 'none' | 'custom';
  description?: string;
}
