# Implementation Roadmap

Pre-implementation gates and 16-phase development plan.

## Recent Model Updates ✅

The following model and workflow updates have been documented and are ready for implementation:

- ✅ **Scaling as Resources** — Scaling systems (damage scaling, hitstun scaling) are now game-configurable resources in `StateModel.resources` with bounds and initial values
- ✅ **Resource Effects** — Move effects can now modify resources via four modes: `delta` (change by %), `multiply` (scale), `exact` (reset), or `amount` (legacy gain/spend)
- ✅ **Hitstun Scaling in Combo Feasibility** — Query-time validation applies previous move's effects → resolves scaled hitstun → checks next move feasibility
- ✅ **Hitstun as Combo Resource** — Hitstun grant → cost per startup → scaled by effects → minimum bounds force combo end
- ✅ **Hit Counter System** — Alternative scaling: increment counter per hit, trigger forced knockdown at threshold
- ✅ **Damage Scaling Discovery Workflow** — Users capture per-hit damage → TFN infers scaling factors → suggests bounds → validates future sequences
- ✅ **Semantic Key Usage** — Move outcomes determined by `moveSemanticKey` + `gameStateContext` for deterministic simulation
- ✅ **Scenario-Based Testing** — TFN Web Controller API drives opponent to validate user-created scenarios
- ✅ **Mobile Data Collection** — Phone-optimized UI for quick entry; desktop sync for real-time data population

**Documentation**: All updates documented in [plan/02-data-model.md](./02-data-model.md) and [plan/03-workflows.md](./03-workflows.md) with examples and rationale.

---

## CFN-Informed Mechanics (Gaps Solved) ✅

The following model gaps identified from Capcom CFN mechanics documentation have been resolved:

- ✅ **Hitstun/Blockstun** — Modeled as `effects.onHit.opponent.stun` and `effects.onBlock.opponent.stun` (implicit type from parent outcome); can be modified by scaling resources
- ✅ **Hit Stop Timing** — Modeled as `effects.onHit.hitStop` and `effects.onBlock.hitStop` at MoveOutcomeEffect root
- ✅ **Cancel Windows and Restrictions** — Cancel timing via `PhaseCancelRule.windowStartFrame/windowEndFrame`; cancel restrictions via target move `preconditions` (no duplication; state always checked on target move)
- ✅ **Pushback and Spacing** — Modeled via `effects.opponent.positional.displacement`; combo feasibility requires both timing (hitstun ≥ startup AND scaling applied) AND spacing (position + displacement ≤ range)
- ✅ **Duration Units and Framerate** — `DataValue.unit` field defaults to frames; `GameDocument.frameRate` enables conversion; users measure durations however they can (watch duration in seconds = progressive documentation)
- ✅ **Multi-hit Moves** — Two approaches supported: sequential phases (per-hit variation) or multiple hitboxes in single phase (simultaneous hits)
- ✅ **Attack Height Classification** — Handled via state model: `states.attacks` contain attack type definitions (low/mid/high) as named states with optional descriptive properties
- ✅ **Damage Scaling** — Modeled as `StateModel.resources` with bounds; move effects modify scaling via `ResourceEffect` with delta/multiply/exact modes
- ✅ **Hitstun Scaling (Percentage-based)** — Each hit reduces hitstun by %: `opponent.resources.hitstun *= 0.9` per hit until minimum bound
- ✅ **Hit Counter (Alternative Scaling)** — Some games use counter instead of duration: `opponent.resources.hitCount++` triggers forced knockdown at threshold

**Documentation**: All gaps documented in [plan/02-data-model.md](./02-data-model.md) with examples and rationale.

---

## Ready-to-implement gate (local-first offline features)

These are locked design decisions for Phases 1-10 (offline, local-first). Community 
and cloud features (Phases 11-14) have separate planning documents.

1. **Canonical identity via semantic keys** ✅ IMPLEMENTED
   - Games/characters: Hash(canonicalName + versionFamily)
   - Moves: Hash(gameSemanticKey + characterSemanticKey + inputFrames + preconditions)
   - Aliases supported for display without changing canonical identity
   - Enables deterministic move resolution: same key + context = same outcome

2. **Range modeling (local features)**
   - Move range documented via DataValue: `{ exact: 150 }` (precise) or `{ relative: 75 }` (estimate)
   - Range bands for grouping: `short` | `medium` | `long` | `fullscreen`
   - Stored in sequences via `selectedRangeBandKeys`
   - Note: Comparative move ordering (Phase 7) is separate

