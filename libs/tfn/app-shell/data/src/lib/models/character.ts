/**
 * Character entity and configuration types
 */

import {
  CommunityMetadata,
  createCommunityMetadata,
  createEntityMetadata,
  EntityMetadata,
} from './shared';
import { createStateModel, StateModel } from './state';
import { Region } from './region';
import { normalizeGameName } from './game';

export interface CharacterDocument {
  // Scope
  gameKey: string;
  
  // Identity
  semanticKey: string; // hash(gameSemanticKey + normalizedCharacterName)
  name: string;
  archetypes: string[];

  // Hierarchy (direct children)
  hierarchy: {
    moveKeys: string[];
    sequenceKeys: string[];
    projectileKeys: string[];
  };

  // Character-scoped cancel groups
  cancelGroups?: Record<string, string[]>;  // name -> move keys

  // Runtime behavior
  states: StateModel;

  // Geometry
  neutralRegions: {
    collisionBoxes?: Region[];
    hurtBoxes?: Region[];
    throwBoxes?: Region[];
  };

  // Metadata
  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createCharacterDocument = (
  overrides: Partial<CharacterDocument> = {}
): CharacterDocument => ({
  gameKey: '',
  semanticKey: '',
  name: '',
  archetypes: [],
  hierarchy: {
    moveKeys: [],
    sequenceKeys: [],
    projectileKeys: [],
  },
  cancelGroups: {},
  states: createStateModel(),
  neutralRegions: {},
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});

export interface CreateCharacterInput {
  gameKey: string;
  name: string;
}

export function createCharacter(
  input: CreateCharacterInput
): CharacterDocument {
  const character = createCharacterDocument({
    gameKey: input.gameKey.trim(),
    name: input.name.trim(),
    semanticKey: createCharacterSemanticKey(input.gameKey, input.name),
  });
  assertValidCharacterDocument(character);
  return character;
}

export function createCharacterSemanticKey(
  gameKey: string,
  name: string
): string {
  return `character-${fnv1a(`${gameKey.trim()}:${normalizeGameName(name)}`)}`;
}

export function validateCharacterDocument(
  character: CharacterDocument
): string[] {
  const errors: string[] = [];

  if (!character.gameKey.trim()) {
    errors.push('gameKey is required.');
  }
  if (!character.name.trim()) {
    errors.push('name is required.');
  }
  if (character.gameKey.trim() && character.name.trim()) {
    const expectedKey = createCharacterSemanticKey(
      character.gameKey,
      character.name
    );
    if (character.semanticKey !== expectedKey) {
      errors.push('semanticKey does not match the Game and Character name.');
    }
  }

  return errors;
}

function assertValidCharacterDocument(character: CharacterDocument): void {
  const errors = validateCharacterDocument(character);
  if (errors.length > 0) {
    throw new Error(`Invalid Character document: ${errors.join(' ')}`);
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
