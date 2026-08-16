/**
 * Stage entity and zone types
 */

import {
  CommunityMetadata,
  createCommunityMetadata,
  createEntityMetadata,
  EntityMetadata,
} from './shared';
import { normalizeGameName } from './game';

export interface StageDocument {
  gameKey: string;
  name: string;
  semanticKey: string; // hash(gameSemanticKey + normalizedStageName)

  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createStageDocument = (
  overrides: Partial<StageDocument> = {}
): StageDocument => ({
  gameKey: '',
  name: '',
  semanticKey: '',
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});

export interface CreateStageInput {
  gameKey: string;
  name: string;
}

export function createStage(input: CreateStageInput): StageDocument {
  const stage = createStageDocument({
    gameKey: input.gameKey.trim(),
    name: input.name.trim(),
    semanticKey: createStageSemanticKey(input.gameKey, input.name),
  });
  assertValidStageDocument(stage);
  return stage;
}

export function createStageSemanticKey(
  gameKey: string,
  name: string
): string {
  return `stage-${fnv1a(`${gameKey.trim()}:${normalizeGameName(name)}`)}`;
}

export function validateStageDocument(stage: StageDocument): string[] {
  const errors: string[] = [];

  if (!stage.gameKey.trim()) {
    errors.push('gameKey is required.');
  }
  if (!stage.name.trim()) {
    errors.push('name is required.');
  }
  if (stage.gameKey.trim() && stage.name.trim()) {
    const expectedKey = createStageSemanticKey(stage.gameKey, stage.name);
    if (stage.semanticKey !== expectedKey) {
      errors.push('semanticKey does not match the Game and Stage name.');
    }
  }

  return errors;
}

function assertValidStageDocument(stage: StageDocument): void {
  const errors = validateStageDocument(stage);
  if (errors.length > 0) {
    throw new Error(`Invalid Stage document: ${errors.join(' ')}`);
  }
}

function fnv1a(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Stage zone for environmental interactions
 */
export interface StageZoneDocument {
  gameKey: string;
  stageKey?: string; // optional - if not present, zone is game-level/universal
  name: string;
  semanticKey: string; // hash(gameSemanticKey + [stageSemanticKey] + name)
  
  inheritedFromZoneKey?: string;
  fieldOverrides?: (keyof StageZoneDocument)[];

  // Reference to stageMechanic state(s) that define behavior and properties
  mechanicStateKeys: string[];

  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createStageZoneDocument = (
  overrides: Partial<StageZoneDocument> = {}
): StageZoneDocument => ({
  gameKey: '',
  name: '',
  semanticKey: '',
  mechanicStateKeys: [],
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});
