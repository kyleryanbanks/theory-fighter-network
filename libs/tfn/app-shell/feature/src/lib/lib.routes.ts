import { Route } from '@angular/router';

export const featureRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./feature/feature').then((m) => m.Feature),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'game' },
      { path: 'game', loadComponent: () => import('./game-root/game-root').then((m) => m.GameRoot) },
      { path: 'game/:entityKey', loadComponent: () => import('./entity-detail/entity-detail').then((m) => m.EntityDetail), data: { entityType: 'game' } },
      { path: 'stages', loadComponent: () => import('./stage-editor/stage-editor').then((m) => m.StageEditor) },
      { path: 'stages/:entityKey', loadComponent: () => import('./entity-detail/entity-detail').then((m) => m.EntityDetail), data: { entityType: 'stage' } },
      { path: 'zones/:entityKey', loadComponent: () => import('./entity-detail/entity-detail').then((m) => m.EntityDetail), data: { entityType: 'stageZone' } },
      { path: 'characters', loadComponent: () => import('./character-editor/character-editor').then((m) => m.CharacterEditor) },
      { path: 'characters/:entityKey', loadComponent: () => import('./character-detail/character-detail').then((m) => m.CharacterDetail) },
      { path: 'moves', loadComponent: () => import('./move-editor/move-editor').then((m) => m.MoveEditor) },
      { path: 'move-comparison', loadComponent: () => import('./move-comparison/move-comparison').then((m) => m.MoveComparison) },
      { path: 'moves/:moveKey', loadComponent: () => import('./move-detail/move-detail').then((m) => m.MoveDetail) },
      { path: 'sequences', loadComponent: () => import('./sequence-editor/sequence-editor').then((m) => m.SequenceEditor) },
      { path: 'sequences/:sequenceKey', loadComponent: () => import('./sequence-detail/sequence-detail').then((m) => m.SequenceDetail) },
      { path: 'teams', loadComponent: () => import('./team-editor/team-editor').then((m) => m.TeamEditor) },
      { path: 'teams/:entityKey', loadComponent: () => import('./entity-detail/entity-detail').then((m) => m.EntityDetail), data: { entityType: 'team' } },
      { path: 'projectiles/:entityKey', loadComponent: () => import('./entity-detail/entity-detail').then((m) => m.EntityDetail), data: { entityType: 'projectile' } },
      { path: 'matchups', loadComponent: () => import('./matchup-editor/matchup-editor').then((m) => m.MatchupEditor) },
      { path: 'matchups/:entityKey', loadComponent: () => import('./entity-detail/entity-detail').then((m) => m.EntityDetail), data: { entityType: 'matchup' } },
    ],
  },
];
