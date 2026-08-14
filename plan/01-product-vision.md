# Theory Fighter Network — Product Vision

## What It Is

Theory Fighter Network (TFN) is a research tool that helps you understand fighting games better. It's your lab partner, your notebook, and your community's shared knowledge base—all in one place.

You capture what you learn about your game: move properties, combos, matchup decisions. As your documentation grows, TFN becomes more powerful, helping you discover new strategies, validate theories, and collaborate with your community to solve your game together.

---

## Why It Matters

### The Problem

When you're learning a fighting game, knowledge is scattered:
- Frame data is buried in spreadsheets or forum posts
- Combo routes are in Discord servers and Reddit threads
- Why combos work requires understanding spacing, timing, and state interactions
- You discover strategies away from the game but have nowhere to organize them
- Communities re-discover the same combos over and over because knowledge isn't preserved

### The Solution

TFN lets you document what you learn, where you learn it. Waiting for training mode? Commute on the train? On your phone at work? Document a combo route, a punish, a mixup setup. Over time, you build a complete picture of your game.

And because your documentation is structured (move properties, timing windows, positioning), TFN can:
- **Suggest new combos** based on your existing data
- **Validate theories** by checking spacing and timing
- **Simulate outcomes** to test ideas before going to arcade/online
- **Connect with your community** to see what others discovered

### Connection to Existing Resources

Resources like the **Footsies Guide** and **Capcom CFN seminars** teach you HOW fighting games work. TFN is where you **apply that knowledge** to YOUR game. 

The Footsies Guide explains frame advantage, hitstun, and cancel windows. TFN is where you document your game's specific values and test those concepts. CFN seminars show you box definitions and state systems. TFN is where you model your game's boxes and states, then discover what they mean for your combos and matchups.

---

## Progressive Documentation

You don't need to know everything to start. You document what you know. As you and your community learn more, the data converges.

### Your Journey

**Week 1: Start With What You Know**
"I think this jab is faster than that kick" — Document it as a comparative relationship. TFN can already help you find follow-ups.

**Week 3: Add Exact Data**
"I timed the videos; jab is 5 frames" — Add exact values. Your suggestions become more precise.

**Week 5: Publish Your Guide**
You share your findings. A community member tries your combos, confirms your frame data, adds their own findings.

**Week 6: See the Community Picture**
TFN shows: "10 players confirmed jab is 5 frames. 2 players say 6 frames. Here's what varied in their testing..."

You see where the community agrees and where the debate is. Multiple independent measurements converge on the same values, giving you confidence.

**Week 12: Discover Together**
You share a combo route you found. Three other players try it, discover variations, document state-specific versions. Each variant goes into the system. TFN shows the family tree of this combo across all the versions.

**The magic**: Individual documentation becomes community knowledge. As more people document independently, their data converges. TFN surfaces that convergence. Communities solve games faster because knowledge compounds.

---

## How Knowledge Grows Into Power

### Phase 1: You Learn One Route
You discover: Ryu's crouching medium punch → Hadoken works on standing opponent.

### Phase 2: You Document It
You enter the move properties, the hitstun, the startup times. You record the positioning.

### Phase 3: TFN Shows You More
"You have 5 frames of hitstun here. These 8 other moves have 5-frame startup. You're missing 7 combo routes."

### Phase 4: You Test & Document
You try those routes. Some work, some don't. You document which states they require, which positioning changes them.

### Phase 5: Your Community Learns Too
Others download your guide. They validate your data, add their findings, spot contradictions. TFN shows where everyone agrees and where the debate is.

### Phase 6: You Simulate Without Training Mode
You're away from the arcade. But you can explore: "If I land this move, what are my guaranteed follow-ups?" TFN checks timing and spacing. You test it next session.

**This cycle compounds.** Each person's documentation makes TFN better for everyone. Each idea tested in the tool gets brought back to the lab. Communities discover combos faster because the tool surfaces possibilities no one would find manually.

---

## Core Capabilities

### Understand Your Game

**Document moves exactly as they appear**:
- Startup, active, recovery frames
- Hitbox position and size (estimated from screenshots if needed)
- Hurt box changes per frame stage
- Hit and block outcomes (they can be completely different)
- Frame advantage on hit, block, counter-hit
- Positioning changes after the move connects
- State changes (crouch, airborne, charging, etc.)

### Organize Your Discovery

**Build combos from your understanding**:
- Select moves in sequence
- Timing windows show when you can input next
- Positioning tracks where both characters end up
- Difficulty calculates automatically
- Notes capture context ("only works corner", "tight link", etc.)

### Explore Possibilities

