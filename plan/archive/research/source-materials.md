# Source Materials & Reference Guides

## Purpose

This document catalogs authoritative source materials on fighting game design, implementation, and strategy. These materials inform our data model design and guide what information users need to capture about their games.

**Core Principle**: Theory Fighter Network's primary goal is to help players capture and reason about fighting game information at the level described in these sources.

---

## Part 1: Fighting Game Implementation & Technical Fundamentals

### Andrea Jens' "I Wanna Make a Fighting Game" Series

**Series Overview**: Comprehensive practical guide to fighting game development, covering both 2D/3D design and technical implementation details. Written from developer perspective but applicable to understanding existing games.

**When to Reference**: 
- Understanding how games actually implement collision/hit systems
- Learning what data matters for frame data and move mechanics
- Understanding character state machines and how they affect move availability
- Clarifying combo systems, hitstun, and juggle mechanics
- Understanding determinism requirements for online play

#### Part 1: 2D vs 3D Design Decisions
**URL**: https://andrea-jens.medium.com/i-wanna-make-a-fighting-game-a-practical-guide-for-beginners-part-1-2021-update-955a4672eea5

**Key Topics**:
- Engine choices (Unity, Unreal, MUGEN, etc.)
- Fundamental differences between 2D and 3D game development
- Why fighting games are harder than they appear

**Relevance to TFN**: Helps inform whether we model mechanics for 2D, 3D, or generic approach

---

#### Part 2: Design Features & Mechanics
**URL**: https://andrea-jens.medium.com/i-wanna-make-a-fighting-game-a-practical-guide-for-beginners-part-2-2021-update-cc0abeab657a

**Key Topics**:
- Combo and move cancel systems
- Projectile mechanics and balance
- Sidestep / 8-direction movement
- Game-specific mechanics (juggles, bursts, etc.)

**Relevance to TFN**: Documents which mechanics are universal vs game-specific, informing StateModel design

---

#### Part 3: Character as State Machine
**URL**: https://andrea-jens.medium.com/i-wanna-make-a-fighting-game-a-practical-guide-for-beginners-part-3-2021-update-12a04e48717a

**Key Topics**:
- Finite state machines for character behavior
- State transitions (standing → crouching → jumping, etc.)
- How states interact with move availability
- Animation frame management and state transitions

**Relevance to TFN**: Validates StateModel approach; shows why state-based architecture is foundational

---

#### Part 4: Hitboxes and Hurtboxes
**URL**: https://andrea-jens.medium.com/i-wanna-make-a-fighting-game-a-practical-guide-for-beginners-part-4-2021-update-12a04e48717a

**Key Topics**:
- **Hitboxes**: Parts of character that cause damage; only active during active frames of moves
- **Hurtboxes**: Parts of character that receive damage; usually always active unless invulnerable
- **Collision boxes**: Prevent character overlap; control spacing mechanics
- 2D implementation: manual frame-by-frame positioning
- 3D implementation: boxes attached to skeleton/model
- Ghost hits: When hurtboxes don't match sprite/model visuals
- Invulnerability: Temporary removal of hurtboxes during specific states/moves

**Relevance to TFN**: Critical for collision/hurt/throw box modeling; validates semantic approach to box definitions and state-driven activation

---

#### Part 5: Determinism & Online Multiplayer
**URL**: https://andrea-jens.medium.com/i-wanna-make-a-fighting-game-a-practical-guide-for-beginners-part-5-f049a78ddc5b

**Key Topics**:
- Determinism: repeating same inputs with same starting conditions = same outcome
- Why determinism is essential for peer-to-peer online play
- Common sources of non-determinism (floating point math, random number generators)
- Practical strategies for maintaining deterministic behavior

**Relevance to TFN**: Informs how we think about move sequences and scenario simulation; frames should always produce same outcomes given same input

---

#### Part 6: Input Buffers & Input Handling
**URL**: https://andrea-jens.medium.com/i-wanna-make-a-fighting-game-a-practical-guide-for-beginners-part-6-311c51ab21c4

**Key Topics**:
- Input buffering for complex motion inputs (quarter-circles, half-circles, etc.)
- Virtual buttons: abstraction layer between physical controller and game input
- Input frame windows and timing tolerance
- Directional input parsing (how systems distinguish between quarter-circle forward vs half-circle back)

**Relevance to TFN**: Validates why moves need `inputFrames[]` with frame-by-frame breakdowns; explains why input vocabulary must be game-defined

---

