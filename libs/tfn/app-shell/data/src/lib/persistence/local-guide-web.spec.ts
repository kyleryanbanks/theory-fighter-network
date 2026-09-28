import {
  buildTfnArchive,
  createGuideJson,
  type LocalGuide,
  type TfnWorkspace,
} from '../guide';
import { createGameDocument, createStage } from '../models';
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

function buildWorkspace(): TfnWorkspace {
  return { todos: [], research: {} };
}

describe('local Guide web persistence', () => {
  it('builds a .tfn File with the requested name and JSON media type', () => {
    const archiveFile = buildArchiveFile(
      buildGuide(),
      buildWorkspace(),
      'demo-guide.tfn',
    );

    expect(archiveFile.name).toBe('demo-guide.tfn');
    expect(archiveFile.type).toBe('application/json');
  });

  it('uses guide.tfn as the default archive filename', () => {
    expect(buildArchiveFile(buildGuide(), buildWorkspace()).name).toBe(
      'guide.tfn',
    );
  });

  it('round-trips a Guide through browser File APIs', async () => {
    const guide = buildGuide();
    const workspace = buildWorkspace();
    guide.entities.stages.push(
      createStage({
        gameKey: guide.entities.game.semanticKey,
        name: 'Training Room',
      }),
    );
    const archiveFile = buildArchiveFile(guide, workspace, 'demo-guide.tfn');

    const loaded = await parseArchiveFile(archiveFile);

    expect(loaded.guide.guide.gameKey).toBe('game-demo-1x');
    expect(loaded.guide.entities.game.meta.createdAt).toBeInstanceOf(Date);
    expect(loaded.guide.entities.game.meta.createdAt.toISOString()).toBe(
      guide.entities.game.meta.createdAt.toISOString(),
    );
    expect(loaded.guide.entities.stages).toEqual([
      expect.objectContaining({
        gameKey: 'game-demo-1x',
        name: 'Training Room',
      }),
    ]);
  });

  it('rejects corrupted browser archive data', async () => {
    const guide = buildGuide();
    const workspace = buildWorkspace();
    const archive = buildTfnArchive({
      guide: guide.guide,
      entities: guide.entities,
      workspace,
    }).replace('Demo Fighter', 'Tampered Fighter');

    await expect(
      parseArchiveBlob(new Blob([archive], { type: 'application/json' })),
    ).rejects.toThrow(/checksum/i);
  });

  it('builds a JSON archive Blob', () => {
    expect(buildArchiveBlob(buildGuide(), buildWorkspace()).type).toBe(
      'application/json',
    );
  });
});
