/**
 * Sequence entity and related move ref/difficulty types
 */

import { Step } from './move';
import {
  CommunityMetadata,
  createCommunityMetadata,
  createEntityMetadata,
  EntityMetadata,
} from './shared';

export interface SequenceDocument {
  gameKey: string;
  characterKey?: string;
  teamKey?: string;
  sequence: Step[];
  semanticKey: string; // hash(gameSemanticKey + characterKey/teamKey + normalizedMoveSequence)
  
  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createSequenceDocument = (
  overrides: Partial<SequenceDocument> = {}
): SequenceDocument => ({
  gameKey: '',
  sequence: [],
  semanticKey: '',
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});
