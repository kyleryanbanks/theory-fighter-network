# Data Model Reference

Complete Firestore and local file schema for Theory Fighter Network.

## Source of Truth

**TypeScript type definitions** (authoritative source):
- All interfaces are defined in [`models/`](/models/) 
- Use these as the source of truth for structure and field details
- This document provides architectural context and design rationale

## Data Collections

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

/games/{gameId}/universal-sequences/{sequenceId}
/characters/{characterId}/sequences/{sequenceId}
/games/{gameId}/teams/{teamId}
/games/{gameId}/teams/{teamId}/sequences/{sequenceId}
```

---

## Architectural Context

### Game-Level vs Character-Level Design

**Game documents** define:
- Match rules (rounds, timer, team size)
- Frame data policy (whether exact data exists)
- Input system (button/direction layout)
- Player/opponent state models (what states exist)
- Resource models (meter, stock, timer, etc.)
- **Move types** (game-specific attack classifications: strike, throw, projectile, etc.)
- Combo scaling system
- Stage effects on gameplay

**Character documents** extend game rules with:
- Character-specific slider axes (range adjustments, etc.)
- Selectable loadouts and assists (for games supporting them)
- Custom player/opponent states
- Custom resources
- Character's own movesets

**Universal moves** (game-level) are inherited by characters via inheritance model:
- Characters copy game-level moves and mark which fields they override
- Inheritance allows single source of truth for shared moves while enabling per-character customization

### Move Scope & Inheritance

Moves can be scoped as:
- **Universal** (`characterId` absent): defined at game level, inherited by all characters
- **Character-specific** (`characterId` present, `inheritedFromMoveId` absent): unique to that character
- **Character override** (`inheritedFromMoveId` present): inherits from game-level move with field overrides specified in `fieldOverrides[]`

### Input Representation

- Games define available buttons via `InputSystemProfile` (e.g., 6-button, 4-button, custom)
- Moves own complete input sequences via `inputFrames[]` (frame-by-frame breakdown)
- Each `TriggerInputFrame` specifies: `directions[]`, `buttons[]`, `durationFrames`
- No intermediate trigger abstraction layer — moves directly reference game buttons

### Move Type System

Games can define arbitrary attack type classifications via `GameDocument.moveTypes[]`:
- Each game defines its own move type taxonomy
- Examples: `strike`, `throw`, `projectile`, `counter`, `special`, `super`, etc.
- Moves reference types via `moveType` field
- Enables games with secondary mechanics based on attack class (e.g., SF6's strike/throw counters)

### Attack Height Taxonomies

**Concept**: Different fighting games use completely different attack height classification systems. Rather than hardcoding a single taxonomy, heights are modeled as **configurable attack states** in `StateModel.attacks`.

**How it works:**
1. Games define height taxonomy in `states.attacks` during guide creation
2. Moves reference height via attack state key in effects or preconditions
3. Block states are keyed by height: `"sf6-blocks-low"`, `"sf6-blocks-mid"`, etc.
4. UI provides **template defaults** but users can customize for their game

**Common height taxonomies (as UX templates):**

| Game Family | Heights | Notes |
|---|---|---|
| **Street Fighter** | low / mid / high / overhead | Based on required blocking stance |
| **Tekken** | low / mid / high | Based on hurtbox region hit |
| **Guilty Gear** | low / mid / high / unblockable / air-only | Adds unblockable class |
| **Marvel vs Capcom** | low / mid / high / crossup | Allows mid-air attacks |
| **Custom** | User-defined | Any taxonomy the game requires |

**Example: Street Fighter game creation**

User creates new guide, selects "Street Fighter" template:
```typescript
states: {
  attacks: {
    "sf6-attacks-height-low": {
      name: "Low Attack",
      description: "Must be blocked crouching"
    },
    "sf6-attacks-height-mid": {
      name: "Mid Attack", 
      description: "Blocked standing or crouching"
    },
    "sf6-attacks-height-high": {
      name: "High Attack",
      description: "Must be blocked standing; vulnerable to crouch"
    },
    "sf6-attacks-height-overhead": {
      name: "Overhead Attack",
      description: "Unblockable while crouching"
    }
  },
  blocks: {
    "sf6-blocks-low": { name: "Crouch Block", duration: 0 },
    "sf6-blocks-mid": { name: "Standing Block", duration: 0 },
    "sf6-blocks-high": { name: "Overhead Block", duration: 0 }
  }
}
```

Ryu's Hadoken move then references height:
```typescript
const hadoken: MoveDocument = {
  phases: [{
    effects: {
      onHit: {
        opponentEffects: {
          appliesStateTags: ["sf6-attacks-height-mid"]  // Mid-height projectile
        }
      },
      onBlock: {
        opponentEffects: {
          appliesStateTags: ["sf6-blocks-mid"]  // Requires mid-block stance
        }
      }
    }
  }]
}
```

**Why this design:**
- ✅ **Game-agnostic**: Works for any height system (2D, 3D, unique mechanics)
- ✅ **User-customizable**: Games can add/remove/rename heights as needed
- ✅ **Queryable**: UI can filter moves by height, show which blocks apply
- ✅ **Data-driven**: No magic strings in code, all patterns user-defined
- ✅ **Reduces friction**: Templates get users started quickly without blank slate

**Implementation note:**
During game guide creation, the UI should offer height template selection as part of game configuration wizard, with ability to customize before saving.

### Custom State Updaters for Game-Specific Mechanics

**Concept**: Each `State` can optionally define custom update functions that run during simulation. This allows users to implement any game mechanic without requiring schema changes.

**Two updater types:**

1. **`onUpdate(incomingValue, context)`** — Called when an effect applies a value to this state
   - Receives the raw value from effect
   - Can transform it before storage
   - Example: hitstun scaling by combo counter
   
2. **`onFrameAdvance(context)`** — Called once per frame during simulation
   - Runs independently of effects
   - Used for system-level mechanics
   - Example: gravity, health regen, meter decay

**Examples:**

Hitstun scaling by combo count (effect-driven):
```typescript
states.comboMechanics.hitstun = {
  name: "Hitstun",
  min: 0, max: 100,
  onUpdate: (incomingHitstun, context) => {
    const comboCount = context.runtimeState.comboMechanics.comboCount || 0;
    const scaleFactor = 0.95 ** comboCount;  // Each hit = 5% less stun
    context.runtimeState.comboMechanics.hitstun = incomingHitstun * scaleFactor;
    return context;
  }
}
```

Gravity affecting motion (frame-driven):
```typescript
states.stageMechanics.gravity = {
  name: "Gravity", min: 0, max: 10,
  onFrameAdvance: (context) => {
    const g = context.runtimeState.stageMechanics.gravity;
    // Apply gravity to all character/projectile velocities
    // Update positions based on new velocities
    return context;
  }
}
```

Health regeneration (frame-driven, conditional):
```typescript
states.resources.health = {
  name: "Health", min: 0, max: 100,
  onFrameAdvance: (context) => {
    // Only regen if not in hitstun and not blocking
    const isInHitstun = context.runtimeState.comboMechanics.hitstun > 0;
    const isBlocking = context.runtimeState.blocks.isBlocking;
    
    if (!isInHitstun && !isBlocking) {
      context.runtimeState.resources.health = Math.min(
        context.runtimeState.resources.health + 0.5,
        100
      );
    }
    return context;
  }
}
```

**Deterministic Execution Order:**
`GameDocument.stateExecutionOrder` specifies which states' `onFrameAdvance` callbacks run first. Unspecified states run in consistent arbitrary order. Enables power users to manage dependencies (e.g., gravity before position calculation):

```typescript
stateExecutionOrder: ["stageMechanics.gravity", "positions", "health", "comboMechanics"]
```

**Storage:**
- Functions defined in local guides (not published to Firestore)
- Git-tracked with guide files or in separate TypeScript files
- Called at simulation time by engine

### Collision, Hurt, Hit, and Throw Box Regions

**Concept**: Four distinct box systems are unified under a single region model, supporting both 2D (circles/rectangles) and 3D (spheres/cubes) games. Regions are pure geometry—shape is identified by field presence, not type discriminators.

**Region shapes** (discriminated by presence of fields):
- **2D Circle**: `{ x, y, radius }`
- **2D Rectangle**: `{ x, y, width, height }`
- **3D Sphere**: `{ x, y, z, radius }`
- **3D Cube**: `{ x, y, z, width, height, depth }`

**Character neutral boxes** (baseline, standing stance):
```typescript
const ryu: CharacterDocument = {
  neutralRegions: {
    collisionBoxes: [
      { x: 0, y: 0, width: 40, height: 100 }  // Prevents overlap
    ],
    hurtBoxes: [
      { x: 0, y: 0, width: 30, height: 100 },   // Torso
      { x: 5, y: 90, width: 20, height: 15 }    // Head
    ]
  }
}
```

**Move-phase region changes** (per frame stage):
Moves override neutral boxes during startup, active, and recovery frames. Each stage independently optional.

```typescript
const crouch: MoveDocument = {
  phases: [{
    startup: {
      duration: { exact: 1 },
      collisionBoxes: [
        { x: 0, y: 30, width: 50, height: 70 }  // Wider, shorter
      ],
      hurtBoxes: [
        { x: 0, y: 30, width: 40, height: 70 }  // Lower profile
      ]
    },
    active: {
      duration: { exact: -1 }  // Infinite while held
    },
    recovery: {
      duration: { exact: 1 }
    }
  }]
}
```

Ryu's hadoken with phase-by-phase region changes:
```typescript
const hadoken: MoveDocument = {
  phases: [{
    startup: {
      duration: { exact: 10 },
      // Charge-up pose: tighter collision
      collisionBoxes: [{ x: 0, y: 0, width: 30, height: 100 }]
    },
    active: {
      duration: { exact: 20 },
      // Extended arms create new hurt boxes
      hurtBoxes: [
        { x: 0, y: 0, width: 30, height: 100 },      // Torso
        { x: -20, y: 30, width: 50, height: 40 }     // Extended arm
      ],
      // Projectile hit boxes
      hitBoxes: [
        { x: 0, y: 40, radius: 15 }  // Main projectile
      ]
    },
    recovery: {
      duration: { exact: 8 },
      // Post-fireball pose with extended arm region
      collisionBoxes: [{ x: 0, y: 0, width: 45, height: 100 }]
    }
  }]
}
```

**Box removal semantics**:
- **Omitted field** (undefined): inherit from previous stage or character defaults
- **Empty array** `[]`: explicitly remove (invulnerability, teleport dash, etc.)
- **Specified boxes** `[box1, box2, ...]`: override with these regions

Teleport dash example (all boxes disappear):
```typescript
const teleportDash: MoveDocument = {
  phases: [{
    active: {
      duration: { exact: 6 },
      collisionBoxes: [],  // Gone
      hurtBoxes: [],       // Invulnerable
      hitBoxes: [],
      throwBoxes: []
    }
  }]
}
```

**Why this design:**
- ✅ **Unified model**: Collision, hurt, hit, throw boxes use same Region type
- ✅ **Pure geometry**: No semantic keys or metadata on regions—identity via parent
- ✅ **2D + 3D support**: Games use appropriate shapes via field presence
- ✅ **Deterministic**: Positions are DataValue (exact or relative), positions are reproducible
- ✅ **Programmatically queryable**: Collision detection, range analysis, combo feasibility all enabled
- ✅ **State-driven activation**: Regions change per move phase; hurt box state disabling handled separately
- ✅ **Minimal friction**: Users only define what changes per stage

**Integration points**:
- **CharacterDocument**: `neutralRegions` (collision, hurt, throw boxes in neutral stance)
- **MovePhase**: `startup`, `active`, `recovery` stages each with optional region overrides
- **Query-time logic**: Resolve active boxes from character defaults + move phase overrides + state disabling

### State and Region Changes are Atomic (Moves Couple State and Geometry)

**Key principle**: When a player's state changes, their on-screen geometry changes. These are not separate concerns—they're linked via the move that triggers the state change.

**Example: Crouching**

User presses down. This triggers the "crouch" move:
```typescript
const crouch: MoveDocument = {
  inputFrames: [{ directions: ["1"], durationFrames: 1 }],
  preconditions: {
    requiredAllPlayerStateTags: ["sf6-positions-standing"]
  },
  phases: [{
    startup: {
      duration: { exact: 1 },
      // REGION CHANGE: Crouch stance is shorter and wider
      collisionBoxes: [{ x: 0, y: 30, width: 50, height: 70 }],
      hurtBoxes: [{ x: 0, y: 30, width: 40, height: 70 }]
    },
    active: {
      duration: { exact: -1 }  // Infinite while held
    },
    recovery: {
      duration: { exact: 1 }
    },
    effects: {
      onHit: {
        playerEffects: {
          // STATE CHANGE: Player is now in crouching state
          appliesStateTags: ["sf6-positions-crouching"]
        }
      }
    }
  }]
}
```

**Result**: 
- State changes from standing to crouching
- Geometry changes from tall to short+wide
- Both happen atomically via the same move
- No separate state-to-geometry mapping needed
- Invulnerability (hurt box removal) works the same way: move applies state + removes boxes

This design eliminates the need for:
- Explicit "state modifies hurt boxes" lookup tables
- Separate "on state change, update geometry" logic
- Magic linkages between state names and box lists

Instead: **Move is the single source of truth for both state and geometry changes.**

### Exact vs Relative Values: DataValue Pattern

**Pattern**: Game properties (frame data, damage, resources, displacement, etc.) may have either exact values or user-positioned relative values.

**DataValue Type**:
```typescript
type DataValue = {
  exact?: number;      // Precise value if user knows it (e.g., startup is 5 frames)
  relative?: number;   // Positioned within bounds as percentage (0-100)
  notes?: string;      // Context for how value was determined
}
```

**State Models define the bounds**:
- Games define `StateModel<T>` with bounds for properties that have them
- Example: `stateModel.damage = { min: 0, max: 100 }` (game-level bounds discovered)
- Example: `stateModel.ki = { min: 0, max: 200 }` (user learned bounds)
- If property not in StateModel, default bounds [0, 100] apply (percentage scale)

**How DataValue interacts with State**:

1. **User enters exact value** → stored as `{ exact: 25 }`
   - Used directly, independent of bounds
   - Example: User knows damage is 25 frames

2. **User positions value relatively** → stored as `{ relative: 50 }`
   - 50% on whatever scale is active
   - If `stateModel.startup = { min: 0, max: 60 }`: 50% = 30 frames
   - If no bounds defined: 50% = default scale [0, 100]

3. **User refines bounds later** → relative values rescale automatically
   - User positions damage at 50 (default [0, 100])
   - Later learns damage range is [20, 80] → updates StateModel
   - Same 50 now rescales: 50% of [20, 80] = 50
   - Move data unchanged; only interpretation changes

**Applications**:
- `FrameStage.duration` — DataValue for startup/active/recovery frame counts
- `ResourceEffect.amount` — DataValue (for uncertain resource gains)
- `PositionalEffect.displacement.x/y` — DataValue (for uncertain knockback distances)
- Any numeric game property where user may not have precise data

**Inference**: Knowledge completeness (exact vs exploratory) is inferred from DataValue presence:
- All values are `{ exact: ... }` → exact knowledge for this property
- Any `{ relative: ... }` present → exploratory/measured knowledge

### Combo Resources and Scaling

**Concept**: Scaling systems (damage scaling, hitstun scaling, etc.) are game-configurable resources that modify state during combos.

**How it works:**
- Games define scaling resources in `StateModel.resources`:
  ```typescript
  game.states.resources: {
    "damage-scaling": {
      name: "Damage Scaling",
      bounds: { min: 25, max: 100 },
      initialValue: 100
    },
    "hitstun-scaling": {
      name: "Hitstun Scaling", 
      bounds: { min: 50, max: 100 },
      initialValue: 100
    }
  }
  ```
- Games without scaling don't define these resources (optional per-game)

**Hitstun as a combo resource:**
- Opening move grants `opponent.resources.hitstun` (e.g., 5 frames)
- Each subsequent move costs startup frames: `opponent.resources.hitstun -= nextMove.startup`
- If hitstun remaining < 0: combo ends, move whiffs
- Scaling modifies hitstun pool: `opponent.resources.hitstun *= 0.9` per hit
- Certain moves reset: apply `reset opponent.resources.hitstun to 100%` effect
- Corner/position effects modify bounds: `hitstun.max *= 1.2 (in corner)`

**Combo feasibility with resources:**
- Combo connects if: `opponent.resources.hitstun - nextMove.startup >= 0` (AND spacing valid)
- Scaling automatically tightens windows: less hitstun = fewer moves available
- Move effects modify resources at query time: `opponent.resources.damageScaling -= 10%`

**Move effects on resources:**
```typescript
const hadoken: MoveDocument = {
  phases: [{
    effects: {
      onHit: {
        damage: { exact: 100 },
        opponent: {
          stun: { exact: 20 },
          modifiesResource: {
            "damage-scaling": { delta: -10 }  // reduces scaling by 10%
          }
        }
      }
    }
  }]
}

