import {
  buildTfnArchive,
  createGuideJson,
  type LocalGuide,
} from '../guide';
import { createGameDocument } from '../models';
import {
  buildArchiveBlob,
  buildArchiveFile,
  parseArchiveBlob,
  parseArchiveFile,
} from './local-guide-web';

function buildGuide(): LocalGuide {
  const game = createGameDocument({
    semanticKey: 'game-demo-1x',
    name: 'Demo Fighter',
  });

  return {
    guide: createGuideJson({ gameKey: game.semanticKey }),
    entities: {
      game,
      stages: [],
      stageZones: [],
      characters: [],
      teams: [],
      moves: [],
      sequences: [],
      projectiles: [],
      matchups: [],
    },
  };
}

describe('local Guide web persistence', () => {
  it('builds a .tfn File with the requested name and JSON media type', () => {
    const archiveFile = buildArchiveFile(buildGuide(), 'demo-guide.tfn');

    expect(archiveFile.name).toBe('demo-guide.tfn');
    expect(archiveFile.type).toBe('application/json');
  });

  it('uses guide.tfn as the default archive filename', () => {
    expect(buildArchiveFile(buildGuide()).name).toBe('guide.tfn');
  });

  it('round-trips a Guide through browser File APIs', async () => {
    const guide = buildGuide();
    const archiveFile = buildArchiveFile(guide, 'demo-guide.tfn');

    const loaded = await parseArchiveFile(archiveFile);

    expect(loaded.guide.gameKey).toBe('game-demo-1x');
    expect(loaded.entities.game.meta.createdAt).toBeInstanceOf(Date);
    expect(loaded.entities.game.meta.createdAt.toISOString()).toBe(
      guide.entities.game.meta.createdAt.toISOString()
    );
  });

  it('rejects corrupted browser archive data', async () => {
    const guide = buildGuide();
    const archive = buildTfnArchive(guide).replace(
      'Demo Fighter',
      'Tampered Fighter'
    );

    await expect(
      parseArchiveBlob(new Blob([archive], { type: 'application/json' }))
    ).rejects.toThrow(/checksum/i);
  });

  it('builds a JSON archive Blob', () => {
    expect(buildArchiveBlob(buildGuide()).type).toBe('application/json');
  });
});
