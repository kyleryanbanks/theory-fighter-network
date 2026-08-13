/**
 * Game entity and related configuration types
 */

import { CommunityMetadata, EntityMetadata } from './shared';
import { StateModel } from './state';

// Re-export StateModel for convenience
export { StateModel } from './state';

export interface GameDocument {
  name: string;
  version: string;
  semanticKey: string; // hash(normalizedGameName + versionFamily)

  frameRate?: number;  // Game's frame rate (e.g., 60 for 60fps, 59.94 for NTSC arcade)
  
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
