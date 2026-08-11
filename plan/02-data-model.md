# Data Model Reference

Complete Firestore and local file schema for Theory Fighter Network.

## Data model (Firestore + local file schema parity)

### Top-level + scoped collections

```text
/games/{gameId}
/characters/{characterId}
/users/{uid}

/users/{uid}/guides/{guideId}
/games/{gameId}/universal-moves/{moveId}
/games/{gameId}/universal-stage-zones/{zoneId}
/games/{gameId}/stages/{stageId}
/games/{gameId}/stages/{stageId}/zones/{zoneId}
/characters/{characterId}/moves/{moveId}

/games/{gameId}/universal-combos/{comboId}
/characters/{characterId}/combos/{comboId}
/games/{gameId}/teams/{teamId}
/games/{gameId}/teams/{teamId}/combos/{comboId}
```

### Game

```ts
interface GuideVersionReference {
  targetVersion: 'latest' | string; // e.g. "latest", "1.2.0"
  isVersionLocked: boolean;
  resolvedGameVersion: string; // concrete version currently backing this guide
  convergenceKey: string; // `${gameCanonicalKey}@${resolvedGameVersion}`
  lastVerifiedAt?: Timestamp;
  lastKnownLatestVersion?: string; // newest version known by the app when this guide was last opened/refreshed
  isOutOfDate?: boolean;
}

interface GameDocument {
  id: string;
  canonicalKey: string;
  name: string;
  releaseYear: number;
  publisher: string;

  matchRules: {
    roundsToWinMatch: number;
    stocksPerRound?: number;
    timerSeconds?: number;
    teamSize: number;
  };

  // Framing: exact values exist, but may be unknown/unmeasured in app data.
  frameDataPolicy: {
    exactFrameBehaviorExists: true;
    publishedByGame: boolean;
  };

  // Universal mechanics are modeled as game-level moves with inheritance, not a separate array.
  customSliderAxes: SliderAxisDefinition[];
  inputSystem: InputSystemProfile;
  playerStateModel: PlayerStateModel;
  opponentStateModel: OpponentStateModel;
  resourceModel: ResourceModel;
  comboScalingSystem: ComboScalingSystem;
  guideVersion: GuideVersionReference;

  // Character states that allow blocking. Subset of playerStateModel.stateTags keys.
  // Example: ['standing', 'crouching'] for SF6, ['standing', 'crouching', 'airborne'] for MvC2.
  blockStates: string[];

  stagesAffectGameplay: boolean;
  
  ownerId: string;
  communityId?: string;
  lastPublishedAt?: Timestamp; // if absent, entity has not been published to community yet
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface StageDocument {
  id: string;
  gameId: string;
  canonicalKey: string;
  name: string;
  notes?: string;
  // Stage-level properties (size, elevation, movement constraints, etc.).
  comparativeAttributes: ComparativeAttribute[];
  guideVersion: GuideVersionReference;

  ownerId: string;
  communityId?: string;
  lastPublishedAt?: Timestamp; // if absent, entity has not been published to community yet
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface StageZoneDocument {
  id: string;
  gameId: string;
  stageId?: string; // absent for universal game-level zone defaults
  parentScope: 'game' | 'stage';
  canonicalKey: string;
  inheritedFromZoneId?: string; // stage-scoped zones can inherit game-level defaults
  fieldOverrides?: (keyof StageZoneDocument)[];

  zoneType: 'wall' | 'floor' | 'ceiling';
  side?: 'left' | 'right' | 'center';
  notes?: string;

  splatBehavior?: {
    causesSplatStateTag?: string;
    notes?: string;
  };

  breakBehavior?: {
    isBreakable: boolean;
    breakStateTag?: string;
    breakOnZeroDurability?: boolean;
  };

  durability?: {
    maxPoints: number;
    currentPoints?: number; // runtime state; schema tracks max only
    resetConditions?: {
      resetEvery?: 'round' | 'match';
      resetOnScreenTransition?: boolean;
    };
  };

  guideVersion: GuideVersionReference;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface InputSystemProfile {
  // Higher value = more lenient game-level timing/input system.
  inputBufferLeniencyScore: number; // 0..100
  motionComplexityWeights: {
    singleNormal: number;     // e.g. 1
    charge: number;           // e.g. 2
    quarterCircle: number;    // e.g. 3
    dragonPunch: number;      // e.g. 4
    halfCircle: number;       // e.g. 5
    doubleQuarterCircle: number;
    custom?: Record<string, number>;
  };
}

interface PlayerStateModel {
  // Base game-defined tags available for move gating and trigger resolution.
  stateTags: StateTagDefinition[];
}

interface OpponentStateModel {
  // Base game-defined tags applied to the opponent and used by move gating/outcomes.
  stateTags: StateTagDefinition[];
}

interface StateTagDefinition {
  key: string; // e.g. "neutral", "active", "airborne", "blockstun", "hitstun"
  description?: string;
  category: 'control' | 'posture' | 'stun' | 'phase' | 'custom';
}

interface ResourceModel {
  resources: ResourceDefinition[];
}

interface ResourceDefinition {
  key: string;
  label: string;
  max?: number;
  unit?: 'stock' | 'points' | 'percent' | 'timer' | 'custom';
  customUnitLabel?: string;
}

interface SliderAxisDefinition {
  key: string;    // e.g. "startup", "damage", "rangeX" — matches ComparativeAttribute.property
  label: string;
  min: number;    // default 0 for normalized comparative sliders
  max: number;    // default 100 for normalized comparative sliders
  communityAlignmentTolerancePct?: number; // default 5 (%); values within +/-5% are considered aligned
  unit?: string;  // e.g. "frames", "damage units"
  notes?: string;
}

interface ComboScalingSystem {
  // Hitstun and damage scaling are independent systems; both optional per game.
  hitstunScaling?: HitstunScalingSystem;
  damageScaling?: DamageScalingSystem;
  antiInfiniteRules?: AntiInfiniteSystem;
  projectileDurabilitySystem?: ProjectileDurabilitySystem;
}

interface HitstunScalingSystem {
  enabled: boolean;
  // How hitstun reduction progresses as combo hit count rises.
  model: 'linear' | 'step' | 'proration-table' | 'custom';
  minimumHitstunFrames?: number;
  // Whether scaling resets mid-combo (e.g. on launcher, tag-in, etc.)
  resetConditions?: string[];
  knowledgeStatus: 'observed' | 'measured' | 'verified';
  notes?: string;
}

interface DamageScalingSystem {
  enabled: boolean;
  // How damage scaling progresses independently of hitstun as combo hit count rises.
  model: 'linear' | 'step' | 'proration-table' | 'custom';
  minimumDamagePercent?: number; // floor after heavy scaling
  // Whether damage scaling resets mid-combo independently of hitstun scaling.
  resetConditions?: string[];
  knowledgeStatus: 'observed' | 'measured' | 'verified';
  notes?: string;
}

interface AntiInfiniteSystem {
  enabled: boolean;
  // Examples: same-move repetition limits, juggle points, undizzy, burst.
  mechanics: string[];
  knowledgeStatus: 'observed' | 'measured' | 'verified';
  notes?: string;
}

interface ProjectileDurabilitySystem {
  systemType: 'priority' | 'points' | 'priority-and-points' | 'none' | 'custom';
  description?: string;
  knowledgeStatus: 'observed' | 'measured' | 'verified';
}
```

