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
}

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
  CM extends StateCollection = StateCollection
> {
  attacks: A;
  blocks: B;
  knockdowns: K;
  juggles: J;
  positions: P;
  stageMechanics: S;
  characters: C;
  resources: R;
  comboMechanics: CM;
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
