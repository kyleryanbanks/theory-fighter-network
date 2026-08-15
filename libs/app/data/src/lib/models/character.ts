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
  gameKey: string;
  semanticKey: string; // hash(gameSemanticKey + normalizedCharacterName)
  name: string;
  archetypes: string[];

  states: StateModel;

  neutralRegions: {
    collisionBoxes?: Region[];
    hurtBoxes?: Region[];
    throwBoxes?: Region[];
  };

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
  states: createStateModel(),
  neutralRegions: {},
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});
