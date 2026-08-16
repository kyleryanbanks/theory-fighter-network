import { EntityDetail } from './entity-detail/entity-detail';
import { MatchupEditor } from './matchup-editor/matchup-editor';
import { MoveDetail } from './move-detail/move-detail';
import { SequenceDetail } from './sequence-detail/sequence-detail';
import { featureRoutes } from './lib.routes';

describe('featureRoutes', () => {
  const childRoutes = featureRoutes[0].children ?? [];

  it('defines a generic detail route for every remaining entity type', () => {
    const expectedRoutes = [
      ['game/:entityKey', 'game'],
      ['stages/:entityKey', 'stage'],
      ['zones/:entityKey', 'stageZone'],
      ['characters/:entityKey', 'character'],
      ['teams/:entityKey', 'team'],
      ['projectiles/:entityKey', 'projectile'],
      ['matchups/:entityKey', 'matchup'],
    ] as const;

    for (const [path, entityType] of expectedRoutes) {
      const route = childRoutes.find(candidate => candidate.path === path);
      expect(route?.component).toBe(EntityDetail);
      expect(route?.data).toEqual({ entityType });
    }
  });

  it('keeps specialized Move, Sequence, and editor routes distinct', () => {
    expect(childRoutes.find(route => route.path === 'moves/:moveKey')?.component).toBe(MoveDetail);
    expect(childRoutes.find(route => route.path === 'sequences/:sequenceKey')?.component).toBe(SequenceDetail);
    expect(childRoutes.find(route => route.path === 'matchups')?.component).toBe(MatchupEditor);
  });
});