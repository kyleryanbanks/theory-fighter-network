import { createGameDocument } from '../../models/game';
import { createGuideJson, type LocalGuideEntities } from '../index';
import { buildTfnArchive, parseTfnArchive } from './archive.service';

function createEntities(): LocalGuideEntities {
  return {
    game: createGameDocument({ semanticKey: 'game-demo-1x' }),
    stages: [], stageZones: [], characters: [], teams: [], moves: [],
    sequences: [], projectiles: [], matchups: [],
  };
}

describe('TFN archives', () => {
  it('round-trips archives and restores entity metadata dates', () => {
    const entities = createEntities();
    const archive = buildTfnArchive({ guide: createGuideJson({ gameKey: entities.game.semanticKey }), entities });
    const parsed = parseTfnArchive(archive);
    expect(parsed.header.format).toBe('TFN_ARCHIVE');
    expect(parsed.entities.game.meta.createdAt).toBeInstanceOf(Date);
  });

  it('rejects archives whose contents no longer match their checksum', () => {
    const entities = createEntities();
    const archive = buildTfnArchive({ guide: createGuideJson({ gameKey: entities.game.semanticKey }), entities });
    expect(() => parseTfnArchive(archive.replace('game-demo-1x', 'tampered'))).toThrow(/checksum/i);
  });
});