### Character

```ts
interface CharacterDocument {
  id: string;
  gameId: string;
  canonicalKey: string;
  name: string;
  archetypes: string[];
  // Character-specific mechanics are modeled as character-level moves, not a separate array.
  customSliderAxes: SliderAxisDefinition[];
  selectableLoadouts?: CharacterLoadoutOption[];
  selectableAssists?: CharacterAssistOption[];
  customPlayerStates?: StateTagDefinition[];
  customOpponentStates?: StateTagDefinition[];
  customResources?: ResourceDefinition[];
  guideVersion: GuideVersionReference;
  verification?: VerificationSectionMap;

  ownerId: string;
  communityId?: string;
  lastPublishedAt?: Timestamp; // if absent, entity has not been published to community yet
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Move

```ts
interface MoveDocument {
  id: string;
  gameId: string;
  characterId?: string; // absent for game-universal moves; presence/absence implies scope

  // Inheritance: only present on character-scoped moves seeded from a game-level move.
  // The game acts as a character template; character moves inherit all game-level field
  // values by default. Fields listed in fieldOverrides are character-specific exceptions.
  inheritedFromMoveId?: string;         // id of the game-level move this was copied from
  fieldOverrides?: (keyof MoveDocument)[]; // fields the character explicitly overrides

  name: string;
  categoryKey?: string; // references GameDocument move category definitions

