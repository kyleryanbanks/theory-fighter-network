import { createHash } from 'node:crypto';
import type { CharacterDocument } from './character';
import type { GameDocument } from './game';
import type { MatchupDocument } from './matchup';
import type { MoveDocument } from './move';
import type { ProjectileDocument } from './projectile';
import type { SequenceDocument } from './sequence';
import type { StageDocument, StageZoneDocument } from './stage';
import type { TeamDocument } from './team';

export const CURRENT_GUIDE_SCHEMA_VERSION = 1;
export const CURRENT_TFN_FORMAT_VERSION = 1;
export const REGISTERED_GUIDE_SCHEMA_VERSIONS = [
  CURRENT_GUIDE_SCHEMA_VERSION,
] as const;

export type EntityType =
  | 'game'
  | 'stage'
  | 'stageZone'
  | 'character'
  | 'team'
  | 'move'
  | 'sequence'
  | 'projectile'
  | 'matchup';

export interface EntityRef {
  entityType: EntityType;
  entityKey: string;
}

export interface GuideJson {
  gameKey: string;
  schemaVersion: number;
  lastModified: string;
  localChanges: string[];
  syncedChanges: string[];
  unsavedStatus: Record<string, boolean>;
}

export interface LocalGuideEntities {
  game: GameDocument;
  stages: StageDocument[];
  stageZones: StageZoneDocument[];
  characters: CharacterDocument[];
  teams: TeamDocument[];
  moves: MoveDocument[];
  sequences: SequenceDocument[];
  projectiles: ProjectileDocument[];
  matchups: MatchupDocument[];
}

export interface LocalGuideWorkspace {
  guide: GuideJson;
  entities: LocalGuideEntities;
}

export interface TfnArchiveHeader {
  format: 'TFN_ARCHIVE';
  formatVersion: number;
  schemaVersion: number;
  createdAt: string;
  entityOrder: (keyof LocalGuideEntities)[];
}

export interface TfnArchive {
  header: TfnArchiveHeader;
  guide: GuideJson;
  entities: LocalGuideEntities;
  checksum: string;
}

const TFN_ENTITY_ORDER: (keyof LocalGuideEntities)[] = [
  'game',
  'stages',
  'stageZones',
  'characters',
  'teams',
  'moves',
  'sequences',
  'projectiles',
  'matchups',
];

export function createGuideJson(input: {
  gameKey: string;
  schemaVersion?: number;
}): GuideJson {
  const schemaVersion =
    input.schemaVersion ?? CURRENT_GUIDE_SCHEMA_VERSION;
  assertSupportedSchemaVersion(schemaVersion);

  return {
    gameKey: input.gameKey,
    schemaVersion,
    lastModified: new Date().toISOString(),
    localChanges: [],
    syncedChanges: [],
    unsavedStatus: {},
  };
}

export function markEntityUnsaved(
  guide: GuideJson,
  ref: EntityRef
): void {
  const key = buildEntityStateKey(ref);
  guide.unsavedStatus[key] = true;
  if (!guide.localChanges.includes(key)) {
    guide.localChanges.push(key);
  }
  guide.syncedChanges = guide.syncedChanges.filter((x) => x !== key);
  guide.lastModified = new Date().toISOString();
}

export function markEntitySynced(
  guide: GuideJson,
  ref: EntityRef
): void {
  const key = buildEntityStateKey(ref);
  guide.unsavedStatus[key] = false;
  guide.localChanges = guide.localChanges.filter((x) => x !== key);
  if (!guide.syncedChanges.includes(key)) {
    guide.syncedChanges.push(key);
  }
  guide.lastModified = new Date().toISOString();
}

export function assertSupportedSchemaVersion(
  schemaVersion: number
): void {
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error(
      `Invalid guide schemaVersion ${schemaVersion}. Expected a positive integer.`
    );
  }

  if (schemaVersion > CURRENT_GUIDE_SCHEMA_VERSION) {
    throw new Error(
      `Guide schemaVersion ${schemaVersion} is newer than this client (${CURRENT_GUIDE_SCHEMA_VERSION}). Please upgrade the app.`
    );
  }

  if (!REGISTERED_GUIDE_SCHEMA_VERSIONS.includes(schemaVersion)) {
    throw new Error(
      `Guide schemaVersion ${schemaVersion} is not registered by this client.`
    );
  }
}

