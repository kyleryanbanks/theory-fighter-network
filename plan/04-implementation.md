# Implementation Plan — Priority-Ordered Roadmap

## Overview

This roadmap restructures development around agreed priority order. The work is organized into **5 priority tiers**, each containing concrete phases with clear scope and dependencies.

**Current State**: Models are mature and documented. Data structures for all entities (GameDocument, MoveDocument, CharacterDocument, etc.) are defined with semantic keying, resource scaling, and community metadata already in place.

**Approach**: Phases are grouped by priority tier. Within each tier, phases are ordered by dependency (foundations first). Each phase lists concrete deliverables and validation criteria.

---

## Current Implementation Status (2026-08-15)

Commit history since this roadmap was last updated confirms the following:

- **Phase 1.1 is complete.** The local guide metadata model, schema-version validation, unsaved/synced tracking, browser and Node directory persistence, `.tfn` archive creation/parsing with integrity checks, and the import/export CLI are implemented and covered by unit tests.
- **Phase 1.3 is partially complete.** The v1 JSON `.tfn` archive format has a header, deterministic checksum, entity ordering, date hydration, and Node atomic folder writes. Forward migrations, a formal format specification, and atomic archive-file writes remain open.
- **Phase 1.2 and Phases 1.4-1.7 are not complete.** The document schemas and model factories exist, but Game CRUD/validation/key generation and hierarchy authoring workflows have not been implemented.

### Completed Supporting Work Not Previously Captured Here

- Nx `data`, `feature`, and `ui` libraries were created, and the application now hosts the feature shell instead of the generated welcome screen.
- `LocalGuideFacadeStore` provides workspace lifecycle orchestration, including creation, save, import, and export, and the feature shell exposes those operations.
- Primary persisted models and direct nested model types now have colocated `createX` factories with tested defaults and override behavior.
- Guide persistence was separated from model definitions into a `guide/` domain with a nested `guide/archive/` module. Guide factory/mutation, archive service, checksum, and serialization behavior each have focused unit coverage.

---

## Priority 1: Local-First Core + Hierarchy

These phases establish the offline foundation. All features are local-only; no network/community features.

### Phase 1.1: Local Guide Foundation
**Status: Complete (2026-08-15).**
**Scope**: Build the guide.json metadata layer and local file I/O pipeline.

**Deliverables**:
- `guide.json` schema: gameKey, schemaVersion, lastModified, localChanges[], syncedChanges[], unsavedStatus per entity
- Local file structure: `.tfn` save format with version header and integrity validation
- File import/export CLI: Load guide.json + entity files → in-memory GameDocument + child entities
- Unsaved/synced tracking: Mark entities as `unsaved` after edits, `synced` after save
- Schema version registration and forward-compatibility checks

**Validation**: Load/save round-trip preserves all data; schema version mismatch is caught with clear error message

---

### Phase 1.2: Game Creation Root (Local CRUD + Validation)
**Status: Partially complete (2026-08-15).** Game creation derives a deterministic semantic key from normalized name and major-version family, validates required fields and duplicate input values, and supports local metadata updates that preserve identity and mark the guide unsaved. The feature shell supports creation and metadata editing. Input-vocabulary editing and an explicit identity-change workflow for game name/version remain.
**Scope**: Build GameDocument local CRUD operations and validation rules.

**Deliverables**:
- GameDocument creation: Initialize with name, version, frameRate, is3d, teamSize, inputs
- GameDocument validation: Semantickey integrity, required fields, input vocabulary uniqueness
- GameDocument local edits: Update metadata, frameRate, dimensions, inputs
- Semantic key generation: Hash(normalizedGameName + versionFamily) for canonical identity
- Version family detection: Extract from version string (e.g., "1.0" → "1.x" family)

**Validation**: Create game → verify semanticKey stability; update game metadata → semanticKey unchanged; invalid inputs rejected

**Depends on**: Phase 1.1

---

### Phase 1.3: .tfn Save/Load Pipeline (Locked Structure + Migration)
**Status: Partially complete (2026-08-15).** The v1 archive header, checksum validation, serialization, parsing, and folder persistence are implemented. Forward migrations and atomic `.tfn` archive-file writes remain.
**Scope**: Build the locked file format and forward-only migration system.