  // Input sequence for this move, using buttons defined in GameDocument.inputSystem
  inputFrames?: TriggerInputFrame[]; // structured frame-by-frame input representation

  // States required before this move can be triggered.
  preconditions: {
    requiredAllPlayerStateTags?: string[];  // e.g. ["airborne"], ["blockstun"], ["neutral"]
    forbiddenPlayerStateTags?: string[];    // e.g. ["hitstun"]
    requiredAllOpponentStateTags?: string[]; // e.g. ["shocked"]
    followUpOnlyFromMoveIds?: string[]; // move is only available as follow-up
    cancelFromMoveIds?: string[];       // move can be canceled into from these moves
  };

  // Ordered phases within a single move — use when a move has distinct internal events
  // (e.g. multiple projectiles at different timings, strike then reposition, counter follow-up).
  // Each phase defines its own effects, range, and scaling behavior.
  phases?: MovePhase[];

  verification?: VerificationSectionMap;

  // Relative values remain useful before exact measurements are known.
  comparativeAttributes: ComparativeAttribute[];
  comparativeConstraints?: ComparativeConstraint[];
  comparativeOrderings?: ComparativeOrderingRef[];

  ownerId: string;
  communityId?: string;
  lastPublishedAt?: Timestamp; // if absent, entity has not been published to community yet
  guideVersion: GuideVersionReference;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface FrameOutcomeWindow {
  base?: number;
  min?: number;
  max?: number;
  meatyAdvantageGain?: number;
  notes?: string;
}

interface MoveRangeProfile {
  // Comparative range control is entered relative to known moves, not arbitrary sliders.
  comparativeAxes?: RangeAxisProfile[];
  // Optional precise range bands tied to stage coordinate system.
  bands: RangeBand[];
}

interface RangeBand {
  key: string;
  label: string;
  axis: 'x' | 'y' | 'z';
  minDistance?: number;
  maxDistance?: number;
  relativeSide?: 'front' | 'behind' | 'both';
}

interface RangeAxisProfile {
  axis: 'x' | 'y' | 'z';
  comparisons?: Array<{
    otherMoveId: string;
    relation: 'shorter' | 'same' | 'longer';
  }>;
}

interface ComparativeAttribute {
  property:
    | 'startup'
    | 'active'
    | 'recovery'
    | 'total'
    | 'damage'
    | 'rangeX'
    | 'rangeY'
    | 'rangeZ';
  kind: 'exact' | 'observed' | 'inferred';
  // For observed/inferred slider data, value is normalized to the axis scale (default 0..100).
  // For exact data, value uses the axis unit.
  value?: number;
  lowerBound?: number;
  upperBound?: number;
}

interface ComparativeConstraint {
  property:
    | 'startup'
    | 'active'
    | 'recovery'
    | 'total'
    | 'damage'
    | 'rangeX'
    | 'rangeY'
    | 'rangeZ';
  relation: 'lessThan' | 'greaterThan' | 'equalTo';
  otherMoveId: string;
  knowledgeClass: 'private-exploratory' | 'shared-exploratory';
}

interface ComparativeOrdering {
  id: string;
  property:
    | 'startup'
    | 'active'
    | 'recovery'
    | 'total'
    | 'damage'
    | 'rangeX'
    | 'rangeY'
    | 'rangeZ';
  knowledgeClass: 'private-exploratory' | 'shared-exploratory';
  groups: ComparativeOrderingGroup[]; // ordered fastest->slowest, shortest->longest, etc.
}

interface ComparativeOrderingGroup {
  moveIds: string[]; // equal-ranked items inside the same group
}

interface ComparativeOrderingRef {
  orderingId: string;
}

interface VerificationRecord {
  status: 'unknown' | 'observed' | 'verified-current' | 'verified-old-version' | 'needs-review';
  verifiedAgainstVersion?: string;
  verifiedAt?: Timestamp;
  notes?: string;
}

interface VerificationSectionMap {
  sections: Record<string, VerificationRecord>;
}

interface MoveComboScalingEffects {
  // Hitstun and damage scaling effects are tracked separately since games can apply them independently.
  hitstun?: {
    modifierFrames?: number;             // positive/negative frame adjustment per hit
    causesForcedProration?: boolean;     // move resets hitstun scaling on contact
    ignoresScaling?: boolean;            // move bypasses hitstun scaling rules
    resetsTrigger?: boolean;             // this move resets the hitstun scaling counter
  };
  damage?: {
    scalingPercentDelta?: number;        // additional scaling penalty/bonus
    causesForcedProration?: boolean;     // move forces immediate damage proration
    ignoresScaling?: boolean;            // move bypasses damage scaling rules
    resetsTrigger?: boolean;             // this move resets the damage scaling counter
  };
  juggleCost?: number;                   // consumes juggle budget where applicable
  juggleGain?: number;                   // grants/refreshes juggle potential where applicable
  repeatPenaltyClass?: string;           // game-defined repetition bucket for anti-infinite
  notes?: string;
}

interface ProjectileProfile {
  isProjectile: true;

