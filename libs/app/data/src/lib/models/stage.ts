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
  // Scope
  gameKey: string;
  
  // Identity
  name: string;
  semanticKey: string; // hash(gameSemanticKey + normalizedStageName)

  // Hierarchy (direct children)
  hierarchy: {
    zoneKeys: string[];
  };

  // Metadata
  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createStageDocument = (
  overrides: Partial<StageDocument> = {}
): StageDocument => ({
  gameKey: '',
  name: '',
  semanticKey: '',
  hierarchy: {
    zoneKeys: [],
  },
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

export interface CreateStageZoneInput {
  gameKey: string;
  name: string;
  stageKey?: string; // If provided, zone is stage-scoped; otherwise game-level
}

export function createStageZone(input: CreateStageZoneInput): StageZoneDocument {
  const zone = createStageZoneDocument({
    gameKey: input.gameKey.trim(),
    stageKey: input.stageKey,
    name: input.name.trim(),
    semanticKey: createStageZoneSemanticKey(
      input.gameKey,
      input.stageKey,
      input.name
    ),
  });
  assertValidStageZoneDocument(zone);
  return zone;
}

export function createStageZoneSemanticKey(
  gameKey: string,
  stageKey: string | undefined,
  name: string
): string {
  const normalizedName = normalizeGameName(name);
  const scope = stageKey
    ? `${gameKey.trim()}:${stageKey.trim()}:${normalizedName}`
    : `${gameKey.trim()}:${normalizedName}`;
  return `zone-${fnv1a(scope)}`;
}

export function validateStageZoneDocument(zone: StageZoneDocument): string[] {
  const errors: string[] = [];

  if (!zone.gameKey.trim()) {
    errors.push('gameKey is required.');
  }
  if (!zone.name.trim()) {
    errors.push('name is required.');
  }
  if (zone.gameKey.trim() && zone.name.trim()) {
    const expectedKey = createStageZoneSemanticKey(
      zone.gameKey,
      zone.stageKey,
      zone.name
    );
    if (zone.semanticKey !== expectedKey) {
      errors.push(
        'semanticKey does not match the Game, Stage, and Zone name.'
      );
    }
  }

  return errors;
}

function assertValidStageZoneDocument(zone: StageZoneDocument): void {
  const errors = validateStageZoneDocument(zone);
  if (errors.length > 0) {
    throw new Error(`Invalid Stage Zone document: ${errors.join(' ')}`);
  }
}
