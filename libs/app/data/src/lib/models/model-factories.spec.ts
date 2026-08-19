import {
  createCharacterDocument,
  createDataValue,
  createGameDocument,
  createInput,
  createInputs,
  createMatchupDocument,
  createMatchupScenario,
  createMoveDocument,
  createMovePhase,
  createProjectileDocument,
  createProjectilePhase,
  createScenarioResponse,
  createSequenceDocument,
  createStageDocument,
  createStageZoneDocument,
  createState,
  createStateModel,
  createRuntimeStateModel,
  createStep,
  createTeamDocument,
  type StateDocument,
} from './index';

type Assert<T extends true> = T;

describe('model factories', () => {
  it('keeps executable behavior outside persisted state definitions', () => {
    type StateBehaviorKeys = Extract<
      keyof StateDocument,
      'onUpdate' | 'onFrameAdvance'
    >;
    type StateExcludesBehavior = Assert<
      StateBehaviorKeys extends never ? true : false
    >;

    expectTypeOf<StateExcludesBehavior>().toEqualTypeOf<true>();
  });

  it('creates valid defaults for persisted models and named direct children', () => {
    expect(createDataValue().exact).toBe(0);
    expect(createInput().label).toBe('');
    expect(createInputs()).toEqual({ directions: [], buttons: [] });
    expect(createState().semanticKey).toBe('');
    expect(createStateModel()).toEqual({});
    expect(createRuntimeStateModel()).toEqual({});
    expect(createGameDocument().community.ownerId).toBe('local-user');
    expect(createGameDocument().hierarchy.stageKeys).toEqual([]);
    expect(createGameDocument().universal.moveKeys).toEqual([]);
    expect(createStageDocument().hierarchy.zoneKeys).toEqual([]);
    expect(createStageZoneDocument().mechanicStateKeys).toEqual([]);
    expect(createCharacterDocument().neutralRegions).toEqual({});
    expect(createCharacterDocument().hierarchy.moveKeys).toEqual([]);
    expect(createCharacterDocument().hierarchy.sequenceKeys).toEqual([]);
    expect(createStep().frames).toBe(1);
    expect(createMovePhase()).toEqual({});
    expect(createMoveDocument().preconditions).toEqual({});
    expect(createProjectilePhase().duration).toEqual({ exact: 0 });
    expect(createProjectileDocument().state).toEqual({});
    expect(createTeamDocument().orderedCharacterKeys).toEqual([]);
    expect(createTeamDocument().hierarchy.sequenceKeys).toEqual([]);
    expect(createSequenceDocument().sequence).toEqual([]);
    expect(createScenarioResponse().outcome).toBe(0);
    expect(createMatchupScenario().responses).toEqual([]);
    expect(createMatchupDocument().scenarios).toEqual([]);
  });

  it('applies top-level overrides after defaults', () => {
    const game = createGameDocument({ name: 'Street Fighter', config: { is3d: false, teamSize: 2, inputs: { directions: [], buttons: [] } } });
    const phase = createProjectilePhase({ destroyedAfter: true });

    expect(game.name).toBe('Street Fighter');
    expect(game.config.teamSize).toBe(2);
    expect(phase.destroyedAfter).toBe(true);
  });
});