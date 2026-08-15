/**
 * Stage entity and zone types
 */

import {
  CommunityMetadata,
  createCommunityMetadata,
  createEntityMetadata,
  EntityMetadata,
} from './shared';

export interface StageDocument {
  gameKey: string;
  name: string;
  semanticKey: string; // hash(gameSemanticKey + normalizedStageName)

  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createStageDocument = (
  overrides: Partial<StageDocument> = {}
): StageDocument => ({
  gameKey: '',
  name: '',
  semanticKey: '',
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});

/**
 * Stage zone for environmental interactions
 */
export interface StageZoneDocument {
  gameKey: string;
  stageKey?: string; // optional - if not present, zone is game-level/universal
  name: string;
  semanticKey: string; // hash(gameSemanticKey + [stageSemanticKey] + name)
  
  inheritedFromZoneKey?: string;
  fieldOverrides?: (keyof StageZoneDocument)[];

  // Reference to stageMechanic state(s) that define behavior and properties
  mechanicStateKeys: string[];

  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createStageZoneDocument = (
  overrides: Partial<StageZoneDocument> = {}
): StageZoneDocument => ({
  gameKey: '',
  name: '',
  semanticKey: '',
  mechanicStateKeys: [],
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});
