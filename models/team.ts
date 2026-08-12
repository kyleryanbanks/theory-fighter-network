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

  semanticKey: string; // hash(gameSemanticKey + ordered character semanticKeys)
  semanticFingerprint?: string; // published payload fingerprint

  guideVersion: GuideVersionReference;
  verification?: VerificationSectionMap;

  ownerId: string;
  publishedId?: string;
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
