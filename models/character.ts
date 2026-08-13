/**
 * Character entity and configuration types
 */

import { CommunityMetadata, EntityMetadata } from './shared';
import { StateModel } from './state';
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
