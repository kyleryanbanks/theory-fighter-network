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

  it('creates a game state definition in the chosen category and marks the game unsaved', async () => {
    await store.createGuide({
      name: 'State Fighter',
      version: '1.0.0',
      frameRate: 60,
      is3d: false,
      teamSize: 1,
      inputs: { directions: [], buttons: [] },
    });

    const createGameState = Reflect.get(store, 'createGameState') as
      | ((
          input: {
            category: string;
            name: string;
            min?: number;
            max?: number;
            unit?: string;
          }
        ) => Promise<{ status: string }>)
      | undefined;

    const result = await createGameState?.({
      category: 'Defense',
      name: 'Guard Crush',
    });

    expect(result?.status).toBe('success');
    expect(store.value()?.entities.game.states.Defense['guard-crush']).toMatchObject({
      semanticKey: 'guard-crush',
      name: 'Guard Crush',
    });
    expect(store.value()?.guide.localChanges).toContain(
      `game:${store.value()?.entities.game.semanticKey}`
    );
  });

  it('rejects duplicate normalized state names within the same category', async () => {
    await store.createGuide({
      name: 'State Fighter',
      version: '1.0.0',
      frameRate: 60,
      is3d: false,
      teamSize: 1,
      inputs: { directions: [], buttons: [] },
    });

    const createGameState = Reflect.get(store, 'createGameState') as
      | ((
          input: {
            category: string;
            name: string;
            min?: number;
            max?: number;
            unit?: string;
          }
        ) => Promise<{ status: string }>)
      | undefined;

    await createGameState?.({
      category: 'Defense',
      name: 'Guard Crush',
    });

    const duplicate = await createGameState?.({
      category: 'Defense',
      name: ' guard-crush ',
    });

    expect(duplicate?.status).toBe('error');
    expect(Object.keys(store.value()?.entities.game.states.Defense ?? {})).toEqual([
      'guard-crush',
    ]);
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

  it('overrides a universal Zone for a Stage and reverts by deleting the override', async () => {
    await store.createGuide({
      name: 'Zone Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createStage({ name: 'Training Room' });
    const stage = store.value()?.entities.stages[0];
    await store.createStageZone({ name: 'Hazard Pit' });
    const universalZone = store.value()?.entities.stageZones[0];

    const overridden = await store.overrideStageZone({
      stageKey: stage?.semanticKey ?? '',
      universalZoneKey: universalZone?.semanticKey ?? '',
    });
    const override = store
      .value()
      ?.entities.stageZones.find((zone) => zone.stageKey);
    const updatedStage = store.value()?.entities.stages[0];

    expect(overridden.status).toBe('success');
    expect(override?.name).toBe('Hazard Pit');
    expect(override?.inheritedFromZoneKey).toBe(universalZone?.semanticKey);
    expect(updatedStage?.hierarchy.zoneKeys).toContain(override?.semanticKey);
    expect(store.value()?.entities.stageZones).toHaveLength(2);

    const reverted = await store.deleteStageZone({
      stageZoneKey: override?.semanticKey ?? '',
    });

    expect(reverted.status).toBe('success');
    expect(store.value()?.entities.stageZones).toEqual([universalZone]);
  });

  it('rejects overriding the same universal Zone twice for one Stage', async () => {
    await store.createGuide({
      name: 'Zone Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createStage({ name: 'Training Room' });
    const stage = store.value()?.entities.stages[0];
    await store.createStageZone({ name: 'Hazard Pit' });
    const universalZone = store.value()?.entities.stageZones[0];
    await store.overrideStageZone({
      stageKey: stage?.semanticKey ?? '',
      universalZoneKey: universalZone?.semanticKey ?? '',
    });

    const duplicate = await store.overrideStageZone({
      stageKey: stage?.semanticKey ?? '',
      universalZoneKey: universalZone?.semanticKey ?? '',
    });

    expect(duplicate.status).toBe('error');
    expect(store.value()?.entities.stageZones).toHaveLength(2);
  });

  it('promotes a Stage-only Zone to a universal Zone', async () => {
    await store.createGuide({
      name: 'Zone Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createStage({ name: 'Training Room' });
    const stage = store.value()?.entities.stages[0];
    await store.createStageZone({
      name: 'Pit Trap',
      stageKey: stage?.semanticKey ?? '',
    });
    const stageZone = store.value()?.entities.stageZones[0];

    const promoted = await store.promoteStageZone({
      stageZoneKey: stageZone?.semanticKey ?? '',
    });
    const universalZone = store.value()?.entities.stageZones[0];
    const updatedStage = store.value()?.entities.stages[0];

    expect(promoted.status).toBe('success');
    expect(store.value()?.entities.stageZones).toHaveLength(1);
    expect(universalZone?.name).toBe('Pit Trap');
    expect(universalZone?.stageKey).toBeUndefined();
    expect(store.value()?.entities.game.universal.stageZoneKeys).toContain(
      universalZone?.semanticKey
    );
    expect(updatedStage?.hierarchy.zoneKeys).toEqual([]);
  });

  it('rejects promoting a Zone that is already an override', async () => {
    await store.createGuide({
      name: 'Zone Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createStage({ name: 'Training Room' });
    const stage = store.value()?.entities.stages[0];
    await store.createStageZone({ name: 'Hazard Pit' });
    const universalZone = store.value()?.entities.stageZones[0];
    await store.overrideStageZone({
      stageKey: stage?.semanticKey ?? '',
      universalZoneKey: universalZone?.semanticKey ?? '',
    });
    const override = store
      .value()
      ?.entities.stageZones.find((zone) => zone.stageKey);

    const promoted = await store.promoteStageZone({
      stageZoneKey: override?.semanticKey ?? '',
    });

    expect(promoted.status).toBe('error');
    expect(store.value()?.entities.stageZones).toHaveLength(2);
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

  it('updates startup, active, and recovery phase durations independently', async () => {
    await store.createGuide({
      name: 'Phase Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createMove({ name: 'Hadoken' });
    const moveKey = store.value()?.entities.moves[0]?.semanticKey ?? '';

    for (const [phase, duration] of [
      ['startup', { relative: 20 }],
      ['active', { exact: 3 }],
      ['recovery', { exact: 18, relative: 72 }],
    ] as const) {
      const result = await store.updateMovePhaseDuration({
        moveKey,
        phase,
        duration,
      });
      expect(result.status).toBe('success');
    }

    const phases = store.value()?.entities.moves[0]?.phases;
    expect(phases?.[0]?.startup?.duration).toEqual({ relative: 20 });
    expect(phases?.[0]?.active?.duration).toEqual({ exact: 3 });
    expect(phases?.[0]?.recovery?.duration).toEqual({ exact: 18, relative: 72 });
  });

  it('adds and removes ordered Move phases', async () => {
    await store.createGuide({
      name: 'Phase CRUD Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createMove({ name: 'Hadoken' });
    const moveKey = store.value()?.entities.moves[0]?.semanticKey ?? '';

    expect((await store.addMovePhase({ moveKey })).status).toBe('success');
    expect(store.value()?.entities.moves[0]?.phases).toHaveLength(2);
    expect((await store.addMovePhase({ moveKey })).status).toBe('success');
    expect(store.value()?.entities.moves[0]?.phases).toHaveLength(3);

    expect((await store.removeMovePhase({ moveKey, phaseIndex: 0 })).status).toBe('success');
    expect(store.value()?.entities.moves[0]?.phases).toHaveLength(2);
  });

  it('updates on-hit hit stop and stun DataValues independently', async () => {
    await store.createGuide({
      name: 'Outcome Data Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createMove({ name: 'Hadoken' });
    const moveKey = store.value()?.entities.moves[0]?.semanticKey ?? '';

    await store.updateMoveOutcomeDataValue({ moveKey, outcome: 'onHit', field: 'hitStop', value: { exact: 8 } });
    await store.updateMoveOutcomeDataValue({ moveKey, outcome: 'onHit', field: 'stun', value: { relative: 70 } });

    expect(store.value()?.entities.moves[0]?.phases?.[0]?.effects?.onHit).toEqual({
      hitStop: { exact: 8 },
      stun: { relative: 70 },
    });
  });

  it('updates move outcome cancels independently per outcome', async () => {
    await store.createGuide({
      name: 'Cancel Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createMove({ name: 'Jab' });
    const moveKey = store.value()?.entities.moves[0]?.semanticKey ?? '';

    const cancels = [
      { startFrame: 2, endFrame: 5, userOverrideMoves: { hadoken: true, shoryuken: true } },
    ];
    await store.updateMoveOutcomeCancels({ moveKey, outcome: 'onHit', cancels });

    expect(store.value()?.entities.moves[0]?.phases?.[0]?.effects?.onHit?.cancels).toEqual(cancels);
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

  it('promotes a Character Move to universal and rewrites Sequence references', async () => {
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
    const move = store.value()?.entities.moves[0];
    await store.createSequence({
      characterKey: character?.semanticKey ?? '',
      sequence: [{ directions: [], buttons: [], moveKey: move?.semanticKey }],
    });

    const promoted = await store.promoteMove({
      moveKey: move?.semanticKey ?? '',
    });
    const universalMove = store.value()?.entities.moves[0];
    const updatedCharacter = store.value()?.entities.characters[0];
    const sequence = store.value()?.entities.sequences[0];

    expect(promoted.status).toBe('success');
    expect(store.value()?.entities.moves).toHaveLength(1);
    expect(universalMove?.name).toBe('Hadoken');
    expect(universalMove?.characterKey).toBeUndefined();
    expect(store.value()?.entities.game.universal.moveKeys).toContain(
      universalMove?.semanticKey
    );
    expect(updatedCharacter?.hierarchy.moveKeys).toEqual([]);
    expect(sequence?.sequence[0].moveKey).toBe(universalMove?.semanticKey);
  });

  it('rejects promoting a Move that is already an override', async () => {
    await store.createGuide({
      name: 'Move Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];
    await store.createMove({ name: 'Universal Parry' });
    const universalMove = store.value()?.entities.moves[0];
    await store.overrideMove({
      characterKey: character?.semanticKey ?? '',
      universalMoveKey: universalMove?.semanticKey ?? '',
    });
    const override = store
      .value()
      ?.entities.moves.find((move) => move.characterKey);

    const promoted = await store.promoteMove({
      moveKey: override?.semanticKey ?? '',
    });

    expect(promoted.status).toBe('error');
    expect(store.value()?.entities.moves).toHaveLength(2);
  });

  it('overrides a universal Move for a Character and reverts by deleting the override', async () => {
    await store.createGuide({
      name: 'Move Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];
    await store.createMove({ name: 'Universal Parry' });
    const universalMove = store.value()?.entities.moves[0];

    const overridden = await store.overrideMove({
      characterKey: character?.semanticKey ?? '',
      universalMoveKey: universalMove?.semanticKey ?? '',
    });
    const override = store
      .value()
      ?.entities.moves.find((move) => move.characterKey);
    const updatedCharacter = store.value()?.entities.characters[0];

    expect(overridden.status).toBe('success');
    expect(override?.name).toBe('Universal Parry');
    expect(override?.parentKey).toBe(universalMove?.semanticKey);
    expect(updatedCharacter?.hierarchy.moveKeys).toContain(
      override?.semanticKey
    );
    expect(store.value()?.entities.moves).toHaveLength(2);

    const reverted = await store.deleteMove({
      moveKey: override?.semanticKey ?? '',
    });

    expect(reverted.status).toBe('success');
    expect(store.value()?.entities.moves).toEqual([universalMove]);
  });

  it('rejects overriding the same universal Move twice for one Character', async () => {
    await store.createGuide({
      name: 'Move Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];
    await store.createMove({ name: 'Universal Parry' });
    const universalMove = store.value()?.entities.moves[0];
    await store.overrideMove({
      characterKey: character?.semanticKey ?? '',
      universalMoveKey: universalMove?.semanticKey ?? '',
    });

    const duplicate = await store.overrideMove({
      characterKey: character?.semanticKey ?? '',
      universalMoveKey: universalMove?.semanticKey ?? '',
    });

    expect(duplicate.status).toBe('error');
    expect(store.value()?.entities.moves).toHaveLength(2);
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

  it('creates and deletes Teams while tracking Guide changes', async () => {
    await store.createGuide({
      name: 'Team Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 2, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    await store.createCharacter({ name: 'Ken' });
    const [ryu, ken] = store.value()?.entities.characters ?? [];

    const created = await store.createTeam({
      characterKeys: [ryu.semanticKey, ken.semanticKey],
    });
    const team = store.value()?.entities.teams[0];

    expect(created.status).toBe('success');
    expect(team?.orderedCharacterKeys).toEqual([
      ryu.semanticKey,
      ken.semanticKey,
    ]);
    expect(store.value()?.entities.game.hierarchy.teamKeys).toEqual([
      team?.semanticKey,
    ]);
    expect(store.value()?.guide.localChanges).toContain(
      `team:${team?.semanticKey}`
    );

    const deleted = await store.deleteTeam({
      teamKey: team?.semanticKey ?? '',
    });

    expect(deleted.status).toBe('success');
    expect(store.value()?.entities.teams).toEqual([]);
    expect(store.value()?.entities.game.hierarchy.teamKeys).toEqual([]);
  });

  it('rejects creating a Team with a nonexistent Character', async () => {
    await store.createGuide({
      name: 'Team Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const created = await store.createTeam({
      characterKeys: ['character-missing'],
    });

    expect(created.status).toBe('error');
    expect(store.value()?.entities.teams).toEqual([]);
  });

  it('rejects creating a Team when the Game Team Size is 1', async () => {
    await store.createGuide({
      name: 'Team Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];

    const created = await store.createTeam({
      characterKeys: [character?.semanticKey ?? ''],
    });

    expect(created.status).toBe('error');
    expect(store.value()?.entities.teams).toEqual([]);
  });

  it('rejects a Team with more Characters than the Game Team Size', async () => {
    await store.createGuide({
      name: 'Team Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 2, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    await store.createCharacter({ name: 'Ken' });
    await store.createCharacter({ name: 'Chun-Li' });
    const [ryu, ken, chunLi] = store.value()?.entities.characters ?? [];

    const created = await store.createTeam({
      characterKeys: [ryu.semanticKey, ken.semanticKey, chunLi.semanticKey],
    });

    expect(created.status).toBe('error');
    expect(store.value()?.entities.teams).toEqual([]);
  });

  it('allows a Team subset smaller than the Game Team Size', async () => {
    await store.createGuide({
      name: 'Team Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 3, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];

    const created = await store.createTeam({
      characterKeys: [character?.semanticKey ?? ''],
    });

    expect(created.status).toBe('success');
    expect(store.value()?.entities.teams).toHaveLength(1);
  });

  it('rejects duplicate Team identity based on ordered Character keys', async () => {
    await store.createGuide({
      name: 'Team Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 2, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    await store.createCharacter({ name: 'Ken' });
    const [ryu, ken] = store.value()?.entities.characters ?? [];
    await store.createTeam({
      characterKeys: [ryu.semanticKey, ken.semanticKey],
    });

    const duplicate = await store.createTeam({
      characterKeys: [ryu.semanticKey, ken.semanticKey],
    });

    expect(duplicate.status).toBe('error');
    expect(store.value()?.entities.teams).toHaveLength(1);
  });

  it('rejects deleting a Team that still has Sequences', async () => {
    await store.createGuide({
      name: 'Team Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 2, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];
    const created = await store.createTeam({
      characterKeys: [character?.semanticKey ?? ''],
    });
    const team = store.value()?.entities.teams[0];
    await store.createSequence({
      teamKey: team?.semanticKey ?? '',
      sequence: [{ directions: ['6'], buttons: ['mp'] }],
    });

    const deleted = await store.deleteTeam({
      teamKey: team?.semanticKey ?? '',
    });

    expect(created.status).toBe('success');
    expect(deleted.status).toBe('error');
    expect(store.value()?.entities.teams).toHaveLength(1);
  });

  it('creates and deletes Matchups while tracking Guide changes', async () => {
    await store.createGuide({
      name: 'Matchup Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    await store.createCharacter({ name: 'Ken' });
    const [ryu, ken] = store.value()?.entities.characters ?? [];

    const created = await store.createMatchup({
      attackerKey: ryu.semanticKey,
      defenderKey: ken.semanticKey,
    });
    const matchup = store.value()?.entities.matchups[0];

    expect(created.status).toBe('success');
    expect(matchup?.attackerKey).toBe(ryu.semanticKey);
    expect(matchup?.defenderKey).toBe(ken.semanticKey);
    expect(store.value()?.entities.game.hierarchy.matchupKeys).toEqual([
      matchup?.semanticKey,
    ]);
    expect(store.value()?.guide.localChanges).toContain(
      `matchup:${matchup?.semanticKey}`
    );

    const deleted = await store.deleteMatchup({
      matchupKey: matchup?.semanticKey ?? '',
    });

    expect(deleted.status).toBe('success');
    expect(store.value()?.entities.matchups).toEqual([]);
    expect(store.value()?.entities.game.hierarchy.matchupKeys).toEqual([]);
  });

  it('rejects creating a Matchup with a nonexistent Character', async () => {
    await store.createGuide({
      name: 'Matchup Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const ryu = store.value()?.entities.characters[0];

    const created = await store.createMatchup({
      attackerKey: ryu?.semanticKey ?? '',
      defenderKey: 'character-missing',
    });

    expect(created.status).toBe('error');
    expect(store.value()?.entities.matchups).toEqual([]);
  });

  it('allows a mirror-match Matchup where attacker and defender are the same Character', async () => {
    await store.createGuide({
      name: 'Matchup Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const ryu = store.value()?.entities.characters[0];

    const created = await store.createMatchup({
      attackerKey: ryu?.semanticKey ?? '',
      defenderKey: ryu?.semanticKey ?? '',
    });

    expect(created.status).toBe('success');
    expect(store.value()?.entities.matchups).toHaveLength(1);
  });

  it('rejects duplicate Matchup identity based on attacker and defender', async () => {
    await store.createGuide({
      name: 'Matchup Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    await store.createCharacter({ name: 'Ken' });
    const [ryu, ken] = store.value()?.entities.characters ?? [];
    await store.createMatchup({
      attackerKey: ryu.semanticKey,
      defenderKey: ken.semanticKey,
    });

    const duplicate = await store.createMatchup({
      attackerKey: ryu.semanticKey,
      defenderKey: ken.semanticKey,
    });

    expect(duplicate.status).toBe('error');
    expect(store.value()?.entities.matchups).toHaveLength(1);
  });

  it('rejects deleting a nonexistent Matchup', async () => {
    await store.createGuide({
      name: 'Matchup Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const deleted = await store.deleteMatchup({ matchupKey: 'matchup-missing' });

    expect(deleted.status).toBe('error');
  });

  it('adds and removes Matchup Scenarios while tracking Guide changes', async () => {
    await store.createGuide({
      name: 'Matchup Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    await store.createCharacter({ name: 'Ken' });
    const [ryu, ken] = store.value()?.entities.characters ?? [];
    await store.createMove({ name: 'Fireball' });
    const move = store.value()?.entities.moves[0];
    await store.createMatchup({
      attackerKey: ryu.semanticKey,
      defenderKey: ken.semanticKey,
    });
    const matchup = store.value()?.entities.matchups[0];

    const added = await store.addMatchupScenario({
      matchupKey: matchup?.semanticKey ?? '',
      opponentOptionKey: move?.semanticKey ?? '',
      name: 'Fireball punish',
    });
    const scenario = store.value()?.entities.matchups[0].scenarios[0];

    expect(added.status).toBe('success');
    expect(scenario?.opponentOptionKey).toBe(move?.semanticKey);
    expect(scenario?.name).toBe('Fireball punish');
    expect(store.value()?.guide.localChanges).toContain(
      `matchup:${matchup?.semanticKey}`
    );

    const removed = await store.removeMatchupScenario({
      matchupKey: matchup?.semanticKey ?? '',
      scenarioKey: scenario?.semanticKey ?? '',
    });

    expect(removed.status).toBe('success');
    expect(store.value()?.entities.matchups[0].scenarios).toEqual([]);
  });

  it('rejects adding a Scenario with a nonexistent opponentOptionKey', async () => {
    await store.createGuide({
      name: 'Matchup Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    await store.createCharacter({ name: 'Ken' });
    const [ryu, ken] = store.value()?.entities.characters ?? [];
    await store.createMatchup({
      attackerKey: ryu.semanticKey,
      defenderKey: ken.semanticKey,
    });
    const matchup = store.value()?.entities.matchups[0];

    const added = await store.addMatchupScenario({
      matchupKey: matchup?.semanticKey ?? '',
      opponentOptionKey: 'move-missing',
    });

    expect(added.status).toBe('error');
    expect(store.value()?.entities.matchups[0].scenarios).toEqual([]);
  });

  it('rejects adding a Scenario to a nonexistent Matchup', async () => {
    await store.createGuide({
      name: 'Matchup Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createMove({ name: 'Fireball' });
    const move = store.value()?.entities.moves[0];

    const added = await store.addMatchupScenario({
      matchupKey: 'matchup-missing',
      opponentOptionKey: move?.semanticKey ?? '',
    });

    expect(added.status).toBe('error');
  });

  it('rejects adding a Scenario scoped to a nonexistent Stage', async () => {
    await store.createGuide({
      name: 'Matchup Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    await store.createCharacter({ name: 'Ken' });
    const [ryu, ken] = store.value()?.entities.characters ?? [];
    await store.createMove({ name: 'Fireball' });
    const move = store.value()?.entities.moves[0];
    await store.createMatchup({
      attackerKey: ryu.semanticKey,
      defenderKey: ken.semanticKey,
    });
    const matchup = store.value()?.entities.matchups[0];

    const added = await store.addMatchupScenario({
      matchupKey: matchup?.semanticKey ?? '',
      opponentOptionKey: move?.semanticKey ?? '',
      stageKey: 'stage-missing',
    });

    expect(added.status).toBe('error');
    expect(store.value()?.entities.matchups[0].scenarios).toEqual([]);
  });

  it('rejects duplicate Scenario identity within the same Matchup', async () => {
    await store.createGuide({
      name: 'Matchup Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    await store.createCharacter({ name: 'Ken' });
    const [ryu, ken] = store.value()?.entities.characters ?? [];
    await store.createMove({ name: 'Fireball' });
    const move = store.value()?.entities.moves[0];
    await store.createMatchup({
      attackerKey: ryu.semanticKey,
      defenderKey: ken.semanticKey,
    });
    const matchup = store.value()?.entities.matchups[0];
    await store.addMatchupScenario({
      matchupKey: matchup?.semanticKey ?? '',
      opponentOptionKey: move?.semanticKey ?? '',
    });

    const duplicate = await store.addMatchupScenario({
      matchupKey: matchup?.semanticKey ?? '',
      opponentOptionKey: move?.semanticKey ?? '',
    });

    expect(duplicate.status).toBe('error');
    expect(store.value()?.entities.matchups[0].scenarios).toHaveLength(1);
  });

  it('rejects removing a nonexistent Scenario', async () => {
    await store.createGuide({
      name: 'Matchup Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    await store.createCharacter({ name: 'Ken' });
    const [ryu, ken] = store.value()?.entities.characters ?? [];
    await store.createMatchup({
      attackerKey: ryu.semanticKey,
      defenderKey: ken.semanticKey,
    });
    const matchup = store.value()?.entities.matchups[0];

    const removed = await store.removeMatchupScenario({
      matchupKey: matchup?.semanticKey ?? '',
      scenarioKey: 'scenario-missing',
    });

    expect(removed.status).toBe('error');
  });

  it('adds and removes Scenario Responses', async () => {
    await store.createGuide({
      name: 'Response Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    await store.createCharacter({ name: 'Ken' });
    const [ryu, ken] = store.value()?.entities.characters ?? [];
    await store.createMove({ name: 'Fireball' });
    await store.createMove({ name: 'Backdash' });
    const [fireball, backdash] = store.value()?.entities.moves ?? [];
    await store.createMatchup({
      attackerKey: ryu.semanticKey,
      defenderKey: ken.semanticKey,
    });
    const matchup = store.value()?.entities.matchups[0];
    await store.addMatchupScenario({
      matchupKey: matchup?.semanticKey ?? '',
      opponentOptionKey: fireball.semanticKey,
    });
    const scenario = store.value()?.entities.matchups[0].scenarios[0];

    const added = await store.addScenarioResponse({
      matchupKey: matchup?.semanticKey ?? '',
      scenarioKey: scenario?.semanticKey ?? '',
      playerOptionKey: backdash.semanticKey,
      outcome: 1,
      notes: 'Escapes cleanly',
    });
    const response = store.value()?.entities.matchups[0].scenarios[0].responses[0];

    expect(added.status).toBe('success');
    expect(response?.playerOptionKey).toBe(backdash.semanticKey);
    expect(response?.outcome).toBe(1);

    const removed = await store.removeScenarioResponse({
      matchupKey: matchup?.semanticKey ?? '',
      scenarioKey: scenario?.semanticKey ?? '',
      responseKey: response?.semanticKey ?? '',
    });

    expect(removed.status).toBe('success');
    expect(store.value()?.entities.matchups[0].scenarios[0].responses).toEqual([]);
  });

  it('rejects a Response with a missing player option', async () => {
    await store.createGuide({
      name: 'Response Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const added = await store.addScenarioResponse({
      matchupKey: 'matchup-missing',
      scenarioKey: 'scenario-missing',
      playerOptionKey: 'move-missing',
    });

    expect(added.status).toBe('error');
  });

  it('adds and removes a note on any entity type generically', async () => {
    await store.createGuide({
      name: 'Notes Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];

    const added = await store.addEntityNote({
      entityType: 'character',
      entityKey: character?.semanticKey ?? '',
      text: 'Forgot to log his command grab',
    });
    const note = store.value()?.entities.characters[0].meta.notes?.[0];

    expect(added.status).toBe('success');
    expect(note?.text).toBe('Forgot to log his command grab');
    expect(note?.promotedToKey).toBeUndefined();
    expect(store.value()?.guide.localChanges).toContain(
      `character:${character?.semanticKey}`
    );

    const removed = await store.removeEntityNote({
      entityType: 'character',
      entityKey: character?.semanticKey ?? '',
      noteId: note?.id ?? '',
    });

    expect(removed.status).toBe('success');
    expect(store.value()?.entities.characters[0].meta.notes).toEqual([]);
  });

  it('adds a note on a Matchup and promotes it, keeping the note with a promotedToKey', async () => {
    await store.createGuide({
      name: 'Notes Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    await store.createCharacter({ name: 'Ken' });
    const [ryu, ken] = store.value()?.entities.characters ?? [];
    await store.createMatchup({
      attackerKey: ryu.semanticKey,
      defenderKey: ken.semanticKey,
    });
    const matchup = store.value()?.entities.matchups[0];
    await store.addEntityNote({
      entityType: 'matchup',
      entityKey: matchup?.semanticKey ?? '',
      text: 'Got hit by something weird, explore later',
    });
    const note = store.value()?.entities.matchups[0].meta.notes?.[0];

    const promoted = await store.promoteEntityNote({
      entityType: 'matchup',
      entityKey: matchup?.semanticKey ?? '',
      noteId: note?.id ?? '',
      promotedToKey: 'scenario-123',
    });

    expect(promoted.status).toBe('success');
    const updatedNote = store.value()?.entities.matchups[0].meta.notes?.[0];
    expect(updatedNote?.id).toBe(note?.id);
    expect(updatedNote?.text).toBe(note?.text);
    expect(updatedNote?.promotedToKey).toBe('scenario-123');
  });

  it('rejects adding a note with empty text', async () => {
    await store.createGuide({
      name: 'Notes Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];

    const added = await store.addEntityNote({
      entityType: 'character',
      entityKey: character?.semanticKey ?? '',
      text: '   ',
    });

    expect(added.status).toBe('error');
  });

  it('rejects adding a note to a nonexistent entity', async () => {
    await store.createGuide({
      name: 'Notes Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const added = await store.addEntityNote({
      entityType: 'character',
      entityKey: 'character-missing',
      text: 'Some note',
    });

    expect(added.status).toBe('error');
  });

  it('rejects removing a nonexistent note', async () => {
    await store.createGuide({
      name: 'Notes Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });
    await store.createCharacter({ name: 'Ryu' });
    const character = store.value()?.entities.characters[0];

    const removed = await store.removeEntityNote({
      entityType: 'character',
      entityKey: character?.semanticKey ?? '',
      noteId: 'note-missing',
    });

    expect(removed.status).toBe('error');
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

  it('deleteGameState removes a state entry and marks game unsaved', async () => {
    await store.createGuide({
      name: 'State Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const createGameState = Reflect.get(store, 'createGameState') as
      | ((input: { category: string; name: string }) => Promise<{ status: string }>)
      | undefined;
    const deleteGameState = Reflect.get(store, 'deleteGameState') as
      | ((input: { category: string; semanticKey: string }) => Promise<{ status: string }>)
      | undefined;

    await createGameState?.({ category: 'Defense', name: 'Guard Crush' });

    const result = await deleteGameState?.({ category: 'Defense', semanticKey: 'guard-crush' });

    expect(result?.status).toBe('success');
    expect(store.value()?.entities.game.states['Defense']).toBeUndefined();
    expect(store.value()?.guide.localChanges).toContain(
      `game:${store.value()?.entities.game.semanticKey}`
    );
  });

  it('deleteGameState removes only the targeted state, leaving others in the category', async () => {
    await store.createGuide({
      name: 'State Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const createGameState = Reflect.get(store, 'createGameState') as
      | ((input: { category: string; name: string }) => Promise<{ status: string }>)
      | undefined;
    const deleteGameState = Reflect.get(store, 'deleteGameState') as
      | ((input: { category: string; semanticKey: string }) => Promise<{ status: string }>)
      | undefined;

    await createGameState?.({ category: 'Defense', name: 'Guard Crush' });
    await createGameState?.({ category: 'Defense', name: 'Parry' });

    await deleteGameState?.({ category: 'Defense', semanticKey: 'guard-crush' });

    expect(store.value()?.entities.game.states['Defense']?.['guard-crush']).toBeUndefined();
    expect(store.value()?.entities.game.states['Defense']?.['parry']).toBeDefined();
  });

  it('deleteGameState returns error when state does not exist', async () => {
    await store.createGuide({
      name: 'State Fighter', version: '1.0.0', frameRate: 60,
      is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    const deleteGameState = Reflect.get(store, 'deleteGameState') as
      | ((input: { category: string; semanticKey: string }) => Promise<{ status: string }>)
      | undefined;

    const result = await deleteGameState?.({ category: 'Defense', semanticKey: 'nonexistent' });

    expect(result?.status).toBe('error');
  });

  it('updates Sequence steps including frame delays', async () => {
    await store.createGuide({
     name: 'Sequence Fighter', version: '1.0.0', frameRate: 60,
     is3d: false, teamSize: 1, inputs: { directions: [], buttons: [] },
    });

    await store.createSequence({
     sequence: [
       { directions: ['5'], buttons: ['lp'], frames: 1 },
       { directions: ['6'], buttons: ['mp'], frames: 1 },
     ],
    });

    const originalSequence = store.value()?.entities.sequences[0];
    expect(originalSequence?.sequence[0]?.frames).toBe(1);
    expect(originalSequence?.sequence[1]?.frames).toBe(1);

    // Update frames for second step
    const updated = await store.updateSequence({
     sequenceKey: originalSequence?.semanticKey ?? '',
     sequence: [
       { directions: ['5'], buttons: ['lp'], frames: 1 },
       { directions: ['6'], buttons: ['mp'], frames: 8 },
     ],
    });

    expect(updated.status).toBe('success');
    const updatedSequence = store.value()?.entities.sequences[0];
    expect(updatedSequence?.sequence[1]?.frames).toBe(8);
    expect(store.value()?.guide.localChanges).toContain(
     `sequence:${originalSequence?.semanticKey}`
    );
  });
});