3. **Scaling as state resources** ✅ LOCKED IN
   - Damage scaling, hitstun scaling: Game-configurable resources in `StateModel.resources`
   - Resource bounds: `{ min, max, initialValue }` defined per game
   - Resource effects: Move effects modify resources via four modes
    - `delta`: Change by amount (e.g., reduce scaling by 10%)
    - `multiply`: Scale by factor (e.g., scale hitstun to 90%)
    - `exact`: Set to value (e.g., reset scaling to 100%)
    - `amount`: Legacy gain/spend (e.g., add 20 to meter)
   - Query-time combo feasibility: Apply move1 effects → resolve resource state → check move2
   - Validation: Resources referenced in effects must exist in game.states.resources

4. **Determinism via semantic identity** ✅ IMPLEMENTED
   - Same `moveSemanticKey` + `gameStateContext` always produces same outcome
   - Enables: Deterministic sequence simulation, scenario testing, peer-to-peer sync
   - `gameVersion` stored in scenario contexts for cross-patch determinism
   - Critical: Move effects on resources must be deterministic; same state → same modifications

5. **Schema versioning and file compatibility**
   - `.tfn` files carry required schema version
   - App supports forward migration from older schema versions
   - App refuses unknown future schema versions
   - Per-entity tracking: `validatedVersion` field tracks last tested game version

6. **Field-level verification tracking** ✅ IMPLEMENTED
   - Verification tracked per field/section, not per guide only
   - Users can see exactly which parts are stale after patches
   - Scaling bounds documented via DataValue pattern
    - `{ exact: 100 }` = verified from testing
    - `{ relative: "25-50%" }` = inferred from empirical data

7. **Team and character scope semantics** ✅ IMPLEMENTED
   - Character guides define available assists/loadouts
   - Team guides declare specific assist/loadout/order selections for team context
   - Team values override character values (explicit scoping)

8. **Determinism in multi-user scenarios** ✅ LOCKED IN
   - Two users with same game + moves + sequence = same combo outcome
   - Peer-to-peer sync enabled by semantic identity
   - No convergence/consensus needed; each user can have local variants
   - Publishing publishes variants, not forcing convergence

---

## Community & Cloud Gates (Phases 11-14)

To be planned separately in phase-specific documents:

- **Phase 11 gates**: Compare/merge between local and community entities
- **Phase 12 gates**: Firestore reads, auth, cloud sync decisions
- **Phase 13 gates**: Convergence thresholds, variant alignment, contradictory labeling
- **Phase 14 gates**: Progressive suggestion UI strategy

---

## Implementation phases

1. Finalize shared schema + local file format.
2. Implement local file import/export persistence.
3. Build private CRUD for games/stages/characters/moves/teams.
4. **Build game input/trigger + player/opponent-state + resource modeling.**
   - *Updated scope*: Includes defining `StateModel.resources` with bounds/initial values
   - Query-time resource state resolution (apply effects → resolve bounds → check feasibility)
5. **Build move connectivity editor (availability, cancels, follow-ups, opponent-state application, resource effects).**
   - *New*: Resource effect UI (select resource → choose modification mode → set value)
   - Validation: highlight resources defined in game config
6. Build universal inheritance flows — seed character movelists from game-level moves, seed stage zones from game-level zone defaults, field-level lock/override UI, global update propagation, and promote-to-inherited workflows.
7. Build comparative property ordering + inferred-bound engine.
   - *Updated*: Include scaling bound inference from per-hit damage data
8. Build move range profile editor and range-band-aware transition edges.
9. **Build scoped combo editor (universal/character/team) with scaling validation.**
   - *Updated*: Query-time validation applies previous move effects → checks timing with scaled hitstun
   - Visualize scaling impact: "After move 1, hitstun = X frames; move 2 needs Y startup"
10. **Implement computed combo difficulty engine with resource scaling.**
   - *Updated*: Includes difficulty from hitstun scaling tightening windows
   - Scaling complexity: "Scaling reduces hitstun by 10% per hit, making later moves tighter"
11. Add compare/merge between local and community entities.
12. Add auth and opt-in Firestore sync/community browsing.
13. Add convergence indicators, exact-vs-exploratory labeling, version freshness warnings, and duplicate/near-duplicate linking UX.
14. **Build automated exploration assistant (coverage analysis + phase-aware suggestion generation, damage scaling discovery).**
   - *New*: Damage scaling helper: "You've entered per-hit damage for 3 sequences; scaling appears to be -10% per hit"
   - Suggest bounds: "Set damage-scaling bounds to 25-100% based on data"
   - Mobile data collection suggestions: "Next move to test: X (you have 5 test results for move Y)"
15. Build matchup/counter-option graph model and editor.
16. Implement curated community read paths + required indexes/security rules.