  behavior: {
    motion: 'fixed-forward' | 'fixed-diagonal' | 'arc' | 'homing' | 'stationary' | 'custom';
    customMotionNotes?: string;
    destroyedOnHit: boolean;            // observable: disappears after first hit
    canBeDestroyedByPhysical: boolean;  // observable: normals/physical moves remove it
    hitsBeforeDestroyed?: number;       // measurable: multi-hit projectiles
    activeFrames?: number;              // measurable: how long it persists
    travelSpeed?: number;               // measurable: frames to cross stage
  };

  durability: {
    // System populated when game-level ProjectileDurabilitySystem is known.
    priorityLevel?: number;             // exact only
    durabilityPoints?: number;          // exact only
    knowledgeStatus: 'observed' | 'measured' | 'verified';
    customNotes?: string;
  };

  interaction: {
    interactsWithProjectiles: boolean;    // observable
    interactsWithPhysical: boolean;       // observable
    interactionConditions?: string[];     // e.g. ["requires opponent shocked"]
  };

  // Pairwise clash table — fully usable before engine priority values are known.
  clashResults?: ProjectileClashResult[];
}

interface ProjectileClashResult {
  againstMoveId: string;   // the opposing projectile's move id
  result: 'wins' | 'ties' | 'loses' | 'passes-through' | 'unknown';
  conditionsNotes?: string;
  knowledgeClass: 'observed' | 'measured' | 'verified';
}

interface PositionalEffect {
  displacesCharacter: boolean;
  displacement?: {
    x?: ComparativeAttribute;  // negative = backward, positive = forward
    y?: ComparativeAttribute;  // negative = down, positive = up
  };
  displacementStartFrame?: number;  // frame relative to move start when movement begins
  displacementDuration?: number;    // frames the movement lasts
  crossupCapable?: boolean;         // can pass through the opponent
  notes?: string;
}

interface OpponentPositionalEffect {
  // Describes where the opponent ends up after being hit/blocked by this move.
  // Uses same x/y coordinate model as attacker positionalEffect.
  // Suggestion engine calculates reachability by combining opponent position with rangeProfile.
  
  displacement?: {
    x?: ComparativeAttribute;  // negative = pushed backward, positive = pushed forward
    y?: ComparativeAttribute;  // negative = pushed down, positive = pushed up
  };
  displacementStartFrame?: number;  // frame relative to move start when opponent displacement begins
  displacementDuration?: number;    // frames over which opponent displacement occurs
  notes?: string;
}

interface MovePhase {
  label?: string;              // e.g. "first fireball", "reposition", "counter follow-up"
  startFrame?: number;         // relative to move start
  frameData?: {
    startup?: number;
    active?: number;
    recovery?: number;
  };
  
  // Reach and route viability at different hit distances.
  rangeProfile?: MoveRangeProfile;
  
  // How this phase interacts with the game's combo scaling / anti-infinite rules.
  comboScalingEffects?: MoveComboScalingEffects;
  
