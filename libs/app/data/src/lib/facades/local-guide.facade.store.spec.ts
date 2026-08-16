import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  LocalGuideFacadeStore,
  TFN_LOCAL_GUIDE_PERSISTENCE,
  type LocalGuidePersistencePort,
} from './local-guide.facade.store';
import {
  createGuideJson,
  type LocalGuide,
} from '../guide';
import { createStateModel } from '../models';

// Shared fixture builder used to keep tests focused on facade behavior.
function buildGuide(gameKey = 'game-demo-1x'): LocalGuide {
  return {
    guide: createGuideJson({ gameKey }),
    entities: {
      game: {
        name: 'Demo Fighter',
        version: '1.0.0',
        semanticKey: gameKey,
        frameRate: 60,
        is3d: false,
        teamSize: 1,
        inputs: {
          directions: [{ label: '5', value: '5' }],
          buttons: [{ label: 'LP', value: 'lp' }],
        },
        states: createStateModel(),
        community: { ownerId: 'local-user' },
        meta: {
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          lastUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      },
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

// Mock port lets tests verify orchestration without real filesystem side effects.
function createPersistenceMock(): LocalGuidePersistencePort {
  return {
    parseArchiveFile: vi.fn(async () => buildGuide('imported-game')),
    buildArchiveFile: vi.fn(
      async (_guide, fileName = 'guide.tfn') =>
        new File(['{}'], fileName, { type: 'application/json' })
    ),
  };
}

describe('LocalGuideFacadeStore', () => {
  let store: InstanceType<typeof LocalGuideFacadeStore>;
  let persistence: LocalGuidePersistencePort;

  beforeEach(() => {
    persistence = createPersistenceMock();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: TFN_LOCAL_GUIDE_PERSISTENCE,
          useValue: persistence,
        },
      ],
    });

    store = TestBed.inject(LocalGuideFacadeStore);
  });

  it('creates a new Guide through a mutation and stores it as the active value', async () => {
    const result = await store.createGuide({
      name: 'Created Fighter',
      version: '1.2.0',
      frameRate: 60,
      is3d: false,
      teamSize: 1,
      inputs: { directions: [], buttons: [] },
    });

    expect(result.status).toBe('success');
    expect(store.value()?.guide.gameKey).toBe(
      store.value()?.entities.game.semanticKey
    );
    expect(store.value()?.entities.game.name).toBe('Created Fighter');
  });

  it('updates active game metadata while preserving identity and marking it unsaved', async () => {
    await store.createGuide({
      name: 'Editable Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    const semanticKey = store.value()?.entities.game.semanticKey;

    const result = await store.updateActiveGame({ teamSize: 2 });

    expect(result.status).toBe('success');
    expect(store.value()?.entities.game.semanticKey).toBe(semanticKey);
    expect(store.value()?.entities.game.config.teamSize).toBe(2);
    expect(store.value()?.guide.localChanges).toContain(`game:${semanticKey}`);
  });

  it('creates and deletes Stages while tracking Guide changes', async () => {
    await store.createGuide({
      name: 'Stage Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const created = await store.createStage({ name: 'Training Room' });
    const stage = store.value()?.entities.stages[0];

    expect(created.status).toBe('success');
    expect(stage?.name).toBe('Training Room');
    expect(store.value()?.entities.game.hierarchy.stageKeys).toEqual([
      stage?.semanticKey,
    ]);
    expect(store.value()?.guide.localChanges).toContain(
      `stage:${stage?.semanticKey}`
    );

    const deleted = await store.deleteStage({
      stageKey: stage?.semanticKey ?? '',
    });

    expect(deleted.status).toBe('success');
    expect(store.value()?.entities.stages).toEqual([]);
    expect(store.value()?.entities.game.hierarchy.stageKeys).toEqual([]);
    expect(store.value()?.guide.localChanges).toContain(
      `stage:${stage?.semanticKey}`
    );
  });

  it('rejects duplicate Stage identity within a Guide', async () => {
    await store.createGuide({
      name: 'Stage Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createStage({ name: 'Training Room' });

    const duplicate = await store.createStage({ name: ' training-room ' });

    expect(duplicate.status).toBe('error');
    expect(store.value()?.entities.stages).toHaveLength(1);
  });

  it('creates and deletes stage-scoped Zones while tracking Guide changes', async () => {
    await store.createGuide({
      name: 'Zone Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createStage({ name: 'Training Room' });
    const stage = store.value()?.entities.stages[0];

    const created = await store.createStageZone({
      name: 'Platform',
      stageKey: stage?.semanticKey ?? '',
    });
    const zone = store.value()?.entities.stageZones[0];
    const updatedStage = store.value()?.entities.stages[0];

    expect(created.status).toBe('success');
    expect(zone?.name).toBe('Platform');
    expect(zone?.stageKey).toBe(stage?.semanticKey);
    expect(updatedStage?.hierarchy.zoneKeys).toContain(zone?.semanticKey);
    expect(store.value()?.guide.localChanges).toContain(
      `stageZone:${zone?.semanticKey}`
    );

    const deleted = await store.deleteStageZone({
      stageZoneKey: zone?.semanticKey ?? '',
    });

    expect(deleted.status).toBe('success');
    expect(store.value()?.entities.stageZones).toEqual([]);
    expect(store.value()?.entities.stages[0]?.hierarchy.zoneKeys).toEqual([]);
  });

  it('creates and deletes Characters while tracking Guide changes', async () => {
    await store.createGuide({
      name: 'Character Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const created = await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];

    expect(created.status).toBe('success');
    expect(character?.name).toBe('Ryu');
    expect(store.value()?.entities.game.hierarchy.characterKeys).toEqual([
      character?.semanticKey,
    ]);
    expect(store.value()?.guide.localChanges).toContain(
      `character:${character?.semanticKey}`
    );

    const deleted = await store.deleteCharacter({
      characterKey: character?.semanticKey ?? '',
    });

    expect(deleted.status).toBe('success');
    expect(store.value()?.entities.characters).toEqual([]);
    expect(store.value()?.entities.game.hierarchy.characterKeys).toEqual([]);
    expect(store.value()?.guide.localChanges).toContain(
      `character:${character?.semanticKey}`
    );
  });

  it('rejects duplicate Character identity within a Guide', async () => {
    await store.createGuide({
      name: 'Character Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });

    const duplicate = await store.createCharacter({ name: ' ryu ' });

    expect(duplicate.status).toBe('error');
    expect(store.value()?.entities.characters).toHaveLength(1);
  });

  it('creates and deletes character-scoped Moves while tracking Guide changes', async () => {
    await store.createGuide({
      name: 'Move Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];

    const created = await store.createMove({
      name: 'Hadoken',
      characterKey: character?.semanticKey ?? '',
    });
    const move = store.value()?.entities.moves[0];
    const updatedCharacter = store.value()?.entities.characters[0];

    expect(created.status).toBe('success');
    expect(move?.name).toBe('Hadoken');
    expect(move?.characterKey).toBe(character?.semanticKey);
    expect(updatedCharacter?.hierarchy.moveKeys).toContain(move?.semanticKey);
    expect(store.value()?.guide.localChanges).toContain(
      `move:${move?.semanticKey}`
    );

    const deleted = await store.deleteMove({
      moveKey: move?.semanticKey ?? '',
    });

    expect(deleted.status).toBe('success');
    expect(store.value()?.entities.moves).toEqual([]);
    expect(
      store.value()?.entities.characters[0]?.hierarchy.moveKeys
    ).toEqual([]);
  });

  it('creates a universal Move scoped to the Game when no character is given', async () => {
    await store.createGuide({
      name: 'Move Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const created = await store.createMove({ name: 'Universal Parry' });
    const move = store.value()?.entities.moves[0];

    expect(created.status).toBe('success');
    expect(move?.characterKey).toBeUndefined();
    expect(store.value()?.entities.game.universal.moveKeys).toContain(
      move?.semanticKey
    );
  });

  it('rejects duplicate Move identity within the same scope', async () => {
    await store.createGuide({
      name: 'Move Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];
    await store.createMove({
      name: 'Hadoken',
      characterKey: character?.semanticKey ?? '',
    });

    const duplicate = await store.createMove({
      name: ' hadoken ',
      characterKey: character?.semanticKey ?? '',
    });

    expect(duplicate.status).toBe('error');
    expect(store.value()?.entities.moves).toHaveLength(1);
  });

  it('creates and deletes character-scoped Sequences while tracking Guide changes', async () => {
    await store.createGuide({
      name: 'Sequence Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];

    const created = await store.createSequence({
      characterKey: character?.semanticKey ?? '',
      sequence: [{ directions: ['6'], buttons: ['mp'] }],
    });
    const sequence = store.value()?.entities.sequences[0];
    const updatedCharacter = store.value()?.entities.characters[0];

    expect(created.status).toBe('success');
    expect(sequence?.characterKey).toBe(character?.semanticKey);
    expect(updatedCharacter?.hierarchy.sequenceKeys).toContain(
      sequence?.semanticKey
    );
    expect(store.value()?.guide.localChanges).toContain(
      `sequence:${sequence?.semanticKey}`
    );

    const deleted = await store.deleteSequence({
      sequenceKey: sequence?.semanticKey ?? '',
    });

    expect(deleted.status).toBe('success');
    expect(store.value()?.entities.sequences).toEqual([]);
    expect(
      store.value()?.entities.characters[0]?.hierarchy.sequenceKeys
    ).toEqual([]);
  });

  it('creates a universal Sequence scoped to the Game when no character or team is given', async () => {
    await store.createGuide({
      name: 'Sequence Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const created = await store.createSequence({
      sequence: [{ directions: ['6'], buttons: ['mp'] }],
    });
    const sequence = store.value()?.entities.sequences[0];

    expect(created.status).toBe('success');
    expect(sequence?.characterKey).toBeUndefined();
    expect(sequence?.teamKey).toBeUndefined();
    expect(store.value()?.entities.game.universal.sequenceKeys).toContain(
      sequence?.semanticKey
    );
  });

  it('rejects duplicate Sequence identity within the same scope', async () => {
    await store.createGuide({
      name: 'Sequence Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createSequence({
      sequence: [{ directions: ['6'], buttons: ['mp'] }],
    });

    const duplicate = await store.createSequence({
      sequence: [{ directions: ['6'], buttons: ['mp'] }],
    });

    expect(duplicate.status).toBe('error');
    expect(store.value()?.entities.sequences).toHaveLength(1);
  });

  it('rejects creating a Sequence scoped to a nonexistent Team', async () => {
    await store.createGuide({
      name: 'Sequence Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const created = await store.createSequence({
      teamKey: 'team-missing',
      sequence: [{ directions: ['6'], buttons: ['mp'] }],
    });

    expect(created.status).toBe('error');
    expect(store.value()?.entities.sequences).toEqual([]);
  });

  it('imports a Guide through a mutation and replaces the active Guide', async () => {
    const importedGuide = buildGuide('imported-game');
    const archiveFile = new File(['{}'], 'import.tfn', {
      type: 'application/json',
    });

    vi.mocked(persistence.parseArchiveFile).mockResolvedValue(
      importedGuide
    );

    const result = await store.importArchive(archiveFile);

    expect(result.status).toBe('success');
    expect(store.value()?.guide.gameKey).toBe('imported-game');
  });

  it('exports the active Guide through a mutation', async () => {
    await store.createGuide({
      name: 'Export Fighter', version: '3.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const result = await store.exportArchive({
      fileName: 'exported-guide.tfn',
    });

    expect(result.status).toBe('success');

    if (result.status === 'success') {
      expect(result.value.name).toBe('exported-guide.tfn');
    }

    expect(persistence.buildArchiveFile).toHaveBeenCalledTimes(1);
  });
});