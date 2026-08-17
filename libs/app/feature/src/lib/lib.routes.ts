import { Route } from '@angular/router';
import { Feature } from './feature/feature';
import { GameRoot } from './game-root/game-root';
import { StageEditor } from './stage-editor/stage-editor';
import { CharacterEditor } from './character-editor/character-editor';
import { MoveEditor } from './move-editor/move-editor';
import { SequenceEditor } from './sequence-editor/sequence-editor';
import { TeamEditor } from './team-editor/team-editor';
import { MatchupEditor } from './matchup-editor/matchup-editor';
import { MoveDetail } from './move-detail/move-detail';
import { SequenceDetail } from './sequence-detail/sequence-detail';
import { EntityDetail } from './entity-detail/entity-detail';
import { MoveComparison } from './move-comparison/move-comparison';

export const featureRoutes: Route[] = [
  {
    path: '',
    component: Feature,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'game' },
      { path: 'game', component: GameRoot },
      { path: 'game/:entityKey', component: EntityDetail, data: { entityType: 'game' } },
      { path: 'stages', component: StageEditor },
      { path: 'stages/:entityKey', component: EntityDetail, data: { entityType: 'stage' } },
      { path: 'zones/:entityKey', component: EntityDetail, data: { entityType: 'stageZone' } },
      { path: 'characters', component: CharacterEditor },
      { path: 'characters/:entityKey', component: EntityDetail, data: { entityType: 'character' } },
      { path: 'moves', component: MoveEditor },
      { path: 'move-comparison', component: MoveComparison },
      { path: 'moves/:moveKey', component: MoveDetail },
      { path: 'sequences', component: SequenceEditor },
      { path: 'sequences/:sequenceKey', component: SequenceDetail },
      { path: 'teams', component: TeamEditor },
      { path: 'teams/:entityKey', component: EntityDetail, data: { entityType: 'team' } },
      { path: 'projectiles/:entityKey', component: EntityDetail, data: { entityType: 'projectile' } },
      { path: 'matchups', component: MatchupEditor },
      { path: 'matchups/:entityKey', component: EntityDetail, data: { entityType: 'matchup' } },
    ],
  },
];
