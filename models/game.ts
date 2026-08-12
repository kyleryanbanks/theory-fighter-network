/**
 * Game entity and related configuration types
 */

import { CommunityMetadata, EntityMetadata, StateModel } from './shared';

// Re-export common types for convenience
export { StateModel, CommunityMetadata };

export interface GameDocument {
  id: string;
  name: string;
  version: string;
  semanticKey: string; // hash(normalizedGameName + versionFamily)

  teamSize: number;
  inputs: Inputs;
  states: StateModel;

  community: CommunityMetadata;
  meta: EntityMetadata;
}

/**
 * Game input vocabulary and optional numeric ranges for analog/digital values.
 */
export interface Inputs {
  directions: Input[];
  buttons: Input[];
}

/**
 * Input token definition used by direction/button lists.
 */
export interface Input {
  label: string;
  value?: string;
  min?: number;
  max?: number;
}
