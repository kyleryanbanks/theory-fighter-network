/**
 * Character entity and configuration types
 */

import {
  CommunityMetadata,
  createCommunityMetadata,
  createEntityMetadata,
  EntityMetadata,
} from './shared';
import { createStateModel, StateModel } from './state';
import { Region } from './region';

export interface CharacterDocument {
  // Scope
  gameKey: string;
  
  // Identity
  semanticKey: string; // hash(gameSemanticKey + normalizedCharacterName)
  name: string;
  archetypes: string[];

  // Hierarchy (direct children)
  hierarchy: {
    moveKeys: string[];
    sequenceKeys: string[];
    projectileKeys: string[];
  };

  // Runtime behavior
  states: StateModel;

  // Geometry
  neutralRegions: {
    collisionBoxes?: Region[];
    hurtBoxes?: Region[];
    throwBoxes?: Region[];
  };

  // Metadata
  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createCharacterDocument = (
  overrides: Partial<CharacterDocument> = {}
): CharacterDocument => ({
  gameKey: '',
  semanticKey: '',
  name: '',
  archetypes: [],
  hierarchy: {
    moveKeys: [],
    sequenceKeys: [],
    projectileKeys: [],
  },
  states: createStateModel(),
  neutralRegions: {},
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});
