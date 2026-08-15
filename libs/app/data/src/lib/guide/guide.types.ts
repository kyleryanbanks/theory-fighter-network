import type { CharacterDocument } from '../models/character';
import type { GameDocument } from '../models/game';
import type { MatchupDocument } from '../models/matchup';
import type { MoveDocument } from '../models/move';
import type { ProjectileDocument } from '../models/projectile';
import type { SequenceDocument } from '../models/sequence';
import type { StageDocument, StageZoneDocument } from '../models/stage';
import type { TeamDocument } from '../models/team';

export type EntityType = 'game' | 'stage' | 'stageZone' | 'character' | 'team' | 'move' | 'sequence' | 'projectile' | 'matchup';
export interface EntityRef { entityType: EntityType; entityKey: string; }
export interface GuideJson { gameKey: string; schemaVersion: number; lastModified: string; localChanges: string[]; syncedChanges: string[]; unsavedStatus: Record<string, boolean>; }
export interface LocalGuideEntities { game: GameDocument; stages: StageDocument[]; stageZones: StageZoneDocument[]; characters: CharacterDocument[]; teams: TeamDocument[]; moves: MoveDocument[]; sequences: SequenceDocument[]; projectiles: ProjectileDocument[]; matchups: MatchupDocument[]; }
export interface LocalGuideWorkspace { guide: GuideJson; entities: LocalGuideEntities; }