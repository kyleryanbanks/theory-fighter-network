/**
 * Team entity for team-based games
 */

import { Timestamp } from 'firebase/firestore';
import { GuideVersionReference, VerificationSectionMap } from './shared';

export interface TeamDocument {
  id: string;
  gameId: string;
  orderedCharacterIds: string[];
  slotSelections?: TeamSlotSelection[];
  label?: string;

  guideVersion: GuideVersionReference;
  verification?: VerificationSectionMap;

  ownerId: string;
  communityId?: string;
  lastPublishedAt?: Timestamp;
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
