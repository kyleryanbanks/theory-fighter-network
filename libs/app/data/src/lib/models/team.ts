/**
 * Team entity for team-based games
 */

import {
  CommunityMetadata,
  createCommunityMetadata,
  createEntityMetadata,
  EntityMetadata,
} from './shared';

export interface TeamDocument {
  // Scope
  gameKey: string;
  
  // Identity
  semanticKey: string; // hash(gameSemanticKey + ordered character semanticKeys)
  
  // Composition
  orderedCharacterKeys: string[];

  // Hierarchy (direct children)
  hierarchy: {
    sequenceKeys: string[];
  };

  // Metadata
  community: CommunityMetadata;
  meta: EntityMetadata;
}

export const createTeamDocument = (
  overrides: Partial<TeamDocument> = {}
): TeamDocument => ({
  gameKey: '',
  semanticKey: '',
  orderedCharacterKeys: [],
  hierarchy: {
    sequenceKeys: [],
  },
  community: createCommunityMetadata(),
  meta: createEntityMetadata(),
  ...overrides,
});

export interface CreateTeamInput {
  gameKey: string;
  orderedCharacterKeys: string[];
}

export function createTeam(input: CreateTeamInput): TeamDocument {
  const team = createTeamDocument({
    gameKey: input.gameKey.trim(),
    orderedCharacterKeys: input.orderedCharacterKeys.map((key) => key.trim()),
    semanticKey: createTeamSemanticKey(
      input.gameKey,
      input.orderedCharacterKeys
    ),
  });
  assertValidTeamDocument(team);
  return team;
}

export function createTeamSemanticKey(
  gameKey: string,
  orderedCharacterKeys: string[]
): string {
  const scope = orderedCharacterKeys.map((key) => key.trim()).join(',');
  return `team-${fnv1a(`${gameKey.trim()}:${scope}`)}`;
}

export function validateTeamDocument(team: TeamDocument): string[] {
  const errors: string[] = [];

  if (!team.gameKey.trim()) {
    errors.push('gameKey is required.');
  }
  if (team.orderedCharacterKeys.length === 0) {
    errors.push('orderedCharacterKeys must have at least one Character.');
  }
  if (team.gameKey.trim() && team.orderedCharacterKeys.length > 0) {
    const expectedKey = createTeamSemanticKey(
      team.gameKey,
      team.orderedCharacterKeys
    );
    if (team.semanticKey !== expectedKey) {
      errors.push(
        'semanticKey does not match the Game and ordered Character keys.'
      );
    }
  }

  return errors;
}

function assertValidTeamDocument(team: TeamDocument): void {
  const errors = validateTeamDocument(team);
  if (errors.length > 0) {
    throw new Error(`Invalid Team document: ${errors.join(' ')}`);
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
