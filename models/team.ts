/**
 * Team entity for team-based games
 */

import { CommunityMetadata, EntityMetadata } from './shared';

export interface TeamDocument {
  gameKey: string;
  orderedCharacterKeys: string[];
  label?: string;

  semanticKey: string; // hash(gameSemanticKey + ordered character semanticKeys)

  community: CommunityMetadata;
  meta: EntityMetadata;
}
