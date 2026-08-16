import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'moves/:moveKey', renderMode: RenderMode.Client },
  { path: 'sequences/:sequenceKey', renderMode: RenderMode.Client },
  { path: 'game/:entityKey', renderMode: RenderMode.Client },
  { path: 'stages/:entityKey', renderMode: RenderMode.Client },
  { path: 'zones/:entityKey', renderMode: RenderMode.Client },
  { path: 'characters/:entityKey', renderMode: RenderMode.Client },
  { path: 'teams/:entityKey', renderMode: RenderMode.Client },
  { path: 'projectiles/:entityKey', renderMode: RenderMode.Client },
  { path: 'matchups/:entityKey', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
