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

/games/{gameId}/universal-combos/{comboId}
/characters/{characterId}/combos/{comboId}
/games/{gameId}/teams/{teamId}
/games/{gameId}/teams/{teamId}/combos/{comboId}
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

### Comparative Data Model

For games without exact frame data, comparative analysis enables research:
- `ComparativeAttribute`: relative value (startup is "faster" than another move)
- `ComparativeConstraint`: pairwise relationships (move A is shorter than move B)
- `ComparativeOrdering`: group ordering (these 5 moves have the same startup in this order)

Comparative data sharing context (private guide vs shared community) is inferred from entity ownership and publication history.

### Combo Scaling & Meta-Mechanics

- `ComboScalingSystem` defines how game-wide scaling works
- Individual moves define `comboScalingEffects` per phase (hitstun/damage modifiers, prorating, resets, etc.)
- `ComboDifficulty` computes execution difficulty from combo length, timing strictness, and input complexity

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

### Team & Matchup Tracking

- Teams group characters with combo-specific knowledge
- Team combos and universal combos enable team-specific routing
- Matchups track character-vs-character dynamics with specific routing and anti-strategy info

### Community & Convergence

- Guides can be published to community with `publishHistory[]` (communityId tracking)
- `GuideDocument` tracks which characters/moves/combos are published from a guide
- `ConvergenceState` aggregates community data (aligned records, contradictions, distinct contributors)
- Exact vs exploratory classification is inferred from data agreement and contradiction patterns

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
- Enable convergence tracking across versions
