import {
  createGame,
  createGameSemanticKey,
  normalizeGameName,
  updateGameMetadata,
  validateGameDocument,
} from './game';

describe('game root operations', () => {
  it('normalizes Game names for stable identifiers and filenames', () => {
    expect(normalizeGameName('  MARVEL Tōkon: Fighting Souls!!  ')).toBe(
      'marvel-tokon-fighting-souls'
    );
  });

  it('creates a canonical key from normalized name and version family', () => {
    expect(createGameSemanticKey('Street Fighter 6', '1.0.7'))
      .toBe(createGameSemanticKey(' street-fighter 6 ', '1.5.0'));
    expect(createGameSemanticKey('Street Fighter 6', '2.0.0'))
      .not.toBe(createGameSemanticKey('Street Fighter 6', '1.0.0'));
  });

  it('creates a valid game document with a canonical semantic key', () => {
    const game = createGame({
      name: 'Demo Fighter',
      version: '1.0.0',
      frameRate: 60,
      is3d: false,
      teamSize: 1,
      inputs: { directions: [{ label: 'Neutral', value: '5' }], buttons: [] },
    });

    expect(game.semanticKey).toBe(
      createGameSemanticKey('Demo Fighter', '1.0.0')
    );
    expect(validateGameDocument(game)).toEqual([]);
  });

  it('rejects invalid game fields and duplicate input vocabulary values', () => {
    const errors = validateGameDocument({
      ...createGame({
        name: 'Demo Fighter',
        version: '1.0.0',
        frameRate: 60,
        is3d: false,
        teamSize: 1,
        inputs: { directions: [], buttons: [] },
      }),
      config: {
        is3d: false,
        teamSize: 0,
        inputs: {
          directions: [{ label: 'Forward', value: '6' }],
          buttons: [{ label: 'Punch', value: '6' }],
        },
      },
    });

    expect(errors).toContain('teamSize must be a positive integer.');
    expect(errors).toContain('Input values must be unique.');
  });

  it('updates editable metadata without changing semantic identity', () => {
    const game = createGame({
      name: 'Demo Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    const updated = updateGameMetadata(game, { frameRate: 59.94, teamSize: 2 });

    expect(updated.semanticKey).toBe(game.semanticKey);
    expect(updated.config.frameRate).toBe(59.94);
    expect(updated.config.teamSize).toBe(2);
    expect(updated.meta.lastUpdatedAt.getTime()).toBeGreaterThanOrEqual(
      game.meta.lastUpdatedAt.getTime()
    );
  });
});