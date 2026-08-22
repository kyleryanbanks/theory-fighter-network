/**
 * Sequence entity and related move ref/difficulty types
 */

import { Step } from './move';
import {
  CommunityMetadata,
  createCommunityMetadata,
  createEntityMetadata,
  EntityMetadata,
} from './shared';

export interface SequenceDocument {
  gameKey: string;
  characterKey?: string;
  teamKey?: string;
  sequence: Step[];
  semanticKey: string; // hash(gameSemanticKey + characterKey/teamKey + normalizedMoveSequence)
  
  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createSequenceDocument = (
  overrides: Partial<SequenceDocument> = {}
): SequenceDocument => ({
  gameKey: '',
  sequence: [],
  semanticKey: '',
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});

export interface CreateSequenceInput {
  gameKey: string;
  sequence: Step[];
  characterKey?: string; // If provided, sequence is character-scoped
  teamKey?: string; // If provided, sequence is team-scoped
}

export function createSequence(input: CreateSequenceInput): SequenceDocument {
  const sequence = createSequenceDocument({
    gameKey: input.gameKey.trim(),
    characterKey: input.characterKey,
    teamKey: input.teamKey,
    sequence: input.sequence,
    semanticKey: createSequenceSemanticKey(
      input.gameKey,
      input.characterKey,
      input.teamKey,
      input.sequence
    ),
  });
  assertValidSequenceDocument(sequence);
  return sequence;
}

export function createSequenceSemanticKey(
  gameKey: string,
  characterKey: string | undefined,
  teamKey: string | undefined,
  steps: Step[]
): string {
  const scope = characterKey
    ? `character:${characterKey.trim()}`
    : teamKey
      ? `team:${teamKey.trim()}`
      : 'universal';
  return `sequence-${fnv1a(
    `${gameKey.trim()}:${scope}:${normalizeSequenceSteps(steps)}`
  )}`;
}

export function validateSequenceDocument(
  sequence: SequenceDocument
): string[] {
  const errors: string[] = [];

  if (!sequence.gameKey.trim()) {
    errors.push('gameKey is required.');
  }
  if (sequence.sequence.length === 0) {
    errors.push('sequence must have at least one Step.');
  }
  if (sequence.characterKey && sequence.teamKey) {
    errors.push('sequence cannot be scoped to both a Character and a Team.');
  }
  if (sequence.gameKey.trim() && sequence.sequence.length > 0) {
    const expectedKey = createSequenceSemanticKey(
      sequence.gameKey,
      sequence.characterKey,
      sequence.teamKey,
      sequence.sequence
    );
    if (sequence.semanticKey !== expectedKey) {
      errors.push(
        'semanticKey does not match the Game, scope, and Sequence steps.'
      );
    }
  }

  return errors;
}

function assertValidSequenceDocument(sequence: SequenceDocument): void {
  const errors = validateSequenceDocument(sequence);
  if (errors.length > 0) {
    throw new Error(`Invalid Sequence document: ${errors.join(' ')}`);
  }
}

function normalizeSequenceSteps(steps: Step[]): string {
  return JSON.stringify(
    steps.map((step) => ({
      directions: [...step.directions].sort(),
      buttons: [...step.buttons].sort(),
      moveKey: step.moveKey ?? null,
      frames: step.frames ?? 1,
    }))
  );
}

function fnv1a(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
