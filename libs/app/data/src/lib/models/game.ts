/**
 * Game entity and related configuration types
 */

import {
  CommunityMetadata,
  createCommunityMetadata,
  createEntityMetadata,
  EntityMetadata,
} from './shared';
import { createStateModel, StateModel } from './state';

// Re-export StateModel for convenience
export type { StateModel } from './state';

export interface GameDocument {
  name: string;
  version: string;
  semanticKey: string; // hash(normalizedGameName + versionFamily)

  frameRate?: number;  // Game's frame rate (e.g., 60 for 60fps, 59.94 for NTSC arcade)
  is3d: boolean;       // Whether game uses 3D space (affects position/velocity dimensions)
  teamSize: number;
  inputs: Inputs;
  
  states: StateModel;
  /**
   * Deterministic execution order for state.onFrameAdvance callbacks during simulation.
   * Specified states run in this order, then remaining states run in arbitrary (but consistent) order.
   * Enables power users to manage dependencies between state updates (e.g., gravity before position).
   * 
   * Example: ["stageMechanics.gravity", "positions", "health", "comboMechanics"]
   */
  stateExecutionOrder?: string[];  // Array of state semanticKeys in order to execute

  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createGameDocument = (
  overrides: Partial<GameDocument> = {}
): GameDocument => ({
  name: '',
  version: '',
  semanticKey: '',
  is3d: false,
  teamSize: 1,
  inputs: createInputs(),
  states: createStateModel(),
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});

/**
 * Game input vocabulary and optional numeric ranges for analog/digital values.
 */
export interface Inputs {
  directions: Input[];
  buttons: Input[];
}

export const createInputs = (overrides: Partial<Inputs> = {}): Inputs => ({
  directions: [],
  buttons: [],
  ...overrides,
});

/**
 * Input token definition used by direction/button lists.
 */
export interface Input {
  label: string;
  value?: string;
  min?: number;
  max?: number;
}

export const createInput = (overrides: Partial<Input> = {}): Input => ({
  label: '',
  ...overrides,
});
