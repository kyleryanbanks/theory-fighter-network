/**
 * State model and runtime context management
 * Defines all game configuration states and current runtime values
 */

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
 * Map a StateModel to runtime values organized by category
 * Represents the full runtime state snapshot of a game moment
 */
export type RuntimeStateModel<TStateModel extends StateModel = StateModel> = {
  [K in keyof TStateModel]: RuntimeStateValues<TStateModel[K]>;
};

export const createRuntimeStateModel = (): RuntimeStateModel => ({
  attacks: {},
  blocks: {},
  knockdowns: {},
  juggles: {},
  positions: {},
  stageMechanics: {},
  characters: {},
  resources: {},
  comboMechanics: {},
  projectiles: {},
});

/**
 * Partial runtime state update payload organized by category.
 * Used when effects or simulation steps apply targeted state changes.
 */
export type RuntimeStatePatch<TStateModel extends StateModel = StateModel> = Partial<{
  [K in keyof TStateModel]: Partial<RuntimeStateModel<TStateModel>[K]>;
}>;

/**
 * Universal state model used identically at game and character level
 * Generic parametrization ensures type safety for runtime state matching
 */
export interface StateModel<
  A extends StateCollection = StateCollection,
  B extends StateCollection = StateCollection,
  K extends StateCollection = StateCollection,
  J extends StateCollection = StateCollection,
  P extends StateCollection = StateCollection,
  S extends StateCollection = StateCollection,
  C extends StateCollection = StateCollection,
  R extends StateCollection = StateCollection,
  CM extends StateCollection = StateCollection,
  PR extends StateCollection = StateCollection
> extends Record<string, StateCollection> {
  attacks: A;
  blocks: B;
  knockdowns: K;
  juggles: J;
  positions: P;
  stageMechanics: S;
  characters: C;
  resources: R;
  comboMechanics: CM;
  projectiles: PR;  // User-defined projectile properties (durability, priority, etc.)
}

export const createStateModel = (
  overrides: Partial<StateModel> = {}
): StateModel => ({
  attacks: {},
  blocks: {},
  knockdowns: {},
  juggles: {},
  positions: {},
  stageMechanics: {},
  characters: {},
  resources: {},
  comboMechanics: {},
  projectiles: {},
  ...overrides,
});

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