const meterBurn: MoveDocument = {
  phases: [{
    effects: {
      onHit: {
        damage: { exact: 150 },
        opponent: {
          modifiesResource: {
            "damage-scaling": { exact: 100 }  // reset scaling to 100%
          }
        }
      }
    }
  }]
}
```

**User discovery workflow:**
1. User captures per-hit damage in sequences
2. TFN infers scaling: `observed damage / base damage = scaling factor`
3. TFN suggests bounds from empirical data: "Scaling appears to be 25-100%, -10% per hit"
4. User confirms bounds in game config
5. User documents move effects that modify resources
6. TFN validates future sequences against discovered rules

**Why this design:**
- ✅ **Game-agnostic**: Any game defines any resources it needs
- ✅ **Deterministic**: Resource state + move effects = predictable outcome
- ✅ **Unified**: Scaling, hitstun, meter all follow same state modification pattern
- ✅ **Discovery-driven**: Users empirically find bounds, not guess them
- ✅ **Composable**: Multiple resource types (damage scaling, hitstun scaling, stun decay, etc.) work together

### Combo Difficulty and Sequence Analysis

- `SequenceDifficulty` computes execution difficulty from sequence length, input complexity, and timing strictness
- Query-time validation: Can this sequence connect given current game/character/resource state?

### Projectile System

**Core Concept**: Projectiles are independent entities, not move properties.

**Structure**:
- **ProjectileDocument** — Reusable projectile template (similar to MoveDocument, but no `inputFrames`)
- **ProjectilePhase** — Describes projectile motion, regions, effects, lifetime
- **ProjectileInstance** — Runtime object during simulation with mutable state and position

**Key Features**:
- Projectiles defined using game's `states.projectiles` (user-defined properties)
- Each projectile phase specifies:
  - `velocity` (per frame motion in x/y or x/y/z)
  - `initialPosition` (starting position for phase)
  - Regions: `hitBoxes`, `hurtBoxes`, `collisionBoxes`
  - Effects on hit/block/whiff
  - `destroyedAfter` flag for lifetime expiration
- Position calculated deterministically: `position(frame) = initialPosition + (velocity × frameCount)`
- Supports teleporting projectiles (discontinuous phases) and continuous motion

**User-Defined Properties**:
- Properties defined at game level: `states.projectiles = { durability: {...}, priority: {...} }`
- Each projectile sets values from this template
- Examples:
  - SF6: `durability: 1-4`, `priority: 1-5`
  - Marvel: `hits: 1-3`, `hitstunMod: 0.8-1.0`
  - Guilty Gear: `level: 1-3`

**Spawning**:
- `MovePhase.projectileKey` references projectile by semanticKey
- Projectile spawns on first active frame of phase
- Single move can have multiple phases, spawning different/same projectiles

**Integration with State System**:
- Projectile properties updated via `State.onUpdate` callback (for effect-driven changes)
- System-level mechanics (gravity affecting projectile trajectory) via `State.onFrameAdvance`
- Example: durability decrements via `onUpdate` when clash happens
- Example: gravity acceleration via `onFrameAdvance` affecting all positions

**Collision & Destruction**:
- Projectile destroyed via `MoveOutcomeEffect.projectileDestroyed: true`
- Or via `destroyedAfter: true` at phase end (lifetime expiration)
- Position-based collision detection during frame-by-frame simulation

### Stage Design

Stages have:
- Comparative stage properties (size, elevation, walk speed impact, etc.)
- Zone definitions for wall/floor/ceiling interactions and positioning reference
- Stage zones link to universal stage zones for cross-game comparison

### Team & Sequence Tracking

**Teams** group related characters for multi-character games:
- Teams define `characterSemanticKeys` in order (e.g., Ryu + Chun-Li)
- Each team has `semanticKey` (computed from game + ordered character keys)
- Used in team-vs-team games (Marvel vs Capcom, King of Fighters, etc.)

**Sequences** document repeatable action chains:
- **Universal sequences** (game-level): Applicable to any character (common combos, setups)
- **Character sequences** (scoped to character): Character-specific combos or pressure strings
- **Team sequences** (scoped to team): Team-specific mixups or synergy routes
- Each sequence contains ordered `moveSemanticKey[]` (deterministic move references)
- `MoveTransitionEdge[]` tracks feasibility between moves; combo viability determined by timing/spacing query with current state

**Matchups** analyze character-versus-character dynamics:
- `MatchupDocument` defines both sides with character and game context
- **MatchupScenario** (scenario tree): Specific position/state with defined opponent action
  - Tracks opening (player position, state, resources)
  - Opponent option key (move or sequence to test against)
  - Outcome assessment (-1: loses, 0: neutral, +1: wins)
  - Child scenarios branch from outcome (further exploration)
- Enables community to build scenario trees exploring game depth
- Example tree: Ryu at mid-range vs Hadoken → test jab combos → test throw vs tech attempts

**Routing and anti-strategy**:
- Sequences document optimal damage/positioning goals
- Matchup scenarios document defensive and offensive option coverage
- Community can discover whether a sequence works against specific opponent options
- Anti-strategy information emerges from scenario outcomes (what beats what)

### Community Publishing Model

- Each published entity gets a `publishedId` (Firestore doc ID) on first publish
- Multiple users can publish independent versions of the same logical entity
- All versions of an entity share a `semanticKey` (identity grouping)
- Client-side queries aggregate all published versions by `semanticKey` to display confidence/variants
- No server-side convergence logic; all aggregation happens client-side
- `GuideDocument.publishHistory[]` tracks which `publishedId`s were published from this guide

### Semantic Key System

**Concept**: Semantic keys identify **logical entity identity** across variants and versions.

**Computation**: `semanticKey = hash(identity_fields_only)` where identity fields are normalized values that define "is this the same entity?"

**Semantics per entity type:**
- **Game**: `normalizedGameName + versionFamily`
- **Character**: `gameSemanticKey + normalizedCharacterName`
- **Move**: `gameSemanticKey + (characterSemanticKey or empty) + normalizedInputFrames + normalizedPreconditions`
- **Sequence**: `gameSemanticKey + normalizedMoveSequence` (ordered move semanticKeys)
- **Stage**: `gameSemanticKey + normalizedStageName`
- **StageZone**: `gameSemanticKey + stageSemanticKey + zoneType + side`
- **Team**: `gameSemanticKey + ordered character semanticKeys`
- **Matchup**: `gameSemanticKey + ordered character pair semanticKeys`

**Rules:**
- Exclude metadata from semantic key (timestamps, ownerId, notes, etc.)
- Include only fields that define entity identity
- `semanticKey` is immutable per entity (changing identity = new entity)
- Used for cross-version matching and community variant grouping

### Semantic Fingerprinting

**Concept**: Fingerprints identify **exact semantic equivalence** of published values.

**Computation**: `semanticFingerprint = hash(same_fields_as_semanticKey + all_gameplay_values)`

**When computed:**
- At publish time (required) on the exact payload
- Optional during local edit for UI preview

**Use cases:**
- Deduplicating identical variants (exact match = same fingerprint)
- Confidence calculation (% of published versions matching top fingerprint)
- Conflict detection (multiple distinct fingerprints = conflicting data)

### Determinism via Semantic Identity

**Concept**: Semantic keys enable **deterministic move resolution and sequence simulation** critical for peer-to-peer online multiplayer and reproducible analysis.

**How it works:**

1. **semanticKey is immutable to gameplay**: It is computed **only** from identity fields (game key, character name, input frames, preconditions). Changes to:
   - Frame data / gameplay values
   - Community metadata (ownerId, timestamps, notes)
   - ResourceEffects or OpponentEffects
   - Do **not change** the semanticKey

2. **Move references are deterministic**: When a sequence references a move by `moveSemanticKey`, it always resolves to the same move:
   - Same `gameSemanticKey` + `inputFrames` + `preconditions` = always the same logical move
   - Even if multiple users publish different frame data for that move, the move identity is stable
   - Simulation engine queries by semanticKey, not by variant or published version

3. **Sequence simulation becomes deterministic**:
   - Given: `gameSemanticKey`, `gameStateContext`, and a `sequenceDocument` with ordered `moveSemanticKey[]`
   - Engine resolves each move by key → looks up current game-level and character-level move definitions
   - Same inputs + same starting state = same outcome (deterministic)
   - Enables reproducible combo feasibility checks, whiff detection, and gap analysis

4. **Scenario testing stays reproducible**:
   - `MatchupScenario` stores `opponentOptionKey` (a move or sequence semanticKey)
   - Simulation replays the same scenario identically on multiple runs
   - Different players testing the same scenario reach the same conclusions about outcome (-1/0/+1)

**Critical assumption for implementation:**
- When querying a move by `moveSemanticKey`, **always use the same game/character/version context**
- If game mechanics change (e.g., a patch), the move's gameplay values may differ, but semanticKey remains stable
- Scenario contexts must explicitly store `gameVersion` to maintain determinism across patches

**Why not include gameplay values in semanticKey?**
- semanticKey identifies "what was tested", not "what the result was"
- Multiple test results can be published for the same move (each documented via DataValue: exact vs relative)
- Determinism comes from **stable identity + resolved context**, not from freezing gameplay values

---

## Design Decisions

### Why Inference Over Explicit State?

- **Reduces maintenance burden**: Don't manually update abstract state flags on every data change
- **Single source of truth**: Data itself is authoritative; derived values computed on read
- **Consistency guarantees**: No risk of state/data divergence
- **Flexibility**: Different applications can apply different inference logic (lenient vs strict)

Example: Instead of storing `moveKnowledgeStatus: 'exact'`, check whether all frame data is populated. If it is, it's exact; if mixing observed/inferred with exact, it's exploratory.

### Why Game-Level Move Types?

Different games classify attacks differently:
- Street Fighter: strike/throw distinction for defensive tech choices
- Guilty Gear: normal/special/super with different meter costs
- Marvel: projectile systems with durability/priority interactions

Game designers define `moveTypes` to enable secondary mechanics and proper analysis.

### Inheritance Model for Characters

Rather than duplicating game-level moves in every character:
- Games define universal movesets
- Characters explicitly list field overrides
- Minimal character-specific data reduces redundancy
- App-level merges game defaults with character overrides at query time

---

## Frame Advantage and Meaty Timing (CFN Hours 10-12)

**Concept**: Frame advantage describes the recovery difference between attacker and opponent after an attack connects.

**How it works:**
- **Frame Advantage** = `opponent.stun - attacker.recovery`
- Positive frame advantage: attacker can act before opponent
- Negative frame advantage: opponent can act first (or neutral if zero)
- Example: If jab has 5-frame hitstun and 4-frame recovery, frame advantage is +1

**Computing advantage per outcome:**
- `FrameOutcomeWindow` tracks base advantage per outcome type:
  ```typescript
  frameAdvantage?: {
    base: DataValue,           // Base advantage (hitstun - recovery)
    min?: DataValue,           // Minimum with possible variation
    max?: DataValue,           // Maximum with possible variation
    meatyAdvantageGain?: DataValue  // Extra advantage from meaty timing
  }
  ```

**Meaty Timing** (for games that support it):
- Attack connects on a frame **after** the first active frame, but still causes the same effect (hitstun, damage, etc.)
- Key insight: Opponent enters hitstun at a later time, but hitstun duration is the same
- Result: Attacker recovers one frame earlier relative to when opponent recovers
- Practical advantage: +1 frame of advantage vs connecting on frame 1
- Example: Hadoken's active frames 1-20; meaty connect on frame 2 = +1 extra advantage
- `meatyAdvantageGain` stores this bonus (typically 1-3 frames depending on active frame range)

**Model structure:**
```typescript
const jab: MoveDocument = {
  phases: [{
    startup: { duration: { exact: 4 } },
    active: { duration: { exact: 5 } },
    recovery: { duration: { exact: 4 } },
    effects: {
      onHit: {
        opponent: {
          stun: { exact: 5, unit: 'frames' }
        }
      },
      frameAdvantage: {
        base: { exact: 1 },      // 5 hitstun - 4 recovery = +1
        meatyAdvantageGain: { exact: 1 }  // If hits frames 2-5 of active
      }
    }
  }]
}
```

**Why this matters:**
- Players who optimize timing gain measurable advantage
- Community guides can document which moves allow meaty setups
- Combo feasibility analysis must account for both frame 1 and meaty variants

---

## Hit Stun and Block Stun (CFN Hours 10-12)

**Concept**: Each attack has unique stun duration for opponent, determined by the attack's outcome type.

**How it works:**
- `MovePhase.effects.onHit.opponent.stun` — Hitstun: frames opponent cannot act after being hit
- `MovePhase.effects.onBlock.opponent.stun` — Blockstun: frames opponent cannot act after blocking (usually shorter than hitstun)

**Example:**
```typescript
const jab: MoveDocument = {
  phases: [{
    effects: {
      onHit: {
        opponent: {
          stun: { exact: 5, unit: 'frames' }  // 5 frames hitstun
        }
      },
      onBlock: {
        opponent: {
          stun: { exact: 2, unit: 'frames' }  // 2 frames blockstun
        }
      }
    }
  }]
}
```

**Combo timing and frame advantage:**
- Combo connects if: `nextMove.startup <= hitstun + (frameAdvantage.base || 0)` (AND spacing condition met)
- Frame advantage determines when next move can combo: `effective_startup = nextMove.startup - frameAdvantage`
- Example: Jab's 5-frame hitstun with +1 frame advantage allows combos from any move with 6-frame startup or less
- Meaty timing increases available startup window: `effective_startup = nextMove.startup - (frameAdvantage.base + meatyAdvantageGain)`

**DataValue.unit defaults to frames** when undefined, but can be overridden:
```typescript
stun: { exact: 83, unit: 'milliseconds' }  // Explicitly not frames
stun: { exact: 5 }                          // Implicitly frames
```

---

## Hit Stop Timing (CFN Hour 11)

**Concept**: Brief visual pause when move connects, affecting perceived "weight" and cancel window.

**How it works:**
- `MovePhase.effects.onHit.hitStop` — Applies when move hits
- `MovePhase.effects.onBlock.hitStop` — Applies when move is blocked (often different)

**Example:**
```typescript
const hadoken: MoveDocument = {
  phases: [{
    effects: {
      onHit: {
        hitStop: { exact: 12, unit: 'frames' },  // Heavier feel on hit
        opponent: { stun: { exact: 20 } }
      },
      onBlock: {
        hitStop: { exact: 8, unit: 'frames' },   // Less heavy on block
        opponent: { stun: { exact: 12 } }
      }
    }
  }]
}
```

**Impact:**
- Longer hit stop = more time for player to input cancel commands
- Cancel window is determined by hit stop duration (CFN: "timing is during hit stop")
- Heavier attacks typically have longer hit stop (visual feedback of power)

---

## Cancel Windows and State Constraints (CFN Hour 14)

**Concept**: Cancels have two independent constraints: timing window and state preconditions.

**How it works:**
- Cancel **timing**: `PhaseCancelRule.windowStartFrame/windowEndFrame` (WHEN cancel is available)
- Cancel **restrictions**: Determined by target move's `preconditions` (IF move can be used)
- No duplication: state is always checked on target move

**Example: Ryu Jab → Hadoken cancel**
```typescript
const jab: MoveDocument = {
  phases: [{
    cancelOptions: {
      onHit: [{
        windowStartFrame: 2,               // Cancel available frames 2-5
        windowEndFrame: 5,
        allowedMoveKeys: ["hadoken", "shoryuken"]
      }]
    }
  }]
}