#### Part 7: Hitstun & Combo Systems
**URL**: https://andrea-jens.medium.com/i-wanna-make-a-fighting-game-a-practical-guide-for-beginners-part-7-56f32f706a46

**Key Topics**:
- **Hitstun**: Timer preventing opponent from acting after being hit
- Combo: guaranteed sequence of hits while opponent in hitstun
- Juggle: aerial hitstun lasting until character lands
- Combo scaling: reducing damage/hitstun per hit in sequence
- Counter-examples: games without combos (Divekick, HYPERFIGHT)

**Relevance to TFN**: Core to understanding sequences and combo feasibility analysis; validates DataValue for hitstun/blockstun values

---

#### Part 8: Blocking & Defense
**URL**: https://andrea-jens.medium.com/i-wanna-make-a-fighting-game-a-practical-guide-for-beginners-part-8-cb055a6e6c5b

**Key Topics**:
- Block methods: hold-back vs dedicated button
- Block heights: low, mid, high/overhead attacks
- Block stun: timer similar to hitstun but shorter
- Regional differences: 2D games favor hold-back; 3D games favor block button
- Unblockable attacks and special block rules

**Relevance to TFN**: Informs move classification and blockable/unblockable mechanics; validates state-based approach to blocking

---

## Part 2: Street Fighter Official Mechanics Documentation (Capcom CFN)

### Mr. Bug's Street Fighter Seminar Series

**Series Overview**: Official Capcom-published seminar columns by Mr. Bug (game designer/programmer) covering fundamental Street Fighter mechanics and terminology. Authoritative source for SF frame data conventions, box terminology, state systems, and cancel mechanics. More technically precise than academic texts.

**When to Reference**:
- Understanding official SF terminology and conventions
- Learning precise box definitions and how they interact
- Understanding state-based character mechanics
- Clarifying frame counting and frame advantage calculations
- Understanding cancel systems and their technical implementation
- Learning damage and stun mechanics
- Understanding combo construction and linking rules
- Understanding blocking mechanics and block height attributes

**Key Advantage Over Other Sources**: Written by an actual SF game designer with access to original implementation details; explains why systems work the way they do, not just how to use them.

---

#### Hour 1: An Overview of In-Game Time (Frames)
**URL**: https://game.capcom.com/cfn/sfv/column/112424

**Key Topics**:
- **Frame definition**: 1/60th of a second; smallest unit of game time
- Frame counting for startup, active, and recovery phases
- Two frame counting methods: duration vs. frame number at which active begins
- Why modern games use "frame number at which" method
- Reaction time ceiling: minimum ~10 frames for human response
- Common misconception: "you can see and react to 3-frame startup" (false; reaction time too slow)

**Relevance to TFN**:
- Validates DataValue pattern for frame numbers
- Explains why `startupFrame` is a fixed point, not duration
- Clarifies that frame data is about game engine timing, not human perception
- Informs scenario simulation that must respect frame-level determinism

---

#### Hour 2: Basic Rules and Knowledge #1 (Win/Loss/Health)
**URL**: https://game.capcom.com/cfn/sfv/column/130281

**Key Topics**:
- Win conditions: reduce opponent health to zero or have more health at time limit
- Health gauge as primary indicator (percentage matters when tied)
- Draw game rules differ by game (SF2 → next round; SF3 → judge decision; SF5 → both win)
- Sudden death rules vary by arcade/console settings

**Relevance to TFN**:
- Games have configurable win conditions
- GameDocument should allow defining round/match structure
- Terminal state detection requires understanding these win rules

---

#### Hour 3: Basic Rules and Knowledge: Movement
**URL**: https://game.capcom.com/cfn/sfv/column/131382

**Key Topics**:
- **8-way movement**: joystick directions map to 8 cardinal + diagonal movement
- Movement as separate from attack buttons (universal control mapping)
- Walking is most important movement tool; "you can tell a good player by their walking"
- Walking allows defensive play (not defenseless while moving)
- Walking backwards usually slower than forward
- Jumping: neutral (up) / forward jump (diagonal forward) / backward jump (diagonal back)
- Jumping creates temporary invulnerability to projectiles (waist-down)

**Relevance to TFN**:
- Character movement is distinct from attack/state system
- Walking speed is per-character attribute worth capturing
- Jump arc varies by character; important for spacing calculations
- Jumping is a distinct state with unique interactions

---

#### Hour 4: Basic Offense and Attacks
**URL**: https://game.capcom.com/cfn/sfv/column/131384