  // Effects describe what happens when this phase connects/is blocked/whiffs.
  // Each outcome type has playerEffects and opponentEffects as siblings.
  effects?: {
    onHit?: MoveOutcomeEffect;
    onBlock?: MoveOutcomeEffect;
    onCounterHit?: MoveOutcomeEffect;
    onWhiff?: MoveOutcomeEffect;
    // Secondary trigger for counter/parry moves: what happens when the counter is successfully triggered
    onSecondaryTrigger?: MoveOutcomeEffect;
  };

  cancelOptions?: {
    onHit?: PhaseCancelRule[];
    onBlock?: PhaseCancelRule[];
    onCounterHit?: PhaseCancelRule[];
    onWhiff?: PhaseCancelRule[];
    onSecondaryTrigger?: PhaseCancelRule[];
  };
  
  // Subset of GameDocument.blockStates that can block this phase.
  // Empty array means unblockable. Absent or undefined means any game blockState can block it.
  canBeBlocked?: string[];
  
  knowledgeStatus: 'observed' | 'measured' | 'verified';
  notes?: string;
}

interface MoveOutcomeEffect {
  // Effects on the attacking player (position changes, resource costs/gains, state tags applied)
  playerEffects?: {
    positionalEffect?: PositionalEffect;
    resourceEffects?: ResourceEffect[];
    appliesStateTags?: string[];
  };
  
  // Effects on the defending opponent (position changes, damage/meter, state tags applied)
  opponentEffects?: {
    positionalEffect?: PositionalEffect;
    resourceEffects?: ResourceEffect[];
    appliesStateTags?: string[];
  };
  
  // How this phase interacts with stage zones (splat/break/durability effects).
  stageInteraction?: {
    targetZoneIds?: string[];
    targetZoneTypes?: Array<'wall' | 'floor' | 'ceiling'>;
    causesSplat?: {
      enabled: boolean;
      appliesOpponentStateTag?: string;
    };
    causesBreak?: {
      enabled: boolean;
      appliesOpponentStateTag?: string;
    };
    causesScreenTransition?: {
      transitions: boolean;
      repositionCharacters?: {
        playerX?: number;
        playerY?: number;
        opponentX?: number;
        opponentY?: number;
      };
      stillComboable?: boolean;
    };
    durabilityEffect?: {
      applies: boolean;
      points?: number;
    };
  };
  
  frameAdvantage?: FrameOutcomeWindow;
  knowledgeStatus?: 'observed' | 'measured' | 'verified';
}

interface PhaseCancelRule {
  windowStartFrame?: number;
  windowEndFrame?: number;
  allowedMoveIds?: string[];
  requiredPlayerStateTags?: string[];
  requiredOpponentStateTags?: string[];
  notes?: string;
}

interface TriggerInputFrame {
  // Cardinal directions (numpad notation: 1-9, or empty array for neutral).
  directions: number[];
  
  // Button keys defined in GameDocument.inputSystem.
  buttons: string[];
  
  // How many frames this input state is held. Defaults to 1 if undefined.
  durationFrames?: number;
}

interface ResourceEffect {
  resourceKey: string;  // references key in GameDocument.resourceModel
  amount: number;       // positive = gain, negative = cost
}

interface CharacterLoadoutOption {
  key: string;
  label: string;
  description?: string;
}

interface CharacterAssistOption {
  key: string;
  label: string;
  description?: string;
}
```

### Team composition (for team games)

```ts
interface TeamDocument {
  id: string;
  gameId: string;
  // Ordered team matters for assists/order-dependent routes.
  // Team can be partial (e.g. 2 configured characters in a 4-character team game).
  orderedCharacterIds: string[];
  slotSelections?: TeamSlotSelection[];
  label?: string;
  guideVersion: GuideVersionReference;
  verification?: VerificationSectionMap;

  ownerId: string;
  communityId?: string;
  lastPublishedAt?: Timestamp; // if absent, entity has not been published to community yet
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface TeamSlotSelection {
  characterId: string;
  slotIndex: number;
  selectedLoadoutKey?: string;
  selectedAssistKey?: string;
}
```

### Combo (all scopes share the same schema)

```ts
interface ComboDocument {
  id: string;
  gameId: string;

  // Context determines applicability.
  comboScope: 'universal' | 'character' | 'team';
  characterId?: string;
  teamId?: string;
  teamApplicability?: {
    // Ordered subset required for this route/setup (not necessarily full team).
    requiredOrderedCharacterIds: string[];
  };

