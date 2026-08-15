/**
 * Team entity for team-based games
 */

import {
  CommunityMetadata,
  createCommunityMetadata,
  createEntityMetadata,
  EntityMetadata,
} from './shared';

export interface TeamDocument {
  gameKey: string;
  orderedCharacterKeys: string[];

  semanticKey: string; // hash(gameSemanticKey + ordered character semanticKeys)

  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createTeamDocument = (
  overrides: Partial<TeamDocument> = {}
): TeamDocument => ({
  gameKey: '',
  orderedCharacterKeys: [],
  semanticKey: '',
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});
