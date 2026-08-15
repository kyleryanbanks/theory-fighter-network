import { assertSupportedSchemaVersion } from '../guide.mutations';
import type { LocalGuideEntities } from '../guide.types';
import { computeChecksum } from './archive.checksum';
import { stableStringify } from './archive.serialization';
import type { TfnArchive, TfnArchiveHeader } from './archive.types';
export const CURRENT_TFN_FORMAT_VERSION = 1;
const TFN_ENTITY_ORDER: (keyof LocalGuideEntities)[] = ['game', 'stages', 'stageZones', 'characters', 'teams', 'moves', 'sequences', 'projectiles', 'matchups'];
export function buildTfnArchive(input: { guide: TfnArchive['guide']; entities: LocalGuideEntities; schemaVersion?: number }): string {
  const schemaVersion = input.schemaVersion ?? input.guide.schemaVersion; assertSupportedSchemaVersion(schemaVersion);
  const header: TfnArchiveHeader = { format: 'TFN_ARCHIVE', formatVersion: CURRENT_TFN_FORMAT_VERSION, schemaVersion, createdAt: new Date().toISOString(), entityOrder: TFN_ENTITY_ORDER };
  const payload = { header, guide: { ...input.guide, schemaVersion }, entities: input.entities };
  return stableStringify({ ...payload, checksum: computeChecksum(payload) });
}
export function parseTfnArchive(rawArchive: string): TfnArchive {
  const parsed = JSON.parse(rawArchive) as Partial<TfnArchive>;
  if (!parsed.header || parsed.header.format !== 'TFN_ARCHIVE') throw new Error('Invalid .tfn header format.');
  if (parsed.header.formatVersion !== CURRENT_TFN_FORMAT_VERSION) throw new Error(`Unsupported .tfn formatVersion ${parsed.header.formatVersion}. Supported version is ${CURRENT_TFN_FORMAT_VERSION}.`);
  assertSupportedSchemaVersion(parsed.header.schemaVersion);
  if (!parsed.guide || !parsed.entities || !parsed.checksum) throw new Error('Invalid .tfn archive. Missing required sections.');
  const payload = { header: parsed.header, guide: parsed.guide, entities: parsed.entities };
  if (computeChecksum(payload) !== parsed.checksum) throw new Error('Archive checksum mismatch. The .tfn file may be corrupted.');
  return { header: parsed.header, guide: parsed.guide, entities: hydrateEntityDates(parsed.entities as LocalGuideEntities), checksum: parsed.checksum };
}
export function hydrateEntityDates(entities: LocalGuideEntities): LocalGuideEntities { return { ...entities, game: hydrateMetaDates(entities.game), stages: entities.stages.map(hydrateMetaDates), stageZones: entities.stageZones.map(hydrateMetaDates), characters: entities.characters.map(hydrateMetaDates), teams: entities.teams.map(hydrateMetaDates), moves: entities.moves.map(hydrateMetaDates), sequences: entities.sequences.map(hydrateMetaDates), projectiles: entities.projectiles.map(hydrateMetaDates), matchups: entities.matchups.map(hydrateMetaDates) }; }
function hydrateMetaDates<T extends { meta: { createdAt: Date; lastUpdatedAt: Date } }>(entity: T): T { return { ...entity, meta: { ...entity.meta, createdAt: new Date(entity.meta.createdAt), lastUpdatedAt: new Date(entity.meta.lastUpdatedAt) } }; }