/**
 * Shared types used across entities
 */

/**
 * Timestamp-like value used for publish metadata.
 * Kept framework-agnostic to avoid forcing Firebase dependency in consumers.
 */
export type PublishTimestamp = Date | string | number;

/**
 * Represents a numeric value that can be either exact or relative/comparative
 * Used for game property values where users may not have precise data
 */
export type DataValue = {
  exact?: number;      // Precise value if known
  relative?: number;   // Positioned within bounds as percentage (0-100)
  unit?: 'frames' | 'seconds' | 'milliseconds' | string;  // Measurement unit (defaults to frames if undefined)
  notes?: string;      // Notes about the data source or uncertainty (e.g., "estimated from video", "needs verification")
};

export const createDataValue = (
  overrides: Partial<DataValue> = {}
): DataValue => ({ exact: 0, ...overrides });

/**
 * Community publishing metadata
 * Consolidated fields for all community-related state across entities
 */
export interface CommunityMetadata {
  // Entity ownership (always present)
  ownerId: string;

  // Publishing state (populated on first publish to community)
  publishedId?: string;
  lastPublishedAt?: PublishTimestamp;

  // Community alignment (computed at publish time for convergence detection)
  semanticFingerprint?: string;
}

export const createCommunityMetadata = (
  overrides: Partial<CommunityMetadata> = {}
): CommunityMetadata => ({ ownerId: 'local-user', ...overrides });

/**
 * A single freeform note captured against an entity. Kept deliberately
 * generic (no per-entity-type fields) so any entity can reuse the same
 * notes UI/mutations; `promotedToKey` records what this note helped create,
 * if anything, without the note itself knowing what kind of thing that is.
 */
export interface NoteEntry {
  id: string;
  text: string;
  createdAt: Date;
  promotedToKey?: string;
}

export const createNoteEntry = (input: { text: string }): NoteEntry => {
  const text = input.text.trim();
  if (!text) {
    throw new Error('text is required.');
  }

  return {
    id: `note-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    text,
    createdAt: new Date(),
  };
};

/**
 * Record-level metadata shared by stored entities.
 * Contains organizational/descriptive fields that don't affect game behavior.
 */
export interface EntityMetadata {
  createdAt: Date;
  lastUpdatedAt: Date;
  validatedVersion?: string;
  label?: string;  // User-facing name or label (separate from semantic name/key)
  notes?: NoteEntry[];  // General documentation/commentary, one entry per jotted thought
}

export const createEntityMetadata = (
  overrides: Partial<EntityMetadata> = {}
): EntityMetadata => {
  const now = new Date();

  return {
    createdAt: now,
    lastUpdatedAt: now,
    ...overrides,
  };
};

/**
 * Community guide aggregation
 */
export interface GuideDocument {
  gameKey: string;
  publishedEntities: {
    stageKeys: string[];
    zoneKeys: string[];
    characterKeys: string[];
    teamKeys: string[];
    moveKeys: string[];
    sequenceKeys: string[];
    projectileKeys: string[];
    matchupKeys: string[];
  };
  publishHistory: string[];
}