**Let the tool suggest what you might have missed**:
- "You have 5 frames of hitstun; these 3 moves have 5-frame startup"
- "You've cancelled jab into hadoken 8 times; have you tried shoryuken?"
- "That move pushes opponent 20 units; these moves have 20+ range"

### Document Decisions

**Capture matchup knowledge**:
- Key moves for this matchup
- Vulnerable moments to punish
- Spacing control and positioning advantages
- If-then scenarios ("If opponent corners me, do X")

### Work Away From the Game

**On your phone, in a browser, on the train**:
- Review your notes and strategies
- **Simulate**: "What's guaranteed after this knockdown?" — Frame-accurate scenario testing with proper spacing, hitstun scaling, and projectile behavior
- **Explore**: "What if I tried this sequence?" — TFN tests timing, positioning, and state interactions automatically
- **Organize**: Bookmark your best combos and strategies
- **Collaborate**: See what your community discovered

### Power Users: Define Custom Game Mechanics

**No limits to what you can model**:
- Gravity affecting projectile arcs and juggle windows
- Hitstun scaling based on combo count
- Health regeneration over time
- Projectile priority clashes with deterministic outcomes
- Custom state transitions and resource interactions
- Anything else your game does — you define it via state updaters
- TFN runs your simulation and shows you the result

**Two types of updates**:
- **Effect-driven**: When a move applies damage/meter/stun, your rule transforms it (combo scaling hitstun, etc.)
- **Frame-driven**: Each frame of simulation, your rule runs (gravity, regen, decay, etc.)
- All updates run during simulation, making TFN's scenario testing truly accurate to your game

### Share With Friends

**Collaborate without publishing**:
- Text or email a guide, combo, or matchup sequence to a teammate
- They import it directly into their guide
- Both of you see each other's findings and can work together
- No need to publish to community; it stays between you and your team
- Merge findings as you both discover new routes and properties

---

## The Superpowered Wiki

Individual knowledge + structured data = community solutions.

**Before TFN**: Knowledge lives in isolated corners. One player discovers a combo in their city. Another discovers the same combo a year later 1000 miles away. Neither knows the other found it.

**With TFN**: The first player documents it. The tool surfaces how many people verified it, what variations exist, where the debate is. The second player finds it immediately. They add their own findings. The community sees the pattern.

Over time, fighting game communities move from "Has anyone found a combo after this move?" to "Here are the 14 known routes after this move, ranked by difficulty, validated by 237 players."

---

## What You Can Do Now

✅ Document moves with phases (startup/active/recovery)  
✅ Track hit and block outcomes independently  
✅ Model combo structures with timing windows  
✅ Define your game's configuration (frame rate, states, attack types, spatial dimensions)  
✅ Estimate hitboxes and hurt boxes from theory  
✅ Calculate combo difficulty automatically  
✅ Get combo suggestions based on your data  
✅ Model matchup scenario trees (if opponent does X, I do Y)  
✅ **Document projectiles as independent entities with velocity, lifetime, and properties**  
✅ **Run frame-accurate scenario simulations with your game's exact mechanics**  
✅ **Define custom game mechanics via state updater functions (power users)**  
✅ Export and import guides as files  

---

## What's Coming

🔄 Cloud sync and community publishing  
🔄 Variant comparison (when players disagree on frame data)  
🔄 Video integration and clip linking  
🔄 Real-time frame data capture from gameplay  
🔄 Mobile app for offline reference  

---

## The Philosophy

**Local-First**: Your research belongs to you, on your computer. Cloud is optional.

**Progressive**: Start with what you know. Incomplete data is valuable. Upgrade as you learn.

**Deterministic**: Same move in same state always produces same result. No randomness, no guessing.

**Game-Agnostic**: Works for Street Fighter, Marvel, Tekken, Guilty Gear, indie games, anything frame-based.

**Community-Transparent**: See what's aligned, what's debated, how many people verified it.

---

## Who This Is For

- **Competitive players** building character mastery
- **Casual players** learning why combos work
- **Coaches** organizing and teaching character knowledge
- **Content creators** using research for videos and guides
- **Communities** solving games together
- **Game designers** documenting mechanics precisely

---

## Important: No AI, No Black Box

TFN uses only local data and deterministic mechanics. There's no AI or machine learning predicting your combos. Every suggestion is based purely on:
- **The moves you documented** and their properties
- **The math**: spacing, timing, hitstun values
- **Your game's rules** as you defined them

When TFN suggests a combo, it's checking: "Do you have enough hitstun? Does the next move have 5-frame startup or less? Is the opponent in range after being pushed?" 

All transparent. All based on the data you enter. Communities trust TFN because they understand exactly how it works.

