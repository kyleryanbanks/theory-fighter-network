import { CURRENT_GUIDE_SCHEMA_VERSION, REGISTERED_GUIDE_SCHEMA_VERSIONS } from './guide.constants';
import type { EntityRef, GuideJson } from './guide.types';

export function markEntityUnsaved(guide: GuideJson, ref: EntityRef): void {
  const key = `${ref.entityType}:${ref.entityKey}`;
  guide.unsavedStatus[key] = true;
  if (!guide.localChanges.includes(key)) guide.localChanges.push(key);
  guide.syncedChanges = guide.syncedChanges.filter((value) => value !== key);
  guide.lastModified = new Date().toISOString();
}

export function markEntitySynced(guide: GuideJson, ref: EntityRef): void {
  const key = `${ref.entityType}:${ref.entityKey}`;
  guide.unsavedStatus[key] = false;
  guide.localChanges = guide.localChanges.filter((value) => value !== key);
  if (!guide.syncedChanges.includes(key)) guide.syncedChanges.push(key);
  guide.lastModified = new Date().toISOString();
}

export function assertSupportedSchemaVersion(schemaVersion: number): void {
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) throw new Error(`Invalid guide schemaVersion ${schemaVersion}. Expected a positive integer.`);
  if (schemaVersion > CURRENT_GUIDE_SCHEMA_VERSION) throw new Error(`Guide schemaVersion ${schemaVersion} is newer than this client (${CURRENT_GUIDE_SCHEMA_VERSION}). Please upgrade the app.`);
  if (!REGISTERED_GUIDE_SCHEMA_VERSIONS.includes(schemaVersion)) throw new Error(`Guide schemaVersion ${schemaVersion} is not registered by this client.`);
}