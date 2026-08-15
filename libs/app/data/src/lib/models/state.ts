/**
 * State model and runtime context management
 * Defines all game configuration states and current runtime values
 */

/**
 * Individual state definition (reusable lookup entry)
 */
export interface State {
  semanticKey: string;  // hash(gameSemanticKey + [characterSemanticKey] + category + name + duration + min + max + unit)
  name: string;
  description?: string;
  duration?: number;    // How long the state applies (frames); works for both numeric and boolean states
  min?: number;
  max?: number;
  unit?: string;

  /**
   * Optional custom update function called when a value is applied to this state (from effects).
   * Users read the incoming value, check context state, and return updated context.
   * 
   * Example (hitstun scaling by combo count):
   * onUpdate: (incomingValue, context) => {
   *   const comboCount = context.runtimeState.comboMechanics.comboCount;
   *   const scaleFactor = 0.95 ** comboCount;
   *   context.runtimeState.comboMechanics.hitstun = incomingValue * scaleFactor;
   *   return context;
   * }
   */
  onUpdate?: (incomingValue: any, context: GameStateContext) => GameStateContext;

  /**
   * Optional custom frame advance function called once per frame during simulation.
   * Useful for system-level updates that don't depend on incoming effect values.
   * 
   * Example (gravity-affected motion, health regeneration):
   * onFrameAdvance: (context) => {
   *   const gravity = context.runtimeState.stageMechanics.gravity;
   *   // Apply gravity to positions, velocities
   *   return context;
   * }
   */
  onFrameAdvance?: (context: GameStateContext) => GameStateContext;
}

export const createState = (overrides: Partial<State> = {}): State => ({
  semanticKey: '',
  name: '',
  ...overrides,
});

/**
 * Collection of states by semanticKey
 */
export type StateCollection = Record<string, State>;

/**
 * Infer value type from State structure:
 * - If min/max defined → numeric value
 * - Otherwise → boolean flag
 */
type InferStateValueType<T extends State> = 
  T extends { min: number } | { max: number }
    ? number
    : boolean;

/**
 * Map a StateCollection to runtime values with inferred types
 * Each state key gets a value of the appropriate type (number or boolean)
 */
export type RuntimeStateValues<T extends Record<string, State>> = Partial<{
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
