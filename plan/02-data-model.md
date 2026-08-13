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

### Data-Driven Knowledge Inference

**Philosophy**: Minimize maintenance burden by inferring derived state from actual data rather than storing it explicitly.

**Knowledge classification** (exact vs exploratory) is inferred from data:
- **Exact move knowledge**: 
  - All `comparativeAttributes` have `kind === 'exact'` or `'measured'`
  - No `comparativeConstraints` or `comparativeOrderings` present
  - All `phases[].startup.duration`, `phases[].active.duration`, `phases[].recovery.duration` fields fully populated (if phases exist)
  - All `MoveOutcomeEffect` fields have specific values (not conceptual/noted ranges)

- **Exploratory move knowledge**:
  - Any `comparativeAttributes` with `kind === 'observed'` or `'inferred'`
  - Presence of `comparativeConstraints[]` or `comparativeOrderings[]`
  - `phases[].startup.duration`, `phases[].active.duration`, or `phases[].recovery.duration` are missing or approximate values
  - `MoveOutcomeEffect` uses ranges, notes, or observed patterns

**Inference rules**: Implementations should compute knowledge state at query time from field presence and value completeness rather than trusting a stored `knowledgeStatus` field.

### Verification Tracking

- Each entity can have `verification?: VerificationSectionMap`
- Tracks section-by-section verification status (unknown, observed, verified-current, needs-review, etc.)
- Allows partial verification (e.g., startup frames verified but active frames still measured)

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

### Comparative Data Model (Legacy)

For games without exact frame data, comparative analysis enables research:
- `ComparativeAttribute`: relative value (startup is "faster" than another move)
- `ComparativeConstraint`: pairwise relationships (move A is shorter than move B)
- `ComparativeOrdering`: group ordering (these 5 moves have the same startup in this order)

Comparative data sharing context (private guide vs shared community) is inferred from entity ownership and publication history.

**Note**: Modern approach uses `DataValue` pattern with relative positioning on discovered bounds instead of abstract comparative relationships.

### Combo Scaling & Meta-Mechanics

- `ComboScalingSystem` defines how game-wide scaling works
- Individual moves define `comboScalingEffects` per phase (hitstun/damage modifiers, prorating, resets, etc.)
- `SequenceDifficulty` computes execution difficulty from sequence length, timing strictness, and input complexity

### Projectile System

- Moves with `ProjectileProfile` define projectile behavior (motion, destruction, clash rules)
- Supports varied projectile types: fixed-forward, arc, homing, stationary, custom
- Durability tracked as: priority, points, or hybrid
- Clash results capture relative matchups against other projectiles

### Stage Design

Stages have:
- Comparative stage properties (size, elevation, walk speed impact, etc.)
- Zone definitions for wall/floor/ceiling interactions and positioning reference
- Stage zones link to universal stage zones for cross-game comparison

### Team & Sequence Tracking

- Teams group characters with sequence-specific knowledge
- Team sequences and universal sequences enable team-specific routing
- Matchups track character-vs-character dynamics with specific routing and anti-strategy info

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
- Multiple test results (observed vs measured vs verified) can be published for the same move
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

## Version Management

All entities include `guideVersion: GuideVersionReference` to:
- Track which game version a guide targets (`targetVersion: 'latest' | string`)
- Lock guides to specific versions (`isVersionLocked`)
- Detect staleness (`isOutOfDate`)
- Support version-aware queries and cross-version analysis
