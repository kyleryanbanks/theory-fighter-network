/**
 * Team entity for team-based games
 */

import { Timestamp } from 'firebase/firestore';
import { GuideVersionReference, CommunityMetadata, VerificationSectionMap } from './shared';

export interface TeamDocument {
  id: string;
  gameId: string;
  orderedCharacterIds: string[];
  slotSelections?: TeamSlotSelection[];
  label?: string;

  semanticKey: string; // hash(gameSemanticKey + ordered character semanticKeys)

  guideVersion: GuideVersionReference;
  verification?: VerificationSectionMap;

  community: CommunityMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Slot selection for team member
 */
export interface TeamSlotSelection {
  characterId: string;
  slotIndex: number;
  selectedLoadoutKey?: string;
  selectedAssistKey?: string;
}
