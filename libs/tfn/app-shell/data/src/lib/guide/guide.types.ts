import type { CharacterDocument } from '../models/character';
import type { GameDocument } from '../models/game';
import type { MatchupDocument } from '../models/matchup';
import type { MoveDocument } from '../models/move';
import type { ProjectileDocument } from '../models/projectile';
import type { SequenceDocument } from '../models/sequence';
import type { StageDocument, StageZoneDocument } from '../models/stage';
import type { TeamDocument } from '../models/team';

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
export interface LocalGuide {
  guide: GuideJson;
  entities: LocalGuideEntities;
}

export type TodoEstimateKey =
  | 'character-count'
  | 'stage-count'
  | 'universal-move-count'
  | 'character-move-count';

export type TodoTracking =
  | { type: 'estimated-count'; key: TodoEstimateKey; scopeKey?: string }
  | { type: 'entity'; entityType: EntityType; entityKey: string };

export type TodoTracker =
  | { type: 'guide-progress'; key: TodoEstimateKey; scopeKey?: string }
  | {
      type: 'entity-completion';
      entityType: Extract<
        EntityType,
        'character' | 'move' | 'stage' | 'matchup'
      >;
      entityKey: string;
    };

export interface GuideTodo {
  id: string;
  text: string;
  status: 'open' | 'done';
  entityRefs?: EntityRef[];
  tracking?: TodoTracking;
  tracker?: TodoTracker;
  createdAt: Date;
  completedAt?: Date;
}

export interface ResearchValues {
  expectedCounts?: {
    characters?: number;
    stages?: number;
    universalMoves?: number;
  };
  movesByCharacter?: Record<string, number>;
}

export interface TfnWorkspace {
  todos: GuideTodo[];
  research: ResearchValues;
}
