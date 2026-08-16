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
  // Scope
  gameKey: string;
  
  // Identity
  semanticKey: string; // hash(gameSemanticKey + ordered character semanticKeys)
  
  // Composition
  orderedCharacterKeys: string[];

  // Hierarchy (direct children)
  hierarchy: {
    sequenceKeys: string[];
  };

  // Metadata
  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createTeamDocument = (
  overrides: Partial<TeamDocument> = {}
): TeamDocument => ({
  gameKey: '',
  semanticKey: '',
  orderedCharacterKeys: [],
  hierarchy: {
    sequenceKeys: [],
  },
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});
