/**
 * Character entity and configuration types
 */

import { CommunityMetadata, EntityMetadata } from './shared';
import { StateModel } from './state';

export interface CharacterDocument {
  gameKey: string;
  semanticKey: string; // hash(gameSemanticKey + normalizedCharacterName)
  name: string;
  archetypes: string[];

  states: StateModel;

  community: CommunityMetadata;
  meta: EntityMetadata;
}
