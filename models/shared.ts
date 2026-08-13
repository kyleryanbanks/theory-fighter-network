/**
 * Shared types used across entities
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Represents a numeric value that can be either exact or relative/comparative
 * Used for game property values where users may not have precise data
 */
export type DataValue = {
  exact?: number;      // Precise value if known
  relative?: number;   // Positioned within bounds as percentage (0-100)
  unit?: 'frames' | 'seconds' | 'milliseconds' | string;  // Measurement unit (defaults to frames if undefined)
  notes?: string;
};

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