**Key Topics**:
- **Normal moves**: state-based (standing/crouching/jumping), button-based (light/medium/heavy punch/kick)
- Distance-dependent normals: close range vs. far range versions of standing normals
- **Special moves**: require joystick input + button; fixed set per character
- **Unique moves**: single direction + button (hybrid between normals and specials)
- **Throws**: close-range grab attacks; cannot be blocked; all characters have universal throw
- Attacks that use gauge systems (special resources beyond basic moves)

**Relevance to TFN**:
- Move taxonomy must distinguish: normal vs. special vs. unique vs. throw vs. gauge-using
- State-based move variants (standing LP vs crouching LP) are separate move objects
- Distance affects which normal move version activates (range-dependent dispatch)
- Throws are distinct move type with unique properties

---

#### Hour 5: Basic Defense and Blocking
**URL**: https://game.capcom.com/cfn/sfv/column/131405

**Key Topics**:
- **Blocking mechanics**: hold joystick away from opponent; automatic blocking on contact
- Block can only happen while standing or crouching (not airborne)
- **Standing block**: blocks high and mid attacks; joystick straight back
- **Crouch block**: blocks mid and low attacks; joystick down-back
- Cannot block while jumping (major risk)
- **Block heights**: high/mid/low as attack attribute determining which block type deflects
- **Chip damage**: small damage dealt through block on special moves (not normals)
- **Throw hurtbox**: disappears while blocking, so throws don't connect on-block

**Relevance to TFN**:
- Blocking is a distinct state; not just "holding back"
- Block heights form a closed set (high/mid/low) with specific block type rules
- Throw and block interact uniquely (mutually exclusive)
- Block stun timing affects frame advantage calculations

---

#### Hour 6: The Basics of Commands
**URL**: https://game.capcom.com/cfn/sfv/column/131406

**Key Topics**:
- **Commands**: input sequences needed for special/unique moves
- Unwritten rule: default assume ground (standing or crouching); air moves explicitly marked
- Command direction mirrors based on facing direction (left-facing character reverses command)
- **Numerical notation**: numpad convention (236 = quarter-circle forward)
- **Unique move commands**: single direction + button OR multi-button press
- **Special move commands** categories: (1) motion + button (2) charge + direction + button (3) multi-button (4) rapid button
- **Charge moves**: hold joystick in direction for period, then release toward target + button

**Relevance to TFN**:
- Moves require configurable command sequences (direction/duration-based)
- Commands are context-dependent (ground vs. air)
- Charge moves are distinct command type from motion commands
- Numerical notation should be supported for frame data databases

---

#### Hour 7: The Basics of Boxes
**URL**: https://game.capcom.com/cfn/sfv/column/131422

**Key Topics**:
- **Boxes are invisible**: internal collision systems not visible on screen
- Boxes don't perfectly match character graphics (deliberate design for gameplay)
- **Three box types**:
  - **Hurtbox** (blue): opponent's hitbox connects here to register hit
  - **Hitbox** (red): contains attack; connects with opponent's hurtbox
  - **Collision box** (rectangular): prevents character overlap; centered on body
- **Hurtboxes**: two types (regular for attacks, throw hurtbox for grabs)
- Regular hurtbox follows animation; throw hurtbox stays centered
- **Invulnerability**: temporary absence of hurtbox during certain states/moves
- **No collision box**: character can pass through opponent (teleport, certain moves)
- When no-collision state ends while overlapping: characters push apart (not continue overlap)

**Relevance to TFN**:
- Validates four distinct region types in our model
- Collision and throw boxes are independent systems
- Boxes are state/animation-dependent (not static)
- Invulnerability is about hurtbox absence, not immunity
- Ghost hits: visual vs. actual hitbox mismatch is intentional

---

#### Hour 8: The Basics of States
**URL**: https://game.capcom.com/cfn/sfv/column/131427

