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

### Data-Driven Knowledge Inference

**Philosophy**: Minimize maintenance burden by inferring derived state from actual data rather than storing it explicitly.

**Knowledge classification** (exact vs exploratory) is inferred from data:
- **Exact move knowledge**: 
  - All `comparativeAttributes` have `kind === 'exact'` or `'measured'`
  - No `comparativeConstraints` or `comparativeOrderings` present
  - All `phases[].frameData` fields fully populated (if phases exist)
  - All `MoveOutcomeEffect` fields have specific values (not conceptual/noted ranges)

- **Exploratory move knowledge**:
  - Any `comparativeAttributes` with `kind === 'observed'` or `'inferred'`
  - Presence of `comparativeConstraints[]` or `comparativeOrderings[]`
  - `phases[].frameData` has missing or approximate values
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
- `MovePhase.frameData.startup`, `active`, `recovery` — DataValue
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
