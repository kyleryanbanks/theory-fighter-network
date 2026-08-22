import type {
  GameStateContext,
  StateBehaviorCode,
  StateDocument,
} from '../models/state';

export type StateUpdateHandler = (
  incomingValue: unknown,
  context: GameStateContext
) => GameStateContext;

export type StateFrameAdvanceHandler = (
  context: GameStateContext
) => GameStateContext;

export interface StateBehavior {
  onUpdate?: StateUpdateHandler;
  onFrameAdvance?: StateFrameAdvanceHandler;
}

export class StateBehaviorRegistry {
  private readonly behaviors = new Map<string, StateBehavior>();
  private readonly stateSemanticKeys: string[];

  constructor(preferredStateSemanticKeys: readonly string[] = []) {
    this.stateSemanticKeys = [...new Set(preferredStateSemanticKeys)];
  }

  register(stateSemanticKey: string, behavior: StateBehavior): void {
    if (!this.stateSemanticKeys.includes(stateSemanticKey)) {
      this.stateSemanticKeys.push(stateSemanticKey);
    }

    this.behaviors.set(stateSemanticKey, behavior);
  }

  registerState(state: StateDocument): void {
    if (state.behavior) {
      this.registerCode(state.semanticKey, state.behavior);
      return;
    }

    this.register(state.semanticKey, {});
  }

  /** Compiles arbitrary trusted code. Never call this with untrusted input. */
  registerCode(
    stateSemanticKey: string,
    behaviorCode: StateBehaviorCode
  ): void {
    this.register(stateSemanticKey, compileStateBehavior(behaviorCode));
  }

  resolve(stateSemanticKey: string): StateBehavior | undefined {
    return this.behaviors.get(stateSemanticKey);
  }

  advanceFrame(context: GameStateContext): GameStateContext {
    return this.stateSemanticKeys.reduce((currentContext, stateSemanticKey) => {
      const onFrameAdvance = this.resolve(stateSemanticKey)?.onFrameAdvance;

      return onFrameAdvance?.(currentContext) ?? currentContext;
    }, context);
  }
}

function compileStateBehavior(behaviorCode: StateBehaviorCode): StateBehavior {
  return {
    onUpdate: behaviorCode.onUpdate
      ? compileUpdateHandler(behaviorCode.onUpdate)
      : undefined,
    onFrameAdvance: behaviorCode.onFrameAdvance
      ? compileFrameAdvanceHandler(behaviorCode.onFrameAdvance)
      : undefined,
  };
}

function compileUpdateHandler(code: string): StateUpdateHandler {
  const handler = new Function(
    'incomingValue',
    'context',
    `"use strict";\n${code}`
  ) as (incomingValue: unknown, context: GameStateContext) => unknown;

  return (incomingValue, context) =>
    requireContext(handler(incomingValue, context), 'onUpdate');
}

function compileFrameAdvanceHandler(code: string): StateFrameAdvanceHandler {
  const handler = new Function(
    'context',
    `"use strict";\n${code}`
  ) as (context: GameStateContext) => unknown;

  return (context) =>
    requireContext(handler(context), 'onFrameAdvance');
}

function requireContext(value: unknown, handlerName: string): GameStateContext {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`${handlerName} code must return a context object.`);
  }

  return value as GameStateContext;
}