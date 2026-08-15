/**
 * Sequence entity and related move ref/difficulty types
 */

import { Step } from './move';
import { CommunityMetadata, EntityMetadata } from './shared';

export interface SequenceDocument {
  gameKey: string;
  characterKey?: string;
  teamKey?: string;
  sequence: Step[];
  semanticKey: string; // hash(gameSemanticKey + characterKey/teamKey + normalizedMoveSequence)
  
  community: CommunityMetadata;
  meta: EntityMetadata;
}
