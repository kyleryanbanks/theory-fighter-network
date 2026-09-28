import { Route } from '@angular/router';
import { GameRoot } from '@tfn/game/feature';

export const appShellRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'home',
    loadComponent: () =>
      import('./guide-home/guide-home').then((m) => m.GuideHome),
  },
  {
    path: 'todos',
    loadComponent: () =>
      import('../todo-page/todo-page').then((m) => m.TodoPage),
  },
  { path: 'game', component: GameRoot },
  {
    path: 'game/:entityKey',
    loadComponent: () =>
      import('@tfn/shared/feature').then((m) => m.EntityDetail),
    data: { entityType: 'game' },
  },
  {
    path: 'stages',
    loadComponent: () =>
      import('@tfn/stage/feature').then((m) => m.StageEditor),
  },
  {
    path: 'stages/:entityKey',
    loadComponent: () =>
      import('@tfn/shared/feature').then((m) => m.EntityDetail),
    data: { entityType: 'stage' },
  },
  {
    path: 'zones/:entityKey',
    loadComponent: () =>
      import('@tfn/shared/feature').then((m) => m.EntityDetail),
    data: { entityType: 'stageZone' },
  },
  {
    path: 'characters',
    loadComponent: () =>
      import('@tfn/character/feature').then((m) => m.CharacterEditor),
  },
  {
    path: 'characters/:entityKey',
    loadComponent: () =>
      import('@tfn/character/feature').then((m) => m.CharacterDetail),
  },
  {
    path: 'moves',
    loadComponent: () => import('@tfn/move/feature').then((m) => m.MoveEditor),
  },
  {
    path: 'move-comparison',
    loadComponent: () =>
      import('@tfn/move/feature').then((m) => m.MoveComparison),
  },
  {
    path: 'moves/:moveKey',
    loadComponent: () => import('@tfn/move/feature').then((m) => m.MoveDetail),
  },
  {
    path: 'sequences',
    loadComponent: () =>
      import('@tfn/sequence/feature').then((m) => m.SequenceEditor),
  },
  {
    path: 'sequences/:sequenceKey',
    loadComponent: () =>
      import('@tfn/sequence/feature').then((m) => m.SequenceDetail),
  },
  {
    path: 'teams',
    loadComponent: () => import('@tfn/team/feature').then((m) => m.TeamEditor),
  },
  {
    path: 'teams/:entityKey',
    loadComponent: () =>
      import('@tfn/shared/feature').then((m) => m.EntityDetail),
    data: { entityType: 'team' },
  },
  {
    path: 'projectiles/:entityKey',
    loadComponent: () =>
      import('@tfn/shared/feature').then((m) => m.EntityDetail),
    data: { entityType: 'projectile' },
  },
  {
    path: 'matchups',
    loadComponent: () =>
      import('@tfn/matchup/feature').then((m) => m.MatchupEditor),
  },
  {
    path: 'matchups/:entityKey',
    loadComponent: () =>
      import('@tfn/shared/feature').then((m) => m.EntityDetail),
    data: { entityType: 'matchup' },
  },
];