  name?: string;
  notation?: string;

  // Basic form required by product direction.
  moveRefs: ComboMoveRef[]; // ordered list

  // Optional exact delay between steps in frames.
  // delayAfterStepFrames[i] is delay after moveRefs[i].
  delayAfterStepFrames?: number[];

  // Computed, not user-entered. Recomputed only on combo create/update.
  computedDifficulty: ComboDifficulty;
  guideVersion: GuideVersionReference;
  verification?: VerificationSectionMap;

  ownerId: string;
  communityId?: string;
  lastPublishedAt?: Timestamp; // if absent, entity has not been published to community yet
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ComboMoveRef {
  moveId: string;
  scope: 'game' | 'character';
  characterId?: string;
  // Chosen contact range band at this step; needed for route viability at max/tip range.
  selectedRangeBandKeys?: Partial<Record<'x' | 'y' | 'z', string>>;
}

interface ComboDifficulty {
  score: number; // 0..100
  factors: {
    comboLength: number;
    timingStrictness: number;     // tighter delays => higher value
    totalInputComplexity: number; // from referenced move inputComplexity
    bufferLeniencyModifier: number; // from game input buffer profile
  };
  computedAt: Timestamp;
  modelVersion: string;
}

interface MoveTransitionEdge {
  id: string;
  gameId: string;
  fromMoveId: string;
  toMoveId: string;
  scope: 'universal' | 'character' | 'team';
  characterId?: string;
  teamId?: string;

  // Why/when this transition works.
  triggerOutcome: 'onHit' | 'onBlock' | 'onCounterHit';
  requiredPlayerStateTags?: string[];
  requiredOpponentStateTags?: string[];
  requiredRangeBandKeys?: string[]; // e.g. tip-range links are often restricted
  requiredScalingState?: string;    // game-defined combo-scaling state/stage if needed
  requiredResources?: ResourceRequirement[];
  requiredDelayFrames?: number; // exact link timing when known

  viability: 'consistent' | 'situational' | 'unconfirmed';
  evidenceLevel: 'observed' | 'measured' | 'verified';
  notes?: string;
}

interface ResourceRequirement {
  resourceKey: string;  // game-defined (meter, drive, assist, install, etc.)
  amount?: number;
}

interface SequencePattern {
  id: string;
  gameId: string;
  scope: 'universal' | 'character' | 'team';
  characterId?: string;
  teamId?: string;
  moveRefs: ComboMoveRef[];

  intentTags: Array<
    'neutralControl' |
    'screenControl' |
    'blockstring' |
    'frametrap' |
    'mixup' |
    'comboRoute' |
    'oki'
  >;

  outcomes?: {
    safeOnBlock?: boolean;
    convertsOnHit?: boolean;
    cornerCarryScore?: number;
    leavesAdvantageousState?: boolean;
  };
}

interface MatchupDocument {
  id: string;
  gameId: string;
  guideVersion: GuideVersionReference;
  playerSide: MatchupSide;
  opponentSide: MatchupSide;
  scenarioGraph: MatchupScenarioGraph;
  notes?: string;
  verification?: VerificationSectionMap;