**Deliverables**:
- `.tfn` format specification: Binary or JSON with version header, checksums, entity order
- Save pipeline: GameDocument → guide.json + entity files; write atomically to `.tfn`
- Load pipeline: `.tfn` → validate header + schema version → deserialize entities
- Forward-only migration: Accept v1 → v2 migrations; reject v2 files in v1 client
- Unknown schema rejection: If schemaVersion > current client version, fail with instruction to upgrade
- Integrity validation: Checksums verify file not corrupted between saves

**Validation**: Save → Load → Compare == original; forward-migration works; downgrade attempt fails gracefully

**Depends on**: Phase 1.1, 1.2

---

### Phase 1.4: Entity Hierarchy Foundation (Game-Level Children)
**Scope**: Build hierarchy starting from game downward: universal stage zones, stages + inheritance, universal sequences.

**Deliverables**:
- Universal stage zones: StageZoneDocument with `stageKey: null` (game-level, inherited by all stages)
- Stage creation/CRUD: StageDocument with gameKey, name, semanticKey
- Inherited zones: StageZoneDocument with `stageKey: <stageId>` + optional `inheritedFromZoneKey`
- Universal sequences: SequenceDocument with `characterKey: null, teamKey: null` (game-level, inherited by all)
- Inheritance UI: Show inherited fields with lock/override UI; changes to parent propagate to unlocked children
- Promote-to-inherited workflow: Move character-scoped sequence → game-scoped (if applicable)

**Validation**: Game zones visible to all stages; stage zones override game zones where applicable; sequences inherit correctly

**Depends on**: Phase 1.2

---

### Phase 1.5: Character Branch (Characters, Moves, Sequences)
**Scope**: Build character entity hierarchy: character creation, move CRUD, character-scoped sequences.

**Deliverables**:
- CharacterDocument creation: Initialize with gameKey, name, archetypes, states (inherit from game)
- Character-scoped moves: MoveDocument with gameKey + characterKey; inherit game-level moves
- Move CRUD: Create, edit, delete moves; validate preconditions and phases
- Move input parsing: Convert button/direction sequences to canonical input representation
- Character-scoped sequences: SequenceDocument with gameKey + characterKey
- Inheritance chains: Show parent game moves/sequences; highlight overrides

**Validation**: Character inherits game moves; local overrides don't affect parent; semanticKeys stable across edits

**Depends on**: Phase 1.2, 1.4

---

### Phase 1.6: Team Branch (Teams, Sequences)
**Scope**: Build team entity hierarchy: team creation, team-scoped sequences.

**Deliverables**:
- TeamDocument creation: Select ordered list of CharacterDocuments; compute semanticKey from character order
- Team-scoped sequences: SequenceDocument with gameKey + teamKey
- Assist/loadout scoping: Team values override character values for assist/loadout selection
- Team validation: All characters must exist in game; order preserved in semanticKey

**Validation**: Create team → verify all characters exist; reorder team → semanticKey updates

**Depends on**: Phase 1.5

---

### Phase 1.7: Matchup Branch (Matchups + Scenario/Response Trees)
**Scope**: Build matchup entities and scenario/response decision trees.

