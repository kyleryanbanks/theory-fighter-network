import type { GuideJson, LocalGuideEntities } from '../guide.types';
import { computeChecksum } from './archive.checksum';
import {
  CURRENT_TFN_FORMAT_VERSION,
  TFN_ENTITY_ORDER,
  type TfnArchive,
} from './archive.types';

export interface MigratableTfnArchive {
  header: {
    format: 'TFN_ARCHIVE';
    formatVersion: number;
    schemaVersion: number;
    createdAt: string;
    entityOrder?: (keyof LocalGuideEntities)[];
  };
  guide: GuideJson;
  entities: LocalGuideEntities;
  checksum: string;
}

type ArchiveMigration = (
  archive: MigratableTfnArchive
) => MigratableTfnArchive;

const ARCHIVE_MIGRATIONS = new Map<number, ArchiveMigration>([
  [0, migrateFormat0To1],
]);

export function migrateTfnArchive(
  archive: MigratableTfnArchive
): TfnArchive {
  let migrated = archive;

  while (migrated.header.formatVersion < CURRENT_TFN_FORMAT_VERSION) {
    const migration = ARCHIVE_MIGRATIONS.get(
      migrated.header.formatVersion
    );

    if (!migration) {
      throw new Error(
        `No .tfn migration is registered for formatVersion ${migrated.header.formatVersion}.`
      );
    }

    migrated = migration(migrated);
  }

  return migrated as TfnArchive;
}

function migrateFormat0To1(
  archive: MigratableTfnArchive
): MigratableTfnArchive {
  const payload = {
    header: {
      ...archive.header,
      formatVersion: 1,
      entityOrder: [...TFN_ENTITY_ORDER],
    },
    guide: archive.guide,
    entities: archive.entities,
  };

  return {
    ...payload,
    checksum: computeChecksum(payload),
  };
}