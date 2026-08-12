/**
 * Team entity for team-based games
 */

import { CommunityMetadata, EntityMetadata } from './shared';

export interface TeamDocument {
  id: string;
  gameKey: string;
  orderedCharacterKeys: string[];
  slotSelections?: TeamSlotSelection[];
  label?: string;

  semanticKey: string; // hash(gameSemanticKey + ordered character semanticKeys)

  community: CommunityMetadata;
  meta: EntityMetadata;
}

/**
 * Slot selection for team member
 */
export interface TeamSlotSelection {
  characterKey: string;
  slotIndex: number;
  selectedLoadoutKey?: string;
  selectedAssistKey?: string;
}
