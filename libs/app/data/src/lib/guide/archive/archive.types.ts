import type { GuideJson, LocalGuideEntities } from '../guide.types';

export const CURRENT_TFN_FORMAT_VERSION = 1;

export const TFN_ENTITY_ORDER: (keyof LocalGuideEntities)[] = [
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