export function buildTfnArchive(input: {
  guide: GuideJson;
  entities: LocalGuideEntities;
  schemaVersion?: number;
}): string {
  const schemaVersion =
    input.schemaVersion ?? input.guide.schemaVersion;
  assertSupportedSchemaVersion(schemaVersion);

  const normalizedGuide: GuideJson = {
    ...input.guide,
    schemaVersion,
  };

  const header: TfnArchiveHeader = {
    format: 'TFN_ARCHIVE',
    formatVersion: CURRENT_TFN_FORMAT_VERSION,
    schemaVersion,
    createdAt: new Date().toISOString(),
    entityOrder: TFN_ENTITY_ORDER,
  };

  const payload = {
    header,
    guide: normalizedGuide,
    entities: input.entities,
  };

  const checksum = computeChecksum(payload);

  const archive: TfnArchive = {
    ...payload,
    checksum,
  };

  return stableStringify(archive);
}

export function parseTfnArchive(rawArchive: string): TfnArchive {
  const parsed = JSON.parse(rawArchive) as Partial<TfnArchive>;

  if (!parsed.header || parsed.header.format !== 'TFN_ARCHIVE') {
    throw new Error('Invalid .tfn header format.');
  }

  if (parsed.header.formatVersion !== CURRENT_TFN_FORMAT_VERSION) {
    throw new Error(
      `Unsupported .tfn formatVersion ${parsed.header.formatVersion}. Supported version is ${CURRENT_TFN_FORMAT_VERSION}.`
    );
  }

  assertSupportedSchemaVersion(parsed.header.schemaVersion);

  if (!parsed.guide || !parsed.entities || !parsed.checksum) {
    throw new Error('Invalid .tfn archive. Missing required sections.');
  }

  const computed = computeChecksum({
    header: parsed.header,
    guide: parsed.guide,
    entities: parsed.entities,
  });

  if (computed !== parsed.checksum) {
    throw new Error('Archive checksum mismatch. The .tfn file may be corrupted.');
  }

  const hydratedEntities = hydrateEntityDates(
    parsed.entities as LocalGuideEntities
  );

  return {
    header: parsed.header,
    guide: parsed.guide,
    entities: hydratedEntities,
    checksum: parsed.checksum,
  };
}

export function hydrateEntityDates(
  entities: LocalGuideEntities
): LocalGuideEntities {
  return {
    ...entities,
    game: hydrateMetaDates(entities.game),
    stages: entities.stages.map(hydrateMetaDates),
    stageZones: entities.stageZones.map(hydrateMetaDates),
    characters: entities.characters.map(hydrateMetaDates),
    teams: entities.teams.map(hydrateMetaDates),
    moves: entities.moves.map(hydrateMetaDates),
    sequences: entities.sequences.map(hydrateMetaDates),
    projectiles: entities.projectiles.map(hydrateMetaDates),
    matchups: entities.matchups.map(hydrateMetaDates),
  };
}

function hydrateMetaDates<T extends { meta: { createdAt: Date; lastUpdatedAt: Date } }>(
  entity: T
): T {
  return {
    ...entity,
    meta: {
      ...entity.meta,
      createdAt: new Date(entity.meta.createdAt),
      lastUpdatedAt: new Date(entity.meta.lastUpdatedAt),
    },
  };
}

function buildEntityStateKey(ref: EntityRef): string {
  return `${ref.entityType}:${ref.entityKey}`;
}

function computeChecksum(payload: unknown): string {
  const digest = createHash('sha256');
  digest.update(stableStringify(payload), 'utf8');
  return digest.digest('hex');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const typedValue = value as Record<string, unknown>;
  const keys = Object.keys(typedValue).sort();
  const sorted: Record<string, unknown> = {};

  for (const key of keys) {
    sorted[key] = sortKeysDeep(typedValue[key]);
  }

  return sorted;
}