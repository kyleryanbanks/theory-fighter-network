import type { GuideJson, LocalGuideEntities } from '../guide.types';
export interface TfnArchiveHeader { format: 'TFN_ARCHIVE'; formatVersion: number; schemaVersion: number; createdAt: string; entityOrder: (keyof LocalGuideEntities)[]; }
export interface TfnArchive { header: TfnArchiveHeader; guide: GuideJson; entities: LocalGuideEntities; checksum: string; }