const hadoken: MoveDocument = {
  preconditions: {
    // No state restrictions—can cancel into from any state
  }
}

// Result: Cancel available frames 2-5; no state gate
```

**Per-game variability (CFN documents):**
- Street Fighter II: Universal 4-frame grace period (cancel timer)
- Super SFII: Per-character cancel timers (some 4F, some 5F)
- SF3: Complex per-version differences
- SF4/5: Different cancel timer per move type

Users document via `PhaseCancelRule` + target move `preconditions`.

---

## Duration Units and Framerate Conversion

**Concept**: Users may measure durations with a watch (seconds) or know frame counts. DataValue supports both.

**How it works:**
- `DataValue.unit` clarifies measurement unit (defaults to frames if undefined)
- `GameDocument.frameRate` enables conversion: `frames = seconds * frameRate`
- UI layer handles display and conversion

**Example: Street Fighter at 60fps**
```typescript
const game: GameDocument = {
  frameRate: 60,  // 60 frames per second
  // ...
}

// User measures with stopwatch: "Jab stun is about 83 milliseconds"
const jab: MoveDocument = {
  phases: [{
    effects: {
      onHit: {
        opponent: {
          stun: { exact: 83, unit: 'milliseconds' }  // Explicit unit
        }
      }
    }
  }]
}

