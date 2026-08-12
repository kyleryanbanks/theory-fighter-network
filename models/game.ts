/**
 * Game entity and related configuration types
 */

import { Timestamp } from 'firebase/firestore';
import { CommunityMetadata, StateModel } from './shared';

// Re-export common types for convenience
export { StateModel, CommunityMetadata };

export interface GameDocument {
  id: string;
  semanticKey: string; // hash(normalizedGameName + versionFamily)
  name: string;
  version: string;

  isTeamFighter: boolean;
  teamSize?: number;

  buttons: string[];

  states: StateModel;

  blockStates: string[];

  community: CommunityMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
