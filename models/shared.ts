/**
 * Shared types used across entities
 */

import { Timestamp } from 'firebase/firestore';

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
 * Record-level metadata shared by stored entities.
 */
export interface EntityMetadata {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  validatedVersion?: string;
}

/**
 * Community guide aggregation
 */
export interface GuideDocument {
  gameKey: string;
  publishedEntities: {
    characterKeys: string[];
    moveKeys: string[];
    sequenceKeys: string[];
    teamKeys: string[];
    stageKeys: string[];
    matchupKeys: string[];
  };
  publishHistory: string[];
}
