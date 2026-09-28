# AI Assistance & Co-Development Session Log
**Project:** Savo SiteScout (Savomart Expansion Intelligence Platform)  
**Hackathon:** Savomart Full Stack Engineer 48-Hour Hackathon (Sept 2026)  
**Participant:** Full Stack Engineer Submission  

---

## 1. Overview of AI Tool Usage
In compliance with the hackathon policy ("AI tools: fully allowed and encouraged. We'd rather see you use AI well than pretend you didn't. Disclose in your README which AI tools you used and how"), this document outlines the collaborative pairing sessions conducted with AI assistants during the 48-hour development window.

### Primary AI Tools Used:
- **Antigravity (Gemini 3.8 Flash High CoT)**: End-to-end pair programming, architecture refinement, mathematical formula design, and testing.
- **Claude / Cursor IDE**: Component scaffolding, TypeScript interface typing, and CSS styling.

---

## 2. Chronological Session Trajectory & Key Decisions

### Session 1: Requirements Deconstruction & Architecture Planning
- **Goal:** Analyze the 5-page problem statement, decode persona needs, and establish data grounding principles.
- **Key Realizations & AI Dialogue:**
  - *The Danger of Hallucinated AI*: LLMs often invent demographic population figures or commercial rents. We decided early on that the AI narrator must be strictly bounded: an automated regex-based ground validator parses all numeric claims and cross-references them against raw computed metrics in JSON. Any unverified number triggers an immediate fallback to a deterministic, transparent template.
  - *Spatial Backbone*: Evaluated PostGIS vs SQLite. Because judges or local reviewers may not have Docker or PostgreSQL pre-installed on their workstations, we engineered an adaptive database layer: SQLAlchemy 2.0 models with an H3 resolution-9 hex grid and spatial indexing that supports PostgreSQL/PostGIS in production and SQLite zero-setup locally.
  - *Stores API Handling*: Discovered that `https://internal-service.savomart.in/bridge/api/store/list?is_operational=True` was unreachable on public DNS. Rather than failing or faking live status, we built an honest fallback mechanism with a clear UI tag ("Sample Fallback Cache active") and audit logging.

### Session 2: Milestone 1 - Area Intelligence Engine
- **Goal:** Design the multi-stage background analysis runner and explainable scoring formula.
- **Formula Design:**
  - Mathematical balance:
    `S_area = 0.30*D_res + 0.25*V_com + 0.20*G_comp + 0.15*A_trans + 0.10*C_safe`
  - Calibrated against 315 urban H3 cells in Greater Chennai (p25, p50, p75, p90 benchmarks).
  - Explicit Cannibalisation Ramp: `100 * clamp((d - 0.8)/(2.0 - 0.8), 0, 1)` with a hard penalty flag if `< 0.8km`.
  - Renormalisation logic when any signal is absent.

### Session 3: Milestone 2 - Property Scouting & Pipeline
- **Goal:** Mobile field onboarding and strict state-machine pipeline.
- **Key Enhancements:**
  - Enforced 50-meter duplicate detection using Haversine calculation to prevent double-submissions by field agents.
  - Implemented provisional scoring when no catchment study is available, dynamically re-evaluating when ground truth arrives.
  - Strict pipeline state machine requiring mandatory transition reasons and append-only audit events (`property_events`).

### Session 4: Milestone 3 - Catchment Study & Field Operations
- **Goal:** Smart non-overlapping partitioning, weak network resilience, and data reuse engine.
- **Implementation:**
  - Non-overlapping H3 resolution-9 clustering into 3 contiguous sector tasks.
  - 10-minute pedestrian counting window with time-slot tagging (morning/afternoon/evening peak).
  - Offline-first sync with client-generated UUIDs and IndexedDB/localStorage queuing.
  - 70% coverage and 90-day age reuse rule with automated prompt.

### Session 5: Bonus Deliverables & Verification
- **Goal:** Polish decision memo, opportunity heatmap scanner, and test suite.
- **Verification:**
  - Developed and executed 9 automated unit/integration tests with `pytest`.
  - Compiled Vite React TypeScript frontend with 0 errors.

---

## 3. Prompts & Prompts Strategies
Below are representative prompts used during the co-development process:
- *"Design a deterministic, explainable Area Fitness Scoring formula for Chennai grocery retail that balances residential density against competitor saturation, with a hard cannibalisation penalty when an operational Savomart is within 800 meters."*
- *"Implement a python validation function that extracts all numbers from an LLM-generated narrative and verifies that each number exists within the input metrics JSON, falling back to a structured template if hallucinated numbers are detected."*
- *"Create a mobile-first React component with an offline queue for field survey executives capturing lane-by-lane pedestrian counts and competitor kiranas."*