**Deliverables**:
- MatchupDocument creation: Pair character1/character2 from same game
- Scenario definition: GameStateContext (players' states, resources) + test conditions
- Response tree: Branch decision tree where each node represents opponent state → user's available moves
- Scenario/response CRUD: Create, edit delete scenarios and response paths
- Navigation: Query matchup → select scenario → explore response tree
- Scenario validation: GameStateContext is valid for associated characters

**Validation**: Matchup requires both characters; scenarios have consistent game version; response tree is acyclic

**Depends on**: Phase 1.6

---

## Priority 2: Highest-Priority Advanced Feature

### Phase 2.1: Comparative Property Ordering + Inferred-Bound Engine
**Scope**: Build the data analysis engine for property ordering and bound inference.

**Deliverables**:
- Comparative property ordering: Rank moves by properties (damage, startup, range) using DataValue.relative
- UI: Full-screen multi-move range comparison; set DataValue.relative for each move
- Inferred-bound engine: Analyze per-hit damage sequences → infer scaling factors → suggest scaling bounds
- Bound validation: Check suggested bounds against move effects; highlight conflicts
- Damage scaling discovery: User enters per-hit damage → TFN extracts % reduction per hit → suggests bounds
- Scaling curve visualization: Graph showing inferred damage reduction over sequence

**Validation**: Comparative ordering produces consistent rankings; inferred bounds match empirical data within tolerance

**Depends on**: Phase 1.5 (moves must exist)

---

## Priority 3: Included Local Authoring/Analysis Features

### Phase 3.1: Move Connectivity Editor
**Scope**: Build comprehensive move effects and connectivity UI.

**Deliverables**:
- Move phase editor: Create/edit/delete phases with duration, startup, active, recovery FrameStages
- Collision box editor: Visual/numeric editor for hitBoxes, hurtBoxes, collisionBoxes, throwBoxes (Region objects)
- Move outcome effects: Define effects on hit, block, guard (opponent stun, damage, resources, positional)
- Resource effect UI: Select resource → choose modification mode (delta/multiply/exact/amount) → set value
- Cancel window UI: Define cancels from this move; set windowStartFrame/windowEndFrame on target moves
- Precondition UI: Set required/forbidden player state, required opponent state, cancel/follow-up restrictions
- Effect validation: Highlight resources defined in game config; warn on undefined resources

**Validation**: All phases have duration; collision boxes are valid; effects reference defined resources

**Depends on**: Phase 1.5, 2.1

---

### Phase 3.2: Full-Screen Multi-Move Range Comparison
**Scope**: Build visual comparison tool for move ranges with relative positioning.

**Deliverables**:
- Range profile UI: Display multiple moves side-by-side; show hitBox/hurtBox/collisionBox visually
- Relative positioning: Set DataValue.relative for each move's range properties
- Visual range bands: Highlight range bands (close, mid, far) for quick comparison
- Transition edges: Show which moves connect at different ranges
- Scaling visualization: Show how range changes with game-level zone modifiers (if applicable)

**Validation**: Visual and numeric representations match; relative values normalize to 0-100%

**Depends on**: Phase 3.1

---

### Phase 3.3: Promote-to-Inherited Workflow (Moves/Zones)
**Scope**: Build UI for promoting character-scoped entities to game-scoped.

**Deliverables**:
- Promote move: Character move → game move; update all character references to inherit
- Promote zone: Stage zone → game zone; update all stage references to inherit
- Conflict detection: Warn if multiple characters have identical moves (candidate for promotion)
- Undo/rollback: Revert promotion; restore character-scoped versions
- Impact analysis: Show which entities will be affected by promotion

**Validation**: Promoted entity becomes game-level; character references update; no data loss

**Depends on**: Phase 1.4, 1.5

---

### Phase 3.4: Scoped Combo Editor with Scaling Validation
**Scope**: Build combo authoring UI with real-time scaling and feasibility checks.

**Deliverables**:
- Combo creation: Select moves in sequence (universal, character, or team scope)
- Real-time validation: Apply move1 effects → resolve resources → check move2 timing and spacing
- Scaling visualization: "After move 1, hitstun = X frames; move 2 needs Y startup"
- Hitstun tracking: Show scaled hitstun after each move; highlight when hitstun ≤ next move startup
- Spacing validation: Show positions after each move; warn if spacing exceeds next move's range
- Difficulty inference: Suggest difficulty based on scaling tightness and window sizes
- Scope selector: Edit at universal (game), character, or team level; visualize inheritance

**Validation**: Combos pass feasibility checks at current game state; infeasible combos flagged with reasons

**Depends on**: Phase 1.7, 3.1, 2.1

---

### Phase 3.5: Automated Exploration Assistant
**Scope**: Build intelligent suggestions for missing/incomplete data.

**Deliverables**:
- Coverage analysis: Scan game → identify missing moves, moves with incomplete data, untested sequences
- Phase-aware suggestions: "You have 3 hit combos; try X-hit combos" based on observed patterns
- Damage scaling discovery: "You've entered per-hit damage for 3 sequences; scaling appears to be -10%"
- Bound suggestions: "Set damage-scaling bounds to 25-100% based on data"
- Mobile data collection hints: "Next move to test: X (you have 5 test results for move Y)"
- Priority ranking: Suggest highest-impact data (missing core moves before optional properties)
- Learning curve: Remember user's previous inputs; suggest compatible properties next time

**Validation**: Suggestions are actionable; coverage analysis accurately counts missing/incomplete data

**Depends on**: Phase 2.1, 3.1

---

### Phase 3.6: Matchup/Counter-Option Graph Model + Editor
**Scope**: Build matchup decision trees and counter-option visualization.

**Deliverables**:
- Graph model: Nodes = game states; edges = available moves → outcomes
- Scenario trees: Navigate scenario → opponent state → available moves → outcomes
- Counter graph: Highlight move chains that beat opponent options
- Visual graph editor: Drag-drop nodes, connect edges, label transitions
- Graph queries: "What beats this opponent string?" → highlight counter-moves
- Convergence view: Compare user's graph against community graphs; show differences
- Graph validation: Ensure no contradictory edges; warn on incomplete scenarios

**Validation**: Graph is acyclic for turn-based; counter-queries return correct moves; queries complete in <100ms

**Depends on**: Phase 1.7, 3.1

---

### Phase 3.7: Scenario Testing with Web Controller API
**Scope**: Build UI for testing scenarios against simulated/real opponents.

**Deliverables**:
- Web Controller API integration: Send scenario + user's combo → simulate opponent reaction
- Test scenario creation: Define opponent's starting state and respond patterns
- Test result recording: Compare expected vs. actual outcome; record video/frames for analysis
- Batch testing: Queue multiple scenarios; run tests in background
- Result visualization: Show pass/fail breakdown; highlight failure patterns
- Determinism verification: Run same scenario twice → verify identical outcomes

**Validation**: Test results are repeatable; API calls succeed and return expected data format

**Depends on**: Phase 3.4

---

### Phase 3.8: Local Recovery Snapshot + Crash-Restore UX
**Scope**: Build auto-save and crash recovery features.

**Deliverables**:
- Auto-snapshot: Periodic snapshots of guide.json + all entities (e.g., every 5 minutes)
- Snapshot versioning: Store 10 most recent snapshots with timestamps
- Crash detection: On startup, check for incomplete save from previous session
- Restore UI: "Last save crashed. Restore from backup?" with timestamp selection
- Diff viewer: Show what would be restored; allow selective restoration
- Atomic saves: Ensure writes to `.tfn` are atomic (all-or-nothing)

**Validation**: Snapshots are valid; restored state matches snapshot; atomic saves don't partially corrupt files

**Depends on**: Phase 1.3

---

## Priority 4: Included Sharing/Community Foundation

### Phase 4.1: Peer-to-Peer Sharing Workflow
**Scope**: Build local peer-to-peer export/import for sharing game data.

**Deliverables**:
- Export for sharing: Bundle game + selected entities into portable `.tfn` file with user metadata
- Share metadata: Include author name, version notes, date shared
- Import from peer: Load peer's `.tfn` → merge with local guide using semantic keys
- Duplicate detection: Identify identical entities (same semanticKey) across peer copies
- Merge conflict UI: When peer has different version of same entity, show diff and allow selection
- Trust model: Mark peer-imported entities with source author and import date

**Validation**: Exported guide is valid and complete; imported guide merges without corrupting local state

**Depends on**: Phase 1.3, 1.7

---

### Phase 4.2: Local/Community Compare-Merge Workflow
**Scope**: Build UI for comparing and merging local vs. community variants.

**Deliverables**:
- Compare view: Side-by-side local vs. community entity (same semanticKey)
- Diff highlighting: Show which fields differ; highlight significant changes (move startup, damage) vs. minor (notes)
- Merge options: Keep local, accept community, or manual field-by-field merge
- Variant tracking: Store merge history; mark merged entities as "convergent" if no local changes remain
- Batch merge: Apply merge strategy to multiple entities at once
- Convergence detector: Highlight when local and community versions align

**Validation**: Merges preserve both versions if needed; convergence detection is accurate; no data loss

**Depends on**: Phase 4.1

---

### Phase 4.3: Safe Serializable State Behaviors (FEEL Migration)
**Scope**: Replace temporary raw JavaScript state behavior execution with serializable FEEL expressions before behavior data can enter Firestore or other untrusted sharing paths.

**Current temporary implementation**:
- `StateDocument.behavior` stores JavaScript function bodies as strings.
- `StateBehaviorRegistry` executes those strings with the JavaScript `Function` constructor.
- This path is intentionally trusted-user/local-only and is not a security boundary.
- Imported or community-provided JavaScript behavior must not execute automatically.

**Deliverables**:
- FEEL integration: Add the maintained `feelin` parser/interpreter and remove `Function`-constructor execution.
- Serializable expressions: Store `onUpdate` and `onFrameAdvance` FEEL expressions directly in state documents.
- Restricted evaluation context: Expose only plain JSON state and incoming effect data; expose no DOM, network, storage, or application functions.
- Patch result contract: Require expressions to return `RuntimeStatePatch`-compatible data rather than a complete mutable context.
- Patch validation: Reject unknown categories, unknown state keys, invalid value types, prototype-related keys, and non-JSON values before applying results.
- Deterministic application: Preserve preferred state execution order and pass each validated result into the next registered frame behavior.
- Error reporting: Convert FEEL parser and evaluation warnings into field-level authoring feedback and actionable runtime errors.
- Performance benchmark: Measure 10, 50, and 100 frame behaviors over representative simulation lengths in browser and SSR environments.
- Performance mitigation: Cache behavior registration metadata and determine whether repeated FEEL parsing meets frame simulation targets; isolate or replace the evaluator if it does not.
- Migration: Convert existing trusted JavaScript examples and local behavior documents to FEEL expressions, including the Tokon style-scaling behavior.
- Trust handling: Preserve unknown or invalid behavior expressions without executing them, and require explicit user review after import.

**Validation**: Tokon style scaling and representative frame/update behaviors produce validated patches; expressions cannot access browser/application globals; malformed or invalid patches are rejected; deterministic execution tests remain green; benchmark results meet the agreed simulation budget.

**Depends on**: Phase 4.1, 4.2 and the local simulation behavior implemented in Phases 3.4 and 3.7

---

## Priority 5: Included Firestore/Community Work

### Phase 5.1: Auth + Opt-In Firestore Sync/Community Browsing
**Scope**: Build authentication and cloud sync infrastructure.

**Deliverables**:
- Firebase auth: Email/password or OAuth login
- Opt-in sync: User toggle to enable/disable Firestore sync
- Sync strategy: Push local entities → Firestore; pull community entities on demand
- Cloud guide index: Firestore collection of published guide.json references
- Community browser UI: Search games, characters, moves; browse published guides
- Sync status: Show which entities are synced vs. local-only
- Offline mode: App works fully offline; sync happens when connection available

**Validation**: Auth works across sessions; sync is optional; app functions offline; community browser displays correct data

**Depends on**: Phase 4.1, 4.2, 4.3

---

### Phase 5.2: Convergence/Variant UX
**Scope**: Build UI for displaying convergence and variants in community context.

**Deliverables**:
- Convergence indicator: Show when local/community entities are aligned
- Variant browsing: Display different community versions of same move/combo (e.g., multiple interpretations)
- Version timeline: Show how community entity evolved over time
- Variant merging: Merge multiple community variants into synthesis
- Conflict labeling: Mark contradictory data in community (e.g., two different damage values)
- Trust scoring: Sort variants by community consensus or author reputation

**Validation**: Convergence detection aligns with manual inspection; variants display correctly; merges are sensible

**Depends on**: Phase 5.1

---

### Phase 5.3: Curated Community Read Model + Indexes/Security Rules
**Scope**: Build Firestore indexes and security rules for community browsing and curation.

**Deliverables**:
- Read model schema: Optimized Firestore collections for community browsing (games → moves, characters, combos)
- Indexes: Composite indexes for common queries (game + character, game + move, damage range)
- Security rules: Users can read published entities; write only to own entities; curators can promote variants
- Curator role: Designated users can flag variants as "canonical" or "common alternative"
- Unpublish rules: Users can unpublish own entities; curators can remove harmful content
- Audit log: Track publish/unpublish/curation actions for transparency

**Validation**: Indexes enable queries to complete in <1s; security rules prevent unauthorized writes; audit log records all actions

**Depends on**: Phase 5.1

---

### Phase 5.4: Granular Publish Workflow
**Scope**: Build fine-grained entity publishing and community discovery.

**Deliverables**:
- Publish options: Publish individual entities or entire guides at specific scope
- Publish scoping: Entity can be published as universal (game-level), character-scoped, or team-scoped
- Versioning: Published entities retain gameVersion and schema version
- Unpublish: Remove entity from community (mark as deprecated with reason)
- Publish history: Track publish/unpublish timeline for version recovery
- Discovery: Featured guides, trending moves, recent publications
- Notification: Users notified when their entities receive community feedback/variants

**Validation**: Published entities appear in community browser within 5s; unpublish removes them; history is auditable

**Depends on**: Phase 5.2, 5.3



---

## Implementation Strategy

1. **Local-first approach** (Priorities 1-3): Build complete offline functionality first. No network dependencies; all features work without internet.
2. **Dependency ordering within tiers**: Earlier phases provide foundations for later phases. Phases can be parallelized within a tier if dependencies are met.
3. **Validation-first design**: Each phase includes clear validation criteria to ensure completeness before moving forward.
4. **Iterative community features** (Priorities 4-5): Once local features are solid, add community/cloud incrementally with opt-in toggles.
5. **Backward compatibility**: Forward-only migration ensures users can load old files; clients never downgrade schema versions.
