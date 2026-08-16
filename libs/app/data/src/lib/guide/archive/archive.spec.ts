import { createGameDocument } from '../../models/game';
import { createGuideJson, type LocalGuideEntities } from '../index';
import { computeChecksum } from './archive.checksum';
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
    expect(parsed.entities.game.meta.createdAt.toISOString()).toBe(
      entities.game.meta.createdAt.toISOString()
    );
  });

  it('rejects archives whose contents no longer match their checksum', () => {
    const entities = createEntities();
    const archive = buildTfnArchive({ guide: createGuideJson({ gameKey: entities.game.semanticKey }), entities });
    expect(() => parseTfnArchive(archive.replace('game-demo-1x', 'tampered'))).toThrow(/checksum/i);
  });

  it('migrates a verified legacy format 0 archive to the current format', () => {
    const entities = createEntities();
    const guide = createGuideJson({ gameKey: entities.game.semanticKey });
    const payload = JSON.parse(JSON.stringify({
      header: {
        format: 'TFN_ARCHIVE',
        formatVersion: 0,
        schemaVersion: guide.schemaVersion,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      guide,
      entities,
    }));
    const legacyArchive = JSON.stringify({
      ...payload,
      checksum: computeChecksum(payload),
    });

    const migrated = parseTfnArchive(legacyArchive);

    expect(migrated.header.formatVersion).toBe(1);
    expect(migrated.header.entityOrder).toEqual([
      'game',
      'stages',
      'stageZones',
      'characters',
      'teams',
      'moves',
      'sequences',
      'projectiles',
      'matchups',
    ]);
  });

  it('rejects archives from a newer format with upgrade guidance', () => {
    const entities = createEntities();
    const rawArchive = buildTfnArchive({
      guide: createGuideJson({ gameKey: entities.game.semanticKey }),
      entities,
    });
    const archive = JSON.parse(rawArchive);
    archive.header.formatVersion = 2;

    expect(() => parseTfnArchive(JSON.stringify(archive))).toThrow(/upgrade/i);
  });

  it('rejects current archives without the canonical entity order', () => {
    const entities = createEntities();
    const rawArchive = buildTfnArchive({
      guide: createGuideJson({ gameKey: entities.game.semanticKey }),
      entities,
    });
    const archive = JSON.parse(rawArchive);
    archive.header.entityOrder = ['game'];
    const payload = {
      header: archive.header,
      guide: archive.guide,
      entities: archive.entities,
    };
    archive.checksum = computeChecksum(payload);

    expect(() => parseTfnArchive(JSON.stringify(archive))).toThrow(
      /entityOrder/i
    );
  });
});