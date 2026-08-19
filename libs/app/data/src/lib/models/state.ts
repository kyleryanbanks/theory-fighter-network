/**
 * State model and runtime context management
 * Defines all game configuration states and current runtime values
 */

import type { DataValue } from './shared';

/**
 * Serializable state definition stored in a guide.
 * Behavior code is compiled and registered separately at runtime.
 */
export interface StateBehaviorCode {
  onUpdate?: string;
  onFrameAdvance?: string;
}

export interface StateDocument {
  semanticKey: string;
  name: string;
  description?: string;
  duration?: number;
  min?: number;
  max?: number;
  unit?: string;
  behavior?: StateBehaviorCode;
}

export const createState = (
  overrides: Partial<StateDocument> = {}
): StateDocument => ({
  semanticKey: '',
  name: '',
  ...overrides,
});

/**
 * Collection of states by semanticKey
 */
export type StateCollection = Record<string, StateDocument>;

/**
 * Infer value type from StateDocument structure:
 * - If min/max defined → numeric value
 * - Otherwise → boolean flag
 */
type InferStateValueType<T extends StateDocument> =
  T extends { min: number } | { max: number }
    ? number
    : boolean;

/**
 * Map a StateCollection to runtime values with inferred types
 * Each state key gets a value of the appropriate type (number or boolean)
 */
export type RuntimeStateValues<
  T extends Record<string, StateDocument>
> = Partial<{
  [K in keyof T]: InferStateValueType<T[K]>;
}>;

/**
 * Completely agnostic state model — any number of user-defined categories.
 * Categories are arbitrary strings; their names guide game designers but don't constrain schema.
 */
export type StateModel = Record<string, StateCollection>;

/**
 * Suggested category names for onboarding new guides.
 * These are UI/UX scaffolding, not schema constraints.
 * Users can remove unused categories, add custom ones, or ignore these entirely.
 */
export const SUGGESTED_STATE_CATEGORIES = [
  'Character',      // Character-specific modes, forms, mechanics
  'Attack',         // Offensive properties (strike type, height, properties)
  'Defense',        // Blocking/guard/stun/invuln (receiving-side states)
  'Movement',       // Movement caps (double-jump count, dash count, wall-cling)
  'Resource',       // Meter, health, assist cooldown, gauges
  'Environment',    // Stage hazards, environmental mechanics
  'Sequence',       // Combo tracking: damage scaling, hitstun scaling, style reset, lockdown prevention
  'Projectile',     // Projectile properties (durability, priority, piercing)
  'Custom',         // User-defined categories
] as const;

/**
 * Map a StateModel to runtime values organized by category
 * Represents the full runtime state snapshot of a game moment
 */
export type RuntimeStateModel<TStateModel extends StateModel = StateModel> = {
  [K in keyof TStateModel]: RuntimeStateValues<TStateModel[K]>;
};

export const createRuntimeStateModel = (
  stateModel?: StateModel
): RuntimeStateModel => {
  // If no stateModel provided, use suggested categories as default
  const modelToUse = stateModel ?? createDefaultStateModel();
  const result: RuntimeStateModel = {};
  for (const categoryKey in modelToUse) {
    result[categoryKey] = {};
  }
  return result;
};

/**
 * Create a StateModel with suggested default categories
 */
const createDefaultStateModel = (): StateModel => ({});

/**
 * Partial runtime state update payload organized by category.
 * Used when effects or simulation steps apply targeted state changes.
 */
export type RuntimeStatePatch<TStateModel extends StateModel = StateModel> = Partial<{
  [K in keyof TStateModel]: Partial<RuntimeStateModel<TStateModel>[K]>;
}>;

/**
 * Author-authored partial state update payload.
 * Numeric states use DataValue so users can record exact or relative intent.
 */
export type StatePatch<TStateModel extends StateModel = StateModel> = Partial<{
  [K in keyof TStateModel]: Record<string, boolean | DataValue>;
}>;

/**
 * Create a StateModel initialized with suggested categories.
 * Users can customize: add/remove categories or provide custom structure entirely.
 */
export const createStateModel = (
  overrides: Partial<StateModel> = {}
): StateModel => {
  const stateModel = createDefaultStateModel();

  for (const [category, states] of Object.entries(overrides)) {
    if (states !== undefined) {
      stateModel[category] = states;
    }
  }

  return stateModel;
};

/**
 * Comparison operators for state preconditions.
 * Numeric states support all six; boolean states use only "=" and "!=".
 */
export type ComparisonOperator = '>' | '<' | '=' | '!=' | '<=' | '>=';

/**
 * A single state precondition: the move is only available when
 * the named state satisfies the operator/value check at runtime.
 * - Boolean states: value is true/false, operator is "=" or "!="
 * - Numeric states: value is a number, any operator applies
 */
export interface StatePrecondition {
  category: string;
  stateKey: string;
  operator: ComparisonOperator;
  value: number | boolean;
}

/**
 * Preconditions grouped by whose state is being checked.
 */
export interface MovePreconditions {
  /** Conditions on the player executing the move */
  player?: StatePrecondition[];
  /** Conditions on the opponent */
  opponent?: StatePrecondition[];
  /** Move only available as a follow-up directly after one of these moves */
  followUpFromMoveKeys?: string[];
  /** Move only available as a cancel out of one of these moves */
  cancelFromMoveKeys?: string[];
}

/**
 * Current game state context with type-safe runtime values
 * Runtime values are keyed by state semanticKey within each category
 * Type parameters ensure every runtime value key exists in the corresponding StateCollection
 */
export interface GameStateContext<
  TStateModel extends StateModel = StateModel
> {
  gameKey: string;
  stageKey?: string;
  activeCharacterKey: string;
  
  // Runtime values organized by state category - types ensure keys are valid
  runtimeState: RuntimeStateModel<TStateModel>;
  
  frame: number;
  roundNumber: number;
}
