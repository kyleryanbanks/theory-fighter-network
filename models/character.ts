/**
 * Character entity and configuration types
 */

import { Timestamp } from 'firebase/firestore';
import {
  GuideVersionReference,
  CommunityMetadata,
  VerificationSectionMap,
  StateModel,
} from './shared';

export interface CharacterDocument {
  id: string;
  gameId: string;
  semanticKey: string; // hash(gameSemanticKey + normalizedCharacterName)
  name: string;
  archetypes: string[];

  states: StateModel;

  guideVersion: GuideVersionReference;
  verification?: VerificationSectionMap;

  community: CommunityMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
