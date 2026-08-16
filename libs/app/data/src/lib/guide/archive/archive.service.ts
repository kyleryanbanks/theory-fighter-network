import { assertSupportedSchemaVersion } from '../guide.mutations';
import type { LocalGuideEntities } from '../guide.types';
import { computeChecksum } from './archive.checksum';
import {
  migrateTfnArchive,
  type MigratableTfnArchive,
} from './archive.migrations';
import { stableStringify } from './archive.serialization';
import {
  CURRENT_TFN_FORMAT_VERSION,
  TFN_ENTITY_ORDER,
  type TfnArchive,
  type TfnArchiveHeader,
} from './archive.types';

export { CURRENT_TFN_FORMAT_VERSION } from './archive.types';

export function buildTfnArchive(input: {
  guide: TfnArchive['guide'];
  entities: LocalGuideEntities;
  schemaVersion?: number;
}): string {
  const schemaVersion = input.schemaVersion ?? input.guide.schemaVersion;
  assertSupportedSchemaVersion(schemaVersion);

  const header: TfnArchiveHeader = {
    format: 'TFN_ARCHIVE',
    formatVersion: CURRENT_TFN_FORMAT_VERSION,
    schemaVersion,
    createdAt: new Date().toISOString(),
    entityOrder: [...TFN_ENTITY_ORDER],
  };
  const payload = {
    header,
    guide: { ...input.guide, schemaVersion },
    entities: input.entities,
  };

  return stableStringify({
    ...payload,
    checksum: computeChecksum(payload),
  });
}

export function parseTfnArchive(rawArchive: string): TfnArchive {
  const parsed = JSON.parse(rawArchive) as Partial<MigratableTfnArchive>;
  assertArchiveShape(parsed);

  if (parsed.header.formatVersion > CURRENT_TFN_FORMAT_VERSION) {
    throw new Error(
      `.tfn formatVersion ${parsed.header.formatVersion} is newer than this client (${CURRENT_TFN_FORMAT_VERSION}). Please upgrade the app.`
    );
  }

  const payload = {
    header: parsed.header,
    guide: parsed.guide,
    entities: parsed.entities,
  };

  if (computeChecksum(payload) !== parsed.checksum) {
    throw new Error(
      'Archive checksum mismatch. The .tfn file may be corrupted.'
    );
  }

  const migrated = migrateTfnArchive(parsed);
  assertCanonicalEntityOrder(migrated.header.entityOrder);
  assertSupportedSchemaVersion(migrated.header.schemaVersion);

  return {
    ...migrated,
    entities: hydrateEntityDates(migrated.entities),
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

function assertArchiveShape(
  archive: Partial<MigratableTfnArchive>
): asserts archive is MigratableTfnArchive {
  if (!archive.header || archive.header.format !== 'TFN_ARCHIVE') {
    throw new Error('Invalid .tfn header format.');
  }
  if (!Number.isInteger(archive.header.formatVersion)) {
    throw new Error('Invalid .tfn formatVersion.');
  }
  if (!archive.guide || !archive.entities || !archive.checksum) {
    throw new Error('Invalid .tfn archive. Missing required sections.');
  }
}

function assertCanonicalEntityOrder(
  entityOrder: (keyof LocalGuideEntities)[]
): void {
  const isCanonical =
    entityOrder.length === TFN_ENTITY_ORDER.length &&
    entityOrder.every(
      (entityKey, index) => entityKey === TFN_ENTITY_ORDER[index]
    );

  if (!isCanonical) {
    throw new Error('Invalid .tfn header entityOrder.');
  }
}

function hydrateMetaDates<
  T extends { meta: { createdAt: Date; lastUpdatedAt: Date } }
>(entity: T): T {
  return {
    ...entity,
    meta: {
      ...entity.meta,
      createdAt: new Date(entity.meta.createdAt),
      lastUpdatedAt: new Date(entity.meta.lastUpdatedAt),
    },
  };
}