**Key Topics**:
- **Three state categories** (excluding attacking): Regular, Blocking, Getting Hit
- **Regular states**: standing, crouching, jumping (not attacking)
- **Standing hurtbox**: larger vertical, smaller horizontal
- **Crouching hurtbox**: smaller vertical, larger horizontal
- **Same location, different state** = different hit results (standing mid-kick hits ≠ crouching mid-kick hit)
- **Jumping mechanics**: no hurtbox from waist down (jump-over projectiles); special invulnerability to projectiles
- **Blocking state hurtbox**: same size as regular state hurtbox
- **Critical**: No throw hurtbox while blocking (throws don't land on block)
- **Block stun**: name for state of being stunned by blocked attack
- **Hit stun**: state of being knocked back after getting hit while standing
- **Crouching hit stun**: hit while crouched (different state)

**Relevance to TFN**:
- State defines hurtbox configuration; validates state-driven geometry
- Crouch position is legitimate state with distinct gameplay mechanics
- Jumping is high-commitment state; creates opportunities for opponent
- Block stun is distinct from hit stun (shorter duration, different state)

---

#### Hour 9: The Basics of Attacking - Attack Composition
**URL**: https://game.capcom.com/cfn/sfv/column/131432

**Key Topics**:
- **Three-part attack structure**:
  - **Startup**: frames until active frames begin (fast = strong general rule)
  - **Active frames**: frames where hitbox exists (longer ≠ better)
  - **Recovery**: frames after active ends until move completes (short = strong general rule)
- **Multiple hitboxes**: attacks can have gaps between active frame groups
- **Startup frame notation**: two methods in use
  - Method 1: "starts up in X frames" = duration (e.g., "starts up in 3 frames")
  - Method 2: "starts up on frame X" = frame number (e.g., "starts on the 3rd frame")
- Modern games use Method 2 (easier for frame advantage math)
- Difference between methods is always 1 frame
- **Projectiles**: character has no hitbox; projectile object carries hitbox instead

**Relevance to TFN**:
- FrameStage duration captures active frame count
- Startup is often stored as frame number (on-frame), not duration
- Multiple hitbox support needed for multi-hit moves
- Projectile moves are separate category (no character hitbox during startup)
- Frame advantage calculations depend on which startup notation is used

---

#### Hour 10: The Basics of Attacking - Damage Part I
**URL**: https://game.capcom.com/cfn/sfv/column/131448

**Key Topics**:
- **Each hitbox has independent settings**:
  - Damage parameter (vitality reduction)
  - Opponent reaction/effects (stun value, pushback, etc.)
- Normal moves: damage correlates with startup/recovery (light punch does least damage)
- Special/unique moves: damage doesn't correlate to complexity (light special can do light damage)
- **Stun state (dizzying)**: accumulates with hits; exceeding stun gauge = loss of control
- Character has both health AND stun gauge
- Stun gauge decays over time (buying time = losing stun accumulation)
- **Mashing**: rapidly input buttons/directions to reduce stun duration
- Stun gauge capacity varies by character

**Relevance to TFN**:
- Damage is per-hitbox attribute, not per-move
- Stun (dizziness) is separate resource from health
- Stun scales/accumulates differently than health
- Resource management includes stun mitigation strategies

---

#### Hour 11: The Basics of Attacking - Damage Part II
**URL**: https://game.capcom.com/cfn/sfv/column/131545

**Key Topics**:
- **Damage reactions**:
  - Hit/block effects (visual/audio intensity increases with attack strength)
  - Sound effects
  - Opponent damage motion
- **Pushback**: distance opponent pushed back on hit/block
- Pushback on hit usually applied to opponent; in corner, applied to attacker
- **Exception**: projectiles cause no pushback in corner
- **Hit stun**: duration opponent cannot move after being hit (depends on move)
- **Block stun**: duration opponent cannot move after blocking (shorter than hit stun)
- Each attack has unique hit/block stun values (not universal by attack type)
- **Hit stop / Block stop**: brief pause on both characters when hit connects (visual feedback)
- Hit/block stop is systematic per-game (light/medium/heavy usually 8F/12F/16F)
- Projectile attacks cause no hit stop for attacker (but stop for opponent)

**Relevance to TFN**:
- Hit stun and block stun are per-move attributes; not correlated to damage
- Pushback is critical for combo spacing calculations
- Hit stop duration affects perceived "weight" of move
- Validates DataValue pattern for hitstun/blockstun values

---

#### Hour 12: The Basics of Attacking - Advantage/Disadvantage
**URL**: https://game.capcom.com/cfn/sfv/column/131611

**Key Topics**:
- **Loss of hitbox on contact**: hitbox disappears immediately on hit or block (not dependent on active frame duration)
- For multi-hit moves: each hit has own hitbox (not extension of active frames)
- After attack hits: **remaining active frames become recovery** (this is why longer active ≠ stronger)
- **Meaty**: hit in latter half of active frames to reduce recovery disadvantage
- **Advantage on hit**: attacker recovers faster; can perform next move during opponent's stun
- **Disadvantage on hit**: attacker recovers slower; opponent can punish during recovery
- **Combo**: successive attacks while opponent in hitstun unable to block
- "These moves combo" = next move's startup fits in previous move's hit stun window
- **Advantage on block**: attacker recovers faster than opponent's block stun
- **Disadvantage on block**: opponent recovers faster; can counter-attack during recovery
- **Block string**: successive attacks while opponent in block stun unable to move
- **Punish**: counter-attack that connects during attacker's recovery frames

**Relevance to TFN**:
- Frame advantage is core to combo/blockstring feasibility analysis
- Hitbox removal is frame-instantaneous; not animation-dependent
- Multi-hit moves need tracking of each hitbox's own duration
- Advantage/disadvantage determines what moves connect next

---

#### Hour 13: The Basics of Combos - Basic Knowledge
**URL**: https://game.capcom.com/cfn/sfv/column/131617

**Key Topics**:
- **Combo**: successive hits while opponent in hitstun unable to block
- **Link**: next move in combo sequence
- **Grounded combo**: opponent hit while standing/crouching (most common combo type)
- **Mid-air combo**: opponent airborne after knockdown (system-specific rules per game)
- **Four conditions for grounded combos**:
  1. Advantage frames of opening move (hit stun duration)
  2. Pushback of opening move (spacing affected)
  3. Startup frames of linked move (must fit in hit stun window)
  4. Reach of linked move (must reach opponent after pushback)
- Multi-hit moves have independent hitbox system per game (SF2 vs SF3 vs SF4/5 differ)
- Combo parts: reusable chunks of combos that can be chained

**Relevance to TFN**:
- Combo feasibility = hit stun window includes next move's startup + reach
- Pushback significantly affects what combos work (not just frame numbers)
- Mid-air combo rules are entirely game-dependent; requires per-game configuration
- Combo builder should query: (hitstun of move A) ≥ (startup of move B) + (distance from pushback)

---

#### Expert: The School of Turbo
**URL**: https://game.capcom.com/cfn/sfv/column/131667

**Key Topics**:
- **Turbo**: faster game speed setting (1.5x typical)
- Common misconception: frames are skipped at turbo speed (false)
- Reality: **internal processing and monitor display are decoupled**
  - Internal processing runs at higher speed (90 fps for 1.5x turbo)
  - Monitor still displays at 60 fps
  - All frames still exist; just displayed faster
- **No startup frames are skipped**: combination of internal speed + display rate maintains determinism
- Processing result is identical regardless of turbo setting
- Combos don't break at turbo speed because all frames still execute

**Relevance to TFN**:
- Scenario simulation must support turbo settings without changing frame logic
- Turbo doesn't skip frames; doesn't break determinism
- GameDocument can define turbo as display setting, not engine change
- Validates frame-based determinism even at different visual speeds

---

#### Expert: Getting Max Enjoyment out of SFII Combos
**URL**: https://game.capcom.com/cfn/sfv/column/132437

**Key Topics**:
- **Grace period window**: brief window where special move input overwrites normal move startup
- **Cancel timer**: fixed-duration window (historically 4 frames universal; later game-specific)
- Moving between SFII versions changed cancel window (universal 4F → per-character timings → special timings)
- **Renda (chain) cancel**: recovery of light attack can be cancelled into same button press
- Only same button can link to renda cancel (LK→LK, LP→LP, but not LK→LP)
- Renda cancel to special requires status change (standing→crouch or vice versa) to reset
- **Special move forcing stand**: non-knockdown special moves force crouching opponent to standing
- **Exception**: fire-based damage moves have crouching variant (Dhalsim yoga fire)
- **Knockdown float time**: reduced in corner (shorter airborne duration)
- **Jump attack depth**: higher hit connects deeper for better spacing; not always true for combos

**Relevance to TFN**:
- Cancel systems are game and sometimes character-specific
- Renda (chain) cancels are button-specific constraints
- Cancel windows have explicit frame ranges (grace period)
- Special move effects can force stance changes

---

#### Hour 14: The Basics of Combos - Cancels
**URL**: https://game.capcom.com/cfn/sfv/column/132455

**Key Topics**:
- **Cancel**: special move overwrites normal move motion; skip remaining active frames + recovery
- Cancels can only occur when **normal move hits** (not during whiff or block)
- "Moment the move hits" includes entire hit stop duration (easier than it sounds)
- Longer hit stop = more time to input cancel (light attacks easier to cancel than heavy... no wait, opposite)
- **Grace period / cancel timer**: window of frames during which animation can be overwritten
- Cancel was accidental feature: special move overwrite meant to ease input execution; hit-canceling was byproduct
- Cancels only work: normal → special (not special → normal, not normal → normal with rare exceptions)
- **Any special move can cancel from a cancelable normal**
- **Kara cancel**: canceling attack that doesn't hit (used for positioning, not combos)
- **Renda (chain) cancel**: recovery of light attack cancels into same attack (chainable light attack)
- Chain cancels more lenient window than special move cancels

**Relevance to TFN**:
- Cancel is move-property: move marks which moves can cancel into it
- Cancel timing: during hit stop of normal move contact
- Cancel restrictions are: (1) which normals are cancelable, (2) into which specials
- Kara cancels are advanced technique; separate from hit cancels
- Renda cancels are light-attack specific system

---

## Part 3: Fighting Game Strategy & Footsies

### The Street Fighter Footsies Handbook

**Series Overview**: Concrete tactical guide to mid-range fighting game strategy. Focuses on how professional players control match flow through spacing, poke patterns, and punishment setups. Language is intentionally simple to make complex concepts accessible.

**When to Reference**:
- Understanding what players are trying to accomplish with moves
- Learning how spacing/distance affects move selection
- Understanding offensive and defensive patterns
- Learning about whiff punishment, throw setups, and position control
- Understanding corner advantages and jump mechanics
- Learning about counter-play and defensive options

**Core Insight**: "Footsies" = controlling mid-range ground game through pokes, managing opponent positioning, baiting whiffs, and punishing mistakes. Essential knowledge for tournament-level play.

#### Chapter 1: Footsies 101
**URL**: https://sonichurricane.com/?p=691

**Key Topics**:
- Punishing whiffed attacks (spacing opponent outside of safe range)
- Creating false vulnerability (moving within range but defending)
- Using poke patterns to set up throws
- Understanding "poke" (quick low-commitment move for spacing control)

**Relevance to TFN**: 
- Users need to capture move properties (recovery, range) to analyze whiff punish scenarios
- Scenario system must support "what happens if opponent whiffs from distance X"
- Validates need for precise range/distance modeling

---

#### Chapter 2: Shutting Down Light Attacks
**URL**: https://sonichurricane.com/?p=759

**Key Topics**:
- Light attacks as feints (quick recovery allows retreat)
- Counter-strategies to shut down light attack spam
- Frame advantage concepts in context of light moves

**Relevance to TFN**:
- Move classification matters (speed, recovery, commitment level)
- Frame data enables analytical comparison of moves
- Validates need for exact/relative startup values

---

#### Chapter 3: Corner Pressure & Cornered Opponents
**URL**: https://sonichurricane.com/?p=852

**Key Topics**:
- Advantages when opponent is cornered
- Preventing opponent escape
- Converting corner positioning to advantage
- Knockback and positioning mechanics

**Relevance to TFN**:
- Stage positioning must be modeled (zones, distances, corner positions)
- Knockback values affect combo feasibility
- Users need to capture position-dependent mechanics

---

#### Chapter 4: Super Meter & Baiting Super
**URL**: https://sonichurricane.com/?p=902

**Key Topics**:
- Super moves as high-commitment, high-reward options
- Baiting super (forcing opponent to waste meter)
- Resource management in gameplay
- Creating safe spaces to bait bad decisions

**Relevance to TFN**:
- Resources (meter) must be modeled in StateModel
- Move properties need "uses meter" / "gains meter" information
- Sequence analysis should track resource state changes

---

#### Chapter 5: Jumping Risk & Reward
**URL**: https://sonichurricane.com/?p=944

**Key Topics**:
- Jumping as high-risk gamble (vulnerable to anti-air)
- Anti-air moves and their coverage
- Jump-in combos and knockdown setups
- Risk/reward of aerial attacks

**Relevance to TFN**:
- Character states (airborne) must interact with move availability
- Need to model anti-air properties on moves
- Suggest "anti-air options" when opponent jumps

---

#### Chapter 6: Close-Range Footsies & Throw Game
**URL**: https://sonichurricane.com/?p=1022

**Key Topics**:
- Translating mid-range footsies into close-range combos
- Throw attempts and throw tech
- Frame advantage from mid-range moves into combo setup
- Mixing throws with meaty attacks

**Relevance to TFN**:
- Throw boxes and hurt boxes require separate modeling
- Frame advantage flow from move to move critical
- Sequences often start from mid-range position

---

#### Chapter 7: Neutral Game Spacing
**URL**: https://sonichurricane.com/?p=1055

**Key Topics**:
- Standing in neutral (not crouching) as spacing tactic
- Position selection in neutral game
- Height-based attack interactions
- When to crouch vs stand

**Relevance to TFN**:
- Character stance/state affects what hits and hurt boxes are active
- Crouching/standing as distinct game states
- Attack heights (low/mid/high) require modeling

---

#### Chapter 8: Hopkicks & Specialized Tools
**URL**: https://sonichurricane.com/?p=1123

**Key Topics**:
- Hopkicks: mid-range spacing tool (move while jumping)
- Character-specific tools and their role in footsies
- Using specialized moves to create gameplan options
- Defense against hopkick-heavy characters

**Relevance to TFN**:
- Character archetypes have different mechanical tools
- Users need to identify character-specific options
- Move properties enable or prevent certain tactics

---

#### Chapter 9: Crossup Offense & Jump-In Spacing
**URL**: https://sonichurricane.com/?p=1231

**Key Topics**:
- Crossups: jumping attacks that land on opposite side
- Setting up crossup scenarios
- Defending against crossups
- Jump-in timing and positioning

**Relevance to TFN**:
- Character positioning matters (facing direction, side changes)
- Move properties enable or disable crossup (crossupCapable flag)
- Scenarios must track character orientation

---

#### Chapter 10: Offensive Chaos & Gameplan Pressure
**URL**: https://sonichurricane.com/?p=1334

**Key Topics**:
- Creating intentional gaps in offense to bait opponent
- Feinting and unpredictability
- Mixing patterns to prevent reads
- Occasional chaos breaks opponent's defense

**Relevance to TFN**:
- Sequences can be intentionally incomplete (gaps for baits)
- Scenarios test multiple options (what if opponent acts here)
- Suggestions should include counter-patterns

---

#### Supplement A: Projectile Tactics
**URL**: https://sonichurricane.com/?p=1510

**Key Topics**:
- Projectile spacing control
- Zoning tactics (using projectiles to control territory)
- Anti-projectile defense options
- Projectile interaction with other mechanics

**Relevance to TFN**:
- Projectiles are distinct move category (separate from normals/specials)
- Projectile properties affect spatial control
- State of game changes with active projectiles

---

#### Supplement B: Projectile Implementation Models

**Overview**: Different games model projectiles with different durability/interaction systems. TFN's ProjectileDocument and custom state updaters support all of these.

**Street Fighter 6 (Priority-Based Durability)**:
- Projectiles have priority level (1-5)
- Higher priority defeats lower priority in clash
- User defines: `states.projectiles = { priority: { min: 1, max: 5 }, durability: { min: 1, max: 4 } }`
- Hadoken: `{ priority: 3, durability: 1 }`
- Shun Goku Satsu: `{ priority: 5, durability: 4 }`
- Projectile lifecycle modeled with phases, despawned on hit or stage boundary

**Marvel vs Capcom (Hit-Based Durability)**:
- Projectiles survive N hits before destruction
- Example: Beam assists (3-hit), Tatsu (1-hit), Missiles (1-2 hits)
- User defines: `states.projectiles = { hits: { min: 1, max: 10 } }`
- Different projectile types within same character
- TFN model: Each projectile has `state.projectiles.hits = N`, decremented on hit via `onUpdate`

**Tekken (Stage Position + Projectile Behavior)**:
- 3D games: projectiles have x/y/z trajectory
- Projectiles can be sidestepped
- User enables 3D: `game.is3d = true`
- ProjectilePhase defines velocity in all three dimensions
- Hitboxes positioned in 3D space relative to projectile origin

**Guilty Gear Strive (Complex Projectiles)**:
- Some projectiles have levels/upgrades
- Can spawn other projectiles
- Interact with specific mechanics
- User defines: `states.projectiles = { level: { min: 1, max: 3 }, canSpawnProjectiles: boolean }`
- Projectile effects spawn additional projectiles via `MoveOutcomeEffect`

**Conceptual Mapping to TFN**:
- Durability tracking: `states.projectiles` categories (priority, hits, level, custom)
- Projectile lifecycle: `ProjectilePhase` with duration and `destroyedAfter`
- Custom interactions: `State.onUpdate` callbacks (durability loss on clash)
- Complex behaviors: `State.onFrameAdvance` callbacks (spawning, level upgrades)
- Spatial behavior: Velocity-based motion, position calculation, 3D support

---

## Model Design Application

### How These Materials Inform TFN Architecture

**From Andrea Jens Series**:
1. **StateModel** — Characters exist in discrete states; state determines available actions
2. **Collision/Hurt/Throw Boxes** — Three distinct systems; boxes are frame-independent but state-dependent
3. **Move Phases** — Each phase can have multiple hitboxes; phases exist as distinct temporal regions
4. **Frame Data** — Essential for all analysis; startupframe matters for punishment
5. **Determinism** — Scenarios must produce predictable outcomes given fixed inputs

**From Capcom CFN (Mr. Bug Seminars)**:
1. **Official Frame Data Conventions** — Startup as frame number (not duration); hit stun and block stun as per-move attributes
2. **Box Interaction Rules** — Hitbox disappears on contact; throw hurtbox absent while blocking; collision boxes centered on body
3. **State-Dependent Geometry** — Standing vs crouch changes hurtbox dimensions; jumping creates unique vulnerability
4. **Cancel Systems** — Cancels occur during hit stop; limited to normal→special; only predetermined moves cancelable
5. **Block Mechanics** — Standing block covers high/mid; crouch block covers mid/low; critical for designing move hit heights

**From Footsies Handbook**:
1. **Distance/Spacing** — Critical data dimension; ranges on RangeBand capture this
2. **Position-Dependent Properties** — Corner has different rules; stage zones matter
3. **State Interactions** — Crouching changes what hits you; states disable/enable hurt boxes
4. **Move Properties** — Recovery, startup, and range are queryable attributes
5. **Scenario Simulation** — "What if opponent does X from distance Y in state Z?" must be answerable

### Key Data We Must Capture

**At Character Level**:
- Hurt boxes (with state-dependent disabling)
- Collision volume (spacing mechanics)
- Available states and transitions
- Archetypes/tools (hopkicks, anti-airs, etc.)

**At Move Level**:
- Phases with precise frame ranges
- Hit boxes (with target type: hurt/throw/projectile)
- Frame data (startup, active, recovery)
- Range profile (distance reached)
- Properties (crossup, unblockable, invulnerable, etc.)
- State requirements/effects

**At Game Level**:
- Input vocabulary (buttons, directions)
- State categories (positions, states, resources)
- Resources (meter, stocks, etc.)
- Stage zones and dimensions

### Programmatic Utilization

These materials enable us to build:

1. **Whiff Punish Finder** — Analyze startup frames; show which moves can punish from what distances
2. **Combo Feasibility Checker** — Given hitstun values and move recovery, determine if combo connects
3. **Gap Analyzer** — Identify blockstring gaps where opponent can interrupt
4. **Anti-Air Suggester** — Show which moves work against opponents jumping from current position
5. **Throw Setup Detector** — Identify move + state combinations that enable throw attempts
6. **Okizeme Analyzer** — Given knockdown positioning, suggest wake-up options and setup combos

---

## Why Capcom CFN Seminars Matter for TFN

The Mr. Bug seminars from Capcom's official CFN platform represent the most authoritative documentation of Street Fighter mechanics available. Unlike academic texts or community wikis, these materials:

1. **Come from game designers** — Mr. Bug programmed SF games; he explains implementation rationale
2. **Define official terminology** — "Block stun," "hit stun," "grace period," "cancel timer" are official terms
3. **Clarify ambiguities** — Resolves contradictions in community knowledge (e.g., turbo doesn't skip frames)
4. **Document version differences** — Explains why SF2 → SF3 → SF4 → SF5 have different cancel/combo systems
5. **Provide frame data conventions** — Critical for building databases that work across multiple games

For TFN specifically, these seminars validate:
- **FrameStage structure**: startup on frame X, active frames Y-Z, recovery Z-recovery end
- **Cancel window model**: limited to hit stop duration; only predetermined moves
- **Box independence**: hitbox/hurtbox/collision box are separate systems with distinct rules
- **State-driven geometry**: hurtbox configuration depends on stance (standing/crouching/jumping)
- **Block mechanics**: standing block (high/mid) vs crouch block (mid/low) directly impacts move design

The seminars also explain **why** certain mechanics exist (grace period → accidental hit cancel discovery), which helps when users ask about unconventional move properties.

---

## Document Maintenance

**Last Updated**: 2026-08-13
**Maintainer**: Theory Fighter Network Team

When new source materials are discovered or existing ones are superseded, update this document with:
- URL and title
- Publication date
- Key topics covered
- When/why to reference it for model decisions
- How it informs TFN architecture
