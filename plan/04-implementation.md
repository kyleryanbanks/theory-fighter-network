# Implementation Roadmap

Pre-implementation gates and 16-phase development plan.

## CFN-Informed Mechanics (Gaps Solved) ✅

The following model gaps identified from Capcom CFN mechanics documentation have been resolved:

- ✅ **Hitstun/Blockstun** — Modeled as `effects.onHit.opponent.stun` and `effects.onBlock.opponent.stun` (implicit type from parent outcome)
- ✅ **Hit Stop Timing** — Modeled as `effects.onHit.hitStop` and `effects.onBlock.hitStop` at MoveOutcomeEffect root
- ✅ **Cancel Windows and Restrictions** — Cancel timing via `PhaseCancelRule.windowStartFrame/windowEndFrame`; cancel restrictions via target move `preconditions` (no duplication; state always checked on target move)
- ✅ **Pushback and Spacing** — Modeled via `effects.opponent.positional.displacement`; combo feasibility requires both timing (hitstun ≥ startup) AND spacing (position + displacement ≤ range)
- ✅ **Duration Units and Framerate** — `DataValue.unit` field defaults to frames; `GameDocument.frameRate` enables conversion; users measure durations however they can (watch duration in seconds = progressive documentation)
- ✅ **Multi-hit Moves** — Two approaches supported: sequential phases (per-hit variation) or multiple hitboxes in single phase (simultaneous hits)
- ✅ **Attack Height Classification** — Handled via state model: `states.attacks` contain attack type definitions (low/mid/high) as named states with optional descriptive properties

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
   - Dual-mode deterministic/observational viability with evidence-level labeling (`observed` | `measured` | `verified`).
6. Crash recovery/versioning:
   - Restore to same version draft.
   - Latest-target guides are the default; version-locked branching is supported with clear version labels in community views.
   - `latest` resolves to a concrete game version for convergence and stale-guide detection.
7. Firestore reads:
   - Curated latest most-aligned exact variant by default; contradictory variants and history are explicit.
8. Suggestions:
   - Suggestions unlock progressively across phases: foundation -> universal systems -> roster -> move connectivity -> move balance -> move details -> sequences -> matchups.
9. File compatibility:
   - `.tfn` files carry a required schema version.
   - The app supports forward migration from older schema versions and refuses unknown future schema versions.
10. Verification:
   - Verification is tracked per field/section, not only per guide.
   - Users must be able to see exactly which parts of a guide are stale after a patch.
11. Team configuration:
   - Character guides define available assists/loadouts.
   - Team guides declare the specific assist/loadout/order selections actually chosen for a team context.
12. Determinism via semantic identity:
   - Semantic keys are computed only from identity fields and are immutable to gameplay values or metadata changes.
   - Resolving a move by `moveSemanticKey` + consistent `gameStateContext` always produces the same outcome.
   - This enables deterministic sequence simulation for combo feasibility checks, scenario testing, and peer-to-peer online multiplayer.
   - Scenario contexts must explicitly store `gameVersion` to maintain determinism across patches.
13. Exploratory ordering:
   - Pairwise comparative constraints are supported.
   - Grouped ordering ladders are also supported for sortable exploratory move rankings.

---

## Implementation phases

1. Finalize shared schema + local file format.
2. Implement local file import/export persistence.
3. Build private CRUD for games/stages/characters/moves/teams.
4. Build game input/trigger + player/opponent-state + resource modeling.
5. Build move connectivity editor (availability, cancels, follow-ups, opponent-state application).
6. Build universal inheritance flows — seed character movelists from game-level moves, seed stage zones from game-level zone defaults, field-level lock/override UI, global update propagation, and promote-to-inherited workflows.
7. Build comparative property ordering + inferred-bound engine.
8. Build move range profile editor and range-band-aware transition edges.
9. Build scoped combo editor (universal/character/team).
10. Implement computed combo difficulty engine.
11. Add compare/merge between local and community entities.
12. Add auth and opt-in Firestore sync/community browsing.
13. Add convergence indicators, exact-vs-exploratory labeling, version freshness warnings, and duplicate/near-duplicate linking UX.
14. Build automated exploration assistant (coverage analysis + phase-aware suggestion generation).
15. Build matchup/counter-option graph model and editor.
16. Implement curated community read paths + required indexes/security rules.
