/**
 * Character entity and configuration types
 */

import {
  CommunityMetadata,
  EntityMetadata,
  StateModel,
} from './shared';

export interface CharacterDocument {
  id: string;
  gameKey: string;
  semanticKey: string; // hash(gameSemanticKey + normalizedCharacterName)
  name: string;
  archetypes: string[];

  states: StateModel;

  community: CommunityMetadata;
  meta: EntityMetadata;
}