  ownerId: string;
  communityId?: string;
  lastPublishedAt?: Timestamp; // if absent, entity has not been published to community yet
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface MatchupSide {
  characterId?: string;
  teamId?: string;
}

interface MatchupScenarioGraph {
  nodes: MatchupScenarioNode[];
  edges: MatchupScenarioEdge[];
}

interface MatchupScenarioNode {
  id: string;
  phase: 'neutral' | 'pressure' | 'confirm' | 'combo' | 'oki' | 'reset' | 'defense';
  label: string;
  sequencePatternId?: string;
}

interface MatchupScenarioEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  actingSide: 'player' | 'opponent';
  optionLabel: string;
  counteredByEdgeIds?: string[];
  projectedSuccessRate?: number; // 0..100, refined as research matures
  rewardScore?: number;
  riskScore?: number;
  notes?: string;
}

interface ExplorationCoverage {
  gameId: string;
  characterId?: string;
  teamId?: string;
  completionPhase:
    | 'foundation'
    | 'universalSystems'
    | 'roster'
    | 'moveConnectivity'
    | 'moveBalance'
    | 'moveDetails'
    | 'sequences'
    | 'matchups';
  moveCoveragePct: number;      // captured moves / expected moves
  testedEdgeCoveragePct: number; // tested transitions / candidate transitions
  unresolvedHighValueGaps: string[]; // ids of missing or untested routes
}

interface SuggestionItem {
  id: string;
  type: 'missingMove' | 'untestedTransition' | 'untestedBlockstring' | 'untestedRangeBand' | 'communityDivergence';
  gameId: string;
  characterId?: string;
  teamId?: string;
  priority: 'low' | 'medium' | 'high';
  reason: string;
  candidateMoveIds?: string[];
  candidateTransitionIds?: string[];
  suggestedForPhase?:
    | 'foundation'
    | 'universalSystems'
    | 'roster'
    | 'moveConnectivity'
    | 'moveBalance'
    | 'moveDetails'
    | 'sequences'
    | 'matchups';
}
```

### Community guide aggregation

```ts
interface GuideDocument {
  id: string;  // Firebase ID (the communityId that entities point to)
  gameId: string;  // scoped to single game only
  
  // Published entities for this game only
  publishedEntities: {
    characterIds: string[];
    moveIds: string[];
    comboIds: string[];
    teamIds: string[];
    stageIds: string[];
    matchupIds: string[];
  };
  
  // Debug: ordered history of all published entity IDs
  publishHistory: string[];
}
```

### Shared community convergence types

```ts
interface ConvergenceState {
  // Number of community records that align on a specific variant.
  alignedRecordCount: number;
  // How many contradictory variants currently exist for this canonical entity.
  contradictoryVariantCount: number;
  // How many distinct contributors submitted this canonical entity.
  distinctContributorCount: number;
  knowledgeClass: 'exact' | 'exploratory';
  // Optional compact per-field agreement summary for UI.
  fieldAgreement?: Record<string, number>; // e.g. { "frameData.startup": 87 }
  lastAggregatedAt: Timestamp;
}
```

### Identity link + merge

```ts
interface EntityLink {
  canonicalKey: string;
  linkedEntityId?: string;
  linkMatchStrength: 'manual' | 'high' | 'medium' | 'low';
  lastComparedAt?: Timestamp;
}
```

- Local/private and community entities can be linked even if independently created.
- Conflict handling is field-by-field with explicit merge choices.
- Merge direction is community -> private only (no direct private overwrite of community records).
- Community records are grouped into contributor-aligned variants with explicit contradictory variants preserved.
- Exact community alignment is only valid within the same `guideVersion.convergenceKey`.
- Exploratory comparative research can be shared, but it does not become canonical exact community data.
- State-variant moves that share a trigger are linked by `actionFamilyKey` while remaining separate move records.
- Game-level moves (`parentScope: 'game'`) act as character templates; character moves are seeded from them on character creation. Only fields listed in `fieldOverrides` differ from the game-level source — all other values resolve from the game-level move.
- When a game-level move is updated, all character moves that have not overridden the changed field automatically reflect the new value. Character moves with an existing `fieldOverride` on that field are flagged for review via `VerificationSectionMap`.

### Move knowledge classification (inferred)

A move's knowledge classification (exact vs exploratory) is **inferred at runtime** from its data state, not stored explicitly:

**A move is exact when all of:**
- All `comparativeAttributes[].kind === 'exact'` (no 'observed' or 'inferred' attributes)
- All `phases[].knowledgeStatus === 'verified'` or `'measured'` (if phases exist)
- All `MoveOutcomeEffect.knowledgeStatus === 'verified'` or `'measured'` (if effects exist)
- All `FrameOutcomeWindow` values are precise (base, min, max all present, not ranges)
- No `comparativeConstraints` or `comparativeOrderings` (no comparative data)

**A move is exploratory when:**
- Any attribute is `'observed'` or `'inferred'`
- `comparativeConstraints` or `comparativeOrderings` exist (comparative data)
- Any `knowledgeStatus` field is `'observed'`
- Range data uses bounds (`lowerBound`/`upperBound`) instead of exact values

This inference avoids redundant state fields while allowing the UI and services to query the effective knowledge level on demand.
