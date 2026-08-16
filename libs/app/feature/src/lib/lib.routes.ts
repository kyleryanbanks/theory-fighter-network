import { Route } from '@angular/router';
import { Feature } from './feature/feature';
import { GameRoot } from './game-root/game-root';
import { StageEditor } from './stage-editor/stage-editor';
import { CharacterEditor } from './character-editor/character-editor';
import { MoveEditor } from './move-editor/move-editor';
import { SequenceEditor } from './sequence-editor/sequence-editor';
import { TeamEditor } from './team-editor/team-editor';
import { MatchupEditor } from './matchup-editor/matchup-editor';

export const featureRoutes: Route[] = [
  {
    path: '',
    component: Feature,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'game' },
      { path: 'game', component: GameRoot },
      { path: 'stages', component: StageEditor },
      { path: 'characters', component: CharacterEditor },
      { path: 'moves', component: MoveEditor },
      { path: 'sequences', component: SequenceEditor },
      { path: 'teams', component: TeamEditor },
      { path: 'matchups', component: MatchupEditor },
    ],
  },
];
