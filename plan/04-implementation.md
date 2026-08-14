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

## Ready-to-implement gate (locked defaults)

1. Canonical key policy:
   - Games/characters: exact canonical naming with guided reuse of existing community entries.
   - Moves: canonical identity based on trigger input + availability state context.
   - Aliases are supported for display without changing canonical identity.
2. Convergence thresholds:
   - Community data remains visible as variants with contributor counts.
   - Contradictory variants are explicitly labeled and remain reviewable.
   - Exploratory comparative data is shared separately and never promoted into canonical exact data.
   - Comparative slider alignment uses normalized 0-100 scales with default +/-5% tolerance before marking submissions contradictory.
3. Merge semantics:
   - Community -> private only.
   - Combo identity is ordered move sequence; timing differences create variants.
4. Range modeling:
   - Comparative entry is relative to other known moves.
   - Stored range output uses range bands, with optional future precise x/y(/z) stage-relative coordinates supported.
5. Scaling simulation:
   - **Updated**: Deterministic combo feasibility via state application: apply move1 effects → resolve resource state → check move2 feasibility
   - Scaling resources (damage scaling, hitstun scaling) modify state at query time
   - Hitstun scaling models both percentage-based (shrinks pool) and counter-based (forces knockdown at threshold)
   - Evidence-level labeling (`observed` | `measured` | `verified`) tracks certainty in scaling bounds
6. Crash recovery/versioning:
   - Restore to same version draft.
   - Latest-target guides are the default; version-locked branching is supported with clear version labels in community views.
   - `latest` resolves to a concrete game version for convergence and stale-guide detection.
7. Firestore reads:
   - Curated latest most-aligned exact variant by default; contradictory variants and history are explicit.
8. Suggestions:
   - Suggestions unlock progressively across phases: foundation -> universal systems -> roster -> move connectivity -> move balance -> move details -> sequences -> matchups.
   - Damage scaling discovery suggestions: "Scaling appears to be -10% per hit, bounds 25-100%"
   - Mobile data entry suggestions: suggest next move or sequence to test based on coverage gaps
9. File compatibility:
   - `.tfn` files carry a required schema version.
   - The app supports forward migration from older schema versions and refuses unknown future schema versions.
10. Verification:
   - Verification is tracked per field/section, not only per guide.
   - Users must be able to see exactly which parts of a guide are stale after a patch.
   - Scaling resource bounds verification: user marks as verified once tested
11. Team configuration:
   - Character guides define available assists/loadouts.
   - Team guides declare the specific assist/loadout/order selections actually chosen for a team context.
12. Determinism via semantic identity:
   - Semantic keys are computed only from identity fields and are immutable to gameplay values or metadata changes.
   - Resolving a move by `moveSemanticKey` + consistent `gameStateContext` always produces the same outcome.
   - This enables deterministic sequence simulation for combo feasibility checks, scenario testing, and peer-to-peer online multiplayer.
   - Scenario contexts must explicitly store `gameVersion` to maintain determinism across patches.
   - **Critical for scaling**: Move effects on resources must be deterministic; same input state → same resource modifications
13. Exploratory ordering:
   - Pairwise comparative constraints are supported.
   - Grouped ordering ladders are also supported for sortable exploratory move rankings.
14. Resource effects:
   - **New**: Move effects can modify resources via `ResourceEffect` with multiple modes
   - `delta`: Modify by amount (e.g., `delta: -10` reduces scaling by 10%)
   - `multiply`: Multiply by factor (e.g., `multiply: 0.9` scales resource to 90%)
   - `exact`: Set to exact value (e.g., `exact: 100` resets scaling)
   - `amount`: Legacy gain/spend (e.g., `amount: 20` adds 20 to meter)
   - Validation: Resources referenced in effects must exist in `game.states.resources`

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
