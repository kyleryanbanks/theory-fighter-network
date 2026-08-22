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
  // Identity (immutable)
  name: string;
  version: string;
  semanticKey: string; // hash(normalizedGameName + versionFamily)

  // Configuration
  config: {
    frameRate?: number;  // Game's frame rate (e.g., 60 for 60fps, 59.94 for NTSC arcade)
    is3d: boolean;       // Whether game uses 3D space (affects position/velocity dimensions)
    teamSize: number;
    inputs: Inputs;
    /**
     * Semantic state keys that should run before other registered state behavior.
     * Keys are in the format "CategoryName.stateKey" (e.g., "Environment.gravity", "Sequence.hitstun").
     * Remaining behavior runs in first-registration order.
     * Keys without registered frame behavior are ignored.
     * 
     * Example: ["Environment.gravity", "Movement", "Resource.health", "Sequence.hitstun"]
     */
    stateExecutionOrder?: string[];
  };

  // Hierarchy (direct children)
  hierarchy: {
    stageKeys: string[];
    characterKeys: string[];
    teamKeys: string[];
    matchupKeys: string[];
  };

  // Universal shared entities
  universal: {
    stageZoneKeys: string[];
    moveKeys: string[];
    sequenceKeys: string[];
    projectileKeys: string[];
    cancelGroups?: Record<string, string[]>;  // name -> move keys
  };

  // Runtime behavior
  states: StateModel;

  // Metadata
  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createGameDocument = (
  overrides: Partial<GameDocument> = {}
): GameDocument => ({
  name: '',
  version: '',
  semanticKey: '',
  config: {
    is3d: false,
    teamSize: 1,
    inputs: createInputs(),
  },
  hierarchy: {
    stageKeys: [],
    characterKeys: [],
    teamKeys: [],
    matchupKeys: [],
  },
  universal: {
    stageZoneKeys: [],
    moveKeys: [],
    sequenceKeys: [],
    projectileKeys: [],
    cancelGroups: {},
  },
  states: createStateModel(),
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});

export interface CreateGameInput {
  name: string;
  version: string;
  frameRate?: number;
  is3d: boolean;
  teamSize: number;
  inputs: Inputs;
}

export type GameMetadataUpdate = Partial<Pick<
  GameDocument['config'],
  'frameRate' | 'is3d' | 'teamSize' | 'inputs' | 'stateExecutionOrder'
>>;

export function createGame(input: CreateGameInput): GameDocument {
  const game = createGameDocument({
    name: input.name,
    version: input.version,
    semanticKey: createGameSemanticKey(input.name, input.version),
    config: {
      frameRate: input.frameRate,
      is3d: input.is3d,
      teamSize: input.teamSize,
      inputs: input.inputs,
    },
  });
  assertValidGameDocument(game);
  return game;
}

export function updateGameMetadata(
  game: GameDocument,
  updates: GameMetadataUpdate
): GameDocument {
  const updated = {
    ...game,
    config: {
      ...game.config,
      ...updates,
    },
    meta: {
      ...game.meta,
      lastUpdatedAt: new Date(),
    },
  };
  assertValidGameDocument(updated);
  return updated;
}

export function createGameSemanticKey(name: string, version: string): string {
  const normalizedName = normalizeGameName(name);
  const versionFamily = getVersionFamily(version);

  return `game-${fnv1a(`${normalizedName}:${versionFamily}`)}`;
}

export function validateGameDocument(game: GameDocument): string[] {
  const errors: string[] = [];

  if (!game.name.trim()) {
    errors.push('name is required.');
  }
  if (!game.version.trim()) {
    errors.push('version is required.');
  }
  if (!Number.isInteger(game.config.teamSize) || game.config.teamSize < 1) {
    errors.push('teamSize must be a positive integer.');
  }
  if (game.config.frameRate !== undefined && game.config.frameRate <= 0) {
    errors.push('frameRate must be positive.');
  }
  if (game.name.trim() && game.version.trim()) {
    const expectedKey = createGameSemanticKey(game.name, game.version);
    if (game.semanticKey !== expectedKey) {
      errors.push('semanticKey does not match the game name and version family.');
    }
  }
  if (!hasUniqueInputValues(game.config.inputs)) {
    errors.push('Input values must be unique.');
  }

  return errors;
}

function assertValidGameDocument(game: GameDocument): void {
  const errors = validateGameDocument(game);
  if (errors.length > 0) {
    throw new Error(`Invalid game document: ${errors.join(' ')}`);
  }
}

export function normalizeGameName(name: string): string {
  return name
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getVersionFamily(version: string): string {
  const majorVersion = version.trim().match(/^\d+/)?.[0];
  if (!majorVersion) {
    throw new Error('version must begin with a major version number.');
  }

  return `${majorVersion}.x`;
}

function hasUniqueInputValues(inputs: Inputs): boolean {
  const values = [...inputs.directions, ...inputs.buttons].map((input) =>
    (input.value ?? input.label).trim().toLowerCase()
  );

  return values.every((value, index) => value && values.indexOf(value) === index);
}

function fnv1a(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

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
