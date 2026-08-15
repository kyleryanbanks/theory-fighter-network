import { CURRENT_GUIDE_SCHEMA_VERSION } from './guide.constants';
import { assertSupportedSchemaVersion } from './guide.mutations';
import type { GuideJson } from './guide.types';

export function createGuideJson(input: { gameKey: string; schemaVersion?: number }): GuideJson {
  const schemaVersion = input.schemaVersion ?? CURRENT_GUIDE_SCHEMA_VERSION;
  assertSupportedSchemaVersion(schemaVersion);
  return { gameKey: input.gameKey, schemaVersion, lastModified: new Date().toISOString(), localChanges: [], syncedChanges: [], unsavedStatus: {} };
}