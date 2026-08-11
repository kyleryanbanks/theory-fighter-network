/**
 * Character entity and configuration types
 */

import { Timestamp } from 'firebase/firestore';
import {
  GuideVersionReference,
  VerificationSectionMap,
  SliderAxisDefinition,
  StateTagDefinition,
  ResourceDefinition,
} from './shared';

export interface CharacterDocument {
  id: string;
  gameId: string;
  canonicalKey: string;
  name: string;
  archetypes: string[];

  customSliderAxes: SliderAxisDefinition[];
  selectableLoadouts?: CharacterLoadoutOption[];
  selectableAssists?: CharacterAssistOption[];
  customPlayerStates?: StateTagDefinition[];
  customOpponentStates?: StateTagDefinition[];
  customResources?: ResourceDefinition[];

  guideVersion: GuideVersionReference;
  verification?: VerificationSectionMap;

  ownerId: string;
  communityId?: string;
  lastPublishedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Loadout option for character
 */
export interface CharacterLoadoutOption {
  key: string;
  label: string;
  description?: string;
}

/**
 * Assist option for character
 */
export interface CharacterAssistOption {
  key: string;
  label: string;
  description?: string;
}
