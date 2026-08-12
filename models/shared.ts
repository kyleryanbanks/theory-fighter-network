/**
 * Shared types used across entities
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Individual state definition (reusable lookup entry)
 */
export interface State {
  semanticKey: string;  // hash(gameSemanticKey + [characterSemanticKey] + category + name + duration + min + max + unit)
  name: string;
  description?: string;
  duration?: number;
  min?: number;
  max?: number;
  unit?: string;
}

/**
 * Collection of states by semanticKey
 */
export type StateCollection = Record<string, State>;

/**
 * Universal state model used identically at game and character level
 */
export interface StateModel {
  attacks: StateCollection;
  blocks: StateCollection;
  knockdowns: StateCollection;
  juggles: StateCollection;
  positions: StateCollection;
  stageMechanics: StateCollection;
  characters: StateCollection;
  resources: StateCollection;
  comboMechanics: StateCollection;
}

/**
 * Community publishing metadata
 * Consolidated fields for all community-related state across entities
 */
export interface CommunityMetadata {
  // Entity ownership (always present)
  ownerId: string;

  // Publishing state (populated on first publish to community)
  publishedId?: string;
  lastPublishedAt?: Timestamp;

  // Community alignment (computed at publish time for convergence detection)
  semanticFingerprint?: string;
}

/**
 * Community guide aggregation
 */
export interface GuideDocument {
  id: string;
  gameId: string;
  publishedEntities: {
    characterIds: string[];
    moveIds: string[];
    comboIds: string[];
    teamIds: string[];
    stageIds: string[];
    matchupIds: string[];
  };
  publishHistory: string[];
}
