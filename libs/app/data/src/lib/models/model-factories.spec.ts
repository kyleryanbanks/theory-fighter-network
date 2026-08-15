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
} from './index';

describe('model factories', () => {
  it('creates valid defaults for persisted models and named direct children', () => {
    expect(createDataValue().exact).toBe(0);
    expect(createInput().label).toBe('');
    expect(createInputs()).toEqual({ directions: [], buttons: [] });
    expect(createState().semanticKey).toBe('');
    expect(createStateModel().attacks).toEqual({});
    expect(createRuntimeStateModel().projectiles).toEqual({});
    expect(createGameDocument().community.ownerId).toBe('local-user');
    expect(createStageDocument().name).toBe('');
    expect(createStageZoneDocument().mechanicStateKeys).toEqual([]);
    expect(createCharacterDocument().neutralRegions).toEqual({});
    expect(createStep().frames).toBe(1);
    expect(createMovePhase()).toEqual({});
    expect(createMoveDocument().preconditions).toEqual({});
    expect(createProjectilePhase().duration).toEqual({ exact: 0 });
    expect(createProjectileDocument().state.projectiles).toEqual({});
    expect(createTeamDocument().orderedCharacterKeys).toEqual([]);
    expect(createSequenceDocument().sequence).toEqual([]);
    expect(createScenarioResponse().outcome).toBe(0);
    expect(createMatchupScenario().responses).toEqual([]);
    expect(createMatchupDocument().scenarios).toEqual([]);
  });

  it('applies top-level overrides after defaults', () => {
    const game = createGameDocument({ name: 'Street Fighter', teamSize: 2 });
    const phase = createProjectilePhase({ destroyedAfter: true });

    expect(game.name).toBe('Street Fighter');
    expect(game.teamSize).toBe(2);
    expect(phase.destroyedAfter).toBe(true);
  });
});