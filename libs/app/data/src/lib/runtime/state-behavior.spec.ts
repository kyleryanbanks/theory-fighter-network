import { createRuntimeStateModel, createState } from '../models';
import { StateBehaviorRegistry } from './state-behavior';

describe('StateBehaviorRegistry', () => {
  it('registers serialized behavior code from a state document', () => {
    const registry = new StateBehaviorRegistry();
    const context = {
      gameKey: 'game-street-fighter',
      activeCharacterKey: 'character-ryu',
      runtimeState: createRuntimeStateModel(),
      frame: 2,
      roundNumber: 1,
    };
    const state = createState({
      semanticKey: 'state-set-frame',
      behavior: {
        onUpdate: `
          return {
            ...context,
            frame: incomingValue,
          };
        `,
      },
    });
    const serializedState = JSON.parse(JSON.stringify(state));

    registry.registerState(serializedState);
    const result = registry
      .resolve('state-set-frame')
      ?.onUpdate?.(9, context);

    expect(result?.frame).toBe(9);
  });

  it('compiles and runs a trusted frame behavior code block', () => {
    const registry = new StateBehaviorRegistry();
    const context = {
      gameKey: 'game-street-fighter',
      activeCharacterKey: 'character-ryu',
      runtimeState: createRuntimeStateModel(),
      frame: 2,
      roundNumber: 1,
    };

    registry.registerCode('state-add-frame', {
      onFrameAdvance: `
        return {
          ...context,
          frame: context.frame + 3,
        };
      `,
    });

    const result = registry.advanceFrame(context);

    expect(result.frame).toBe(5);
  });

  it('runs preferred state keys first and appends remaining registrations', () => {
    const registry = new StateBehaviorRegistry([
      'state-add-frame',
      'state-double-frame',
    ]);
    const context = {
      gameKey: 'game-street-fighter',
      activeCharacterKey: 'character-ryu',
      runtimeState: createRuntimeStateModel(),
      frame: 2,
      roundNumber: 1,
    };
    let executionOrder = 1;

    registry.register('state-double-frame', {
      onFrameAdvance: (currentContext) => {
        expect(executionOrder).toBe(2);
        executionOrder += 1;

        return {
          ...currentContext,
          frame: currentContext.frame * 2,
        };
      },
    });
    registry.register('state-subtract-frame', {
      onFrameAdvance: (currentContext) => {
        expect(executionOrder).toBe(3);

        return {
          ...currentContext,
          frame: currentContext.frame - 4,
        };
      },
    });
    registry.register('state-add-frame', {
      onFrameAdvance: (currentContext) => {
        expect(executionOrder).toBe(1);
        executionOrder += 1;

        return {
          ...currentContext,
          frame: currentContext.frame + 3,
        };
      },
    });

    const result = registry.advanceFrame(context);

    expect(result.frame).toBe(6);
  });

  it('passes context through frame behaviors in registration order', () => {
    const registry = new StateBehaviorRegistry();
    const context = {
      gameKey: 'game-street-fighter',
      activeCharacterKey: 'character-ryu',
      runtimeState: createRuntimeStateModel(),
      frame: 2,
      roundNumber: 1,
    };

    registry.register('state-double-frame', {
      onFrameAdvance: (currentContext) => ({
        ...currentContext,
        frame: currentContext.frame * 2,
      }),
    });
    registry.register('state-add-frame', {
      onFrameAdvance: (currentContext) => ({
        ...currentContext,
        frame: currentContext.frame + 3,
      }),
    });

    const result = registry.advanceFrame(context);

    expect(result.frame).toBe(7);
  });

  it('ignores registered states without frame behavior', () => {
    const registry = new StateBehaviorRegistry();
    const context = {
      gameKey: 'game-street-fighter',
      activeCharacterKey: 'character-ryu',
      runtimeState: createRuntimeStateModel(),
      frame: 2,
      roundNumber: 1,
    };

    registry.register('state-health', {
      onUpdate: (_incomingValue, currentContext) => currentContext,
    });
    registry.register('state-gravity', {
      onFrameAdvance: (currentContext) => ({
        ...currentContext,
        frame: currentContext.frame + 1,
      }),
    });

    const result = registry.advanceFrame(context);

    expect(result.frame).toBe(3);
  });

  it('resolves registered behavior by state semantic key', () => {
    const registry = new StateBehaviorRegistry();
    const context = {
      gameKey: 'game-street-fighter',
      activeCharacterKey: 'character-ryu',
      runtimeState: createRuntimeStateModel(),
      frame: 12,
      roundNumber: 1,
    };

    registry.register('state-gravity', {
      onFrameAdvance: (currentContext) => ({
        ...currentContext,
        frame: currentContext.frame + 1,
      }),
    });

    const result = registry
      .resolve('state-gravity')
      ?.onFrameAdvance?.(context);

    expect(result?.frame).toBe(13);
  });
});