// UI converts to frames: 83ms ÷ 1000 * 60fps = ~5 frames
// Alternative: User enters frames directly
stun: { exact: 5 }  // Implicitly frames; UI shows as "5 frames" or "83.3ms" depending on context
```

**Progressive documentation helper:**
- Frame-only knowledge: `{ exact: 5 }` is clear
- Second-based measurement: `{ exact: 0.083, unit: 'seconds' }` captures user intent
- No data loss; unit clarifies interpretation

---

## Pushback and Spacing (CFN Hours 11-13)

**Concept**: Opponent displacement on hit/block affects combo feasibility. Located in positional effects.

**How it works:**
- `MovePhase.effects.onHit.opponent.positional.displacement` — Opponent pushed back on hit
- `MovePhase.effects.onBlock.opponent.positional.displacement` — Opponent pushed back on block (often less)

**Example:**
```typescript
const jab: MoveDocument = {
  phases: [{
    effects: {
      onHit: {
        opponent: {
          stun: { exact: 5, unit: 'frames' },
          positional: {
            displacesCharacter: true,
            displacement: { x: { exact: 20 } }  // Pushed back 20 units
          }
        }
      },
      onBlock: {
        opponent: {
          positional: {
            displacement: { x: { exact: 10 } }  // Less pushback on block
          }
        }
      }
    }
  }]
}
```

**Combo feasibility (timing and spacing):**

Both conditions must be satisfied for a combo to connect:

1. **Timing condition**: Opponent must still be in hitstun when next move starts
   - Base: `nextMove.startup <= currentHitstun + frameAdvantage.base`
   - With meaty timing: `nextMove.startup <= currentHitstun + frameAdvantage.base + meatyAdvantageGain`
   - **Hitstun scaling applies during the combo**: Each hit modifies the hitstun resource via effects
     - Move applies hitstun scalar: `opponent.resources.hitstun *= 0.9` (each hit reduces by 10%)
     - Or as counter: `opponent.resources.hitCount++` until `hitCount >= threshold` → forced knockdown
   - Example: Jab hits with 5-frame hitstun; hadoken reduces hitstun to 4.5 frames via scaling; next move needs 4-frame startup or less
   - **Scaling tightens windows**: As hitstun shrinks, fewer moves can combo into

2. **Spacing condition**: Next move must reach opponent after pushback
   - `playerPosition + playerDisplacement + nextMove.range >= opponentPosition + opponentDisplacement`
   - Example: Jab pushes opponent 20 units; next move needs 20+ range to connect

**Query-time validation** (both must pass AND):
```typescript
canCombo(move1, move2, currentState) {
  // Apply move1's effects to current state (including hitstun scaling)
  const stateAfterMove1 = applyEffects(currentState, move1.effects);
  
  // Check if move2 can connect with scaled hitstun
  const currentHitstun = stateAfterMove1.opponent.resources.hitstun;
  const timingValid = move2.startup <= (currentHitstun + move2.frameAdvantage);
  
  // Check if spacing condition is met
  const spacingValid = (pos1 + move1.pushback + move2.range) >= (pos2 + move2.spacing);
  
  // Check for forced knockdown state (if using hit counter system)
  const forcedKnockdown = stateAfterMove1.opponent.resources.hitCount >= hitCountThreshold;
  
  return timingValid && spacingValid && !forcedKnockdown;
}
```

**Hitstun scaling mechanics (game-specific):**
- **Percentage-based scaling**: Each hit reduces hitstun by % (e.g., -10% per hit)
  - Starting hitstun depletes as combo progresses
  - Eventually hitstun drops to minimum bound (e.g., 1 frame), forcing combo end
- **Hit counter system**: Each hit increments counter; at threshold, triggers forced knockdown
  - Combo must end when counter reaches threshold
  - Some moves may reset or modify counter
  - Separate from hitstun duration (both can apply)
- **Hybrid**: Both systems in same game (e.g., hitstun scaling AND hit counter that triggers dizzy)

**Corner mechanics**: Pushback may be applied to attacker instead (game-specific rule)

---

## Multi-hit Move Structure

**Concept**: Moves can hit multiple times via multiple phases or multiple hitboxes in single phase.

**Approach A: Sequential hits (multiple phases)**
```typescript
const multiHit: MoveDocument = {
  phases: [
    {
      label: 'First hit',
      active: { duration: { exact: 5 } },
      effects: {
        onHit: {
          opponent: {
            stun: { exact: 8 },
            positional: { displacement: { x: { exact: 15 } } }
          }
        }
      }
    },
    {
      label: 'Second hit',
      active: { duration: { exact: 5 } },
      effects: {
        onHit: {
          opponent: {
            stun: { exact: 8 },
            positional: { displacement: { x: { exact: 15 } } }
          }
        }
      }
    }
  ]
}
```

**Approach B: Simultaneous/overlapping hits (multiple hitboxes in same active phase)**
```typescript
const multiHit: MoveDocument = {
  phases: [{
    active: {
      duration: { exact: 10 },
      hitBoxes: [
        { x: -10, y: 30, width: 20, height: 30 },  // Left side hitbox (active entire 10 frames)
        { x: 10, y: 30, width: 20, height: 30 }    // Right side hitbox (active entire 10 frames)
      ]
    },
    effects: {
      onHit: {
        opponent: {
          stun: { exact: 12 }  // Total stun for entire move
        }
      }
    }
  }]
}
```

**When to use each approach:**
- **Approach A (phases)**: Hits occur at different times during move (first hit frames 1-5, second hit frames 6-10)
  - Each phase has its own timing, effects, and positioning
  - Naturally represents per-hit variation
- **Approach B (multiple hitboxes)**: Multiple hit areas active simultaneously during same frame range
  - Move has multiple contact points that can hit at the same time (e.g., wide sweep hitting left and right)
  - Single active phase with multiple hitboxes covering the move's geometry

**Hitstun scaling:**
- Multi-hit combos apply per-game scaling rules (handled at query time, not in model)
- Each hit contributes to combo counter (prevents infinites via damage scaling)
- Approach A naturally represents sequential hits with individual hitstun/scaling per hit
- Approach B requires per-hitbox hit counting for advanced games (future enhancement)

---

## Version Management

**Concept**: Detect when documented moves or sequences become outdated due to game patches.

**How it works:**
- Each entity metadata stores `validatedVersion: string` (last game version it was tested/verified against)
- Games have current `version: string` (e.g., "6.0", "1.5.2")
- **Out of date**: Compare `meta.validatedVersion` against `game.version`
  - If versions match: data is current and validated
  - If versions differ: data may need review (game may have changed move properties)
- UI flags entities where `meta.validatedVersion !== game.version`

**Why this matters:**
- Communities can see which guides are tested on current patch
- Players avoid outdated frame data or move properties
- Guides accumulate confidence as multiple players validate on same version
- When game patches, community can quickly identify what needs re-testing

**Example:**
```typescript
// Ryu jab documented and tested on SF6 v1.0
const jab: MoveDocument = {
  meta: { validatedVersion: "1.0" },
  // frame data, effects, etc.
}

// Game is now at v1.5
const game: GameDocument = {
  version: "1.5"
}

// Comparison: if validatedVersion !== game.version, flag as "tested on older version"
```
