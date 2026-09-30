# Savo SiteScout: Savomart Expansion Intelligence Platform (Chennai)
> Built for the Savomart Full Stack Engineer 48-Hour Hackathon (September 2026).  
> **Brand Identity:** Savomart Purple (`#782B90`) & Savomart Yellow (`#FFF200`).  
> **Target Region:** Greater Chennai / Chennai Metropolitan Area (CMA).  

[![CI Tests](https://img.shields.io/badge/pytest-9%20passed-emerald)](backend/app/tests)
[![Frontend](https://img.shields.io/badge/Vite%20React%20TS-Passing-blue)](frontend)
[![Python](https://img.shields.io/badge/Python-3.14-blue)](backend)
[![License](https://img.shields.io/badge/License-Proprietary%20Savomart-purple)](LICENSE)

---

## 1. Executive Summary

Every new Savomart store starts with a critical location decision. Traditionally, Business Development (BD) executives drive around the city spotting vacant properties on intuition before evaluating catchment demand.

**Savo SiteScout** flips this workflow on its head:
1. **"Which area?" (M1)**: Data directs BD managers to high-potential Chennai micro-markets before anyone leaves the office.
2. **"Which property?" (M2)**: Mobile field intake captures properties in seconds, runs automated multi-factor site evaluations, and tracks leads across a structured pipeline state machine.
3. **"Is the catchment right?" (M3)**: Catchments are split into non-overlapping lane chunks, surveyed by field executives with offline-first mobile sync, and synthesized into ground-truth demand scores with automated data reuse.

---

## 2. Quickstart & Local Setup

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js v18+ & npm (Tested on Node v24)
- Git

### 1-Click Launch (Runs Both Backend & Frontend)
```bash
# Clone the repository
git clone https://github.com/sarnikaa/SAVOmart-hackathon.git
cd SAVOmart-hackathon

# Run master data ingestion (Pincodes, OSM POIs, H3 Grid, Seed Personas)
python backend/ingest/run_all_ingestion.py

# Launch both servers with one command
python start.py
```

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **FastAPI Interactive Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

### Manual Setup (Alternative)

#### Backend
```bash
cd backend
python -m pip install -r requirements.txt
python ingest/run_all_ingestion.py
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 3. Demo Credentials & Personas

No passwords or complex registration required. A **Role Switcher** in the top navigation bar immediately shifts the user context and adjusts permissions:

| Persona | Demo Name | Role Key | Email | Focus View |
| :--- | :--- | :--- | :--- | :--- |
| **BD Manager** | Karthik Ramanathan | `bd_manager` | `karthik.mgr@savomart.in` | Area Intelligence, Pipeline Kanban, Catchment Requests, City Opportunity Scanner |
| **BD Executive** | Priya Sundaram | `bd_executive` | `priya.exec@savomart.in` | Mobile Field Property Intake, GPS Tagging, Instant Site Evaluation |
| **Survey Manager** | Dinesh Kumar | `survey_manager` | `dinesh.mgr@savomart.in` | Catchment Work Partitioning, Task Delegation, Rollup Insights |
| **Survey Executive** | Arun Prasath | `survey_executive` | `arun.exec@savomart.in` | Mobile Street-Level Lane Survey, 10-Min Footfall Counts, Offline Queue |

*Note: The API enforces role-based access control via the `X-User-Id` header (returning `403 Forbidden` if an unauthorized persona attempts restricted actions).*

---

## 4. Architecture & Data Model

```
                    ┌──────────────────────────────────────────────┐
                    │               React 18 + Vite                │
                    │   TailwindCSS (#782B90 / #FFF200) + Leaflet   │
                    └──────────────────────┬───────────────────────┘
                                           │ HTTP / JSON
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │               FastAPI Backend                │
                    │  Role-Enforcing Dependencies & BackgroundOps │
                    └──────┬───────────────┬────────────────┬──────┘
                           │               │                │
            ┌──────────────▼─────┐ ┌───────▼────────┐ ┌─────▼──────────────┐
            │ M1: Area Engine    │ │ M2: Pipeline   │ │ M3: Survey Engine  │
            │ • H3 Resolution 9  │ │ • StateMachine │ │ • Balanced Chunks  │
            │ • Percentile Ranks │ │ • Rent Ratios  │ │ • Offline Sync     │
            │ • Cannibalisation  │ │ • Audit Events │ │ • 70% Reuse Engine │
            └────────────────────┘ └────────────────┘ └────────────────────┘
                                           │
                    ┌──────────────────────▼───────────────────────┐
                    │     SQLAlchemy 2.0 / PostGIS & SQLite        │
                    │  (Pincodes, POIs, H3 Cells, Properties, etc.)│
                    └──────────────────────────────────────────────┘
```

### Core Data Entities & Schema
- `users`: ID, name, email, role (`bd_manager`, `bd_executive`, `survey_manager`, `survey_executive`).
- `ingestion_runs`: Data provenance record storing source, version, record count, and timestamp.
- `pincodes`: Spatial records for Chennai localities with centroid coordinates and district tags.
- `h3_cells`: Uber H3 Resolution-9 hexagonal spatial units storing precomputed residential, commercial, transit, and competitor counts.
- `osm_features`: Verified POIs across Chennai (supermarkets, kiranas, metro stations, bus terminals, malls).
- `savomart_stores`: Registry of operational Savomart stores with source tag (`live_api` or `sample_fallback`).
- `area_analyses`: Background analysis jobs with staged progress, composite score, subscores, and grounded narrative.
- `properties`: Field-scouted properties with GPS coords, commercial terms, physical dimensions, and photos.
- `property_evaluations`: Versioned multi-factor evaluation scores with risks and strengths.
- `property_events`: Immutable audit trail recording stage transitions with required rationale ("who did what and why").
- `catchment_studies`: 500m radius studies linked to properties or areas.
- `survey_tasks`: Partitioned non-overlapping street chunks assigned to Survey Executives.
- `lane_surveys`: Measured 10-minute pedestrian counts, kirana density, and household profile tags (idempotent deduplication via `client_uuid`).
- `catchment_insights`: Synthesized rollup metrics feeding back into parent property scores.

---

## 5. Grounded Scoring & AI Rationale

### 1. Area Fitness Score ($S_{area} \in [0, 100]$)
$$S_{area} = 0.30 \cdot D_{res} + 0.25 \cdot V_{com} + 0.20 \cdot G_{comp} + 0.15 \cdot A_{trans} + 0.10 \cdot C_{safe}$$

- **$D_{res}$ (Residential Density, 30%):** Percentile rank of residential building density benchmarked against 315 Chennai urban H3 cells.
- **$V_{com}$ (Commercial Vitality, 25%):** High-street presence, retail anchors, and commercial establishments.
- **$G_{comp}$ (Competitive White Space, 20%):** Inverse saturation index rewarding areas with high residential demand and low modern supermarket penetration.
- **$A_{trans}$ (Transit Accessibility, 15%):** Proximity to Chennai Metro stations, MRTS, and MTC bus terminuses.
- **$C_{safe}$ (Cannibalisation Safety, 10%):**
  $$C_{safe} = 100 \cdot \text{clamp}\left(\frac{d - 0.8}{2.0 - 0.8}, 0, 1\right)$$
  - If nearest Savomart $d \ge 2.0\text{ km}$: $C_{safe} = 100.0$ (Completely safe).
  - If $0.8\text{ km} \le d < 2.0\text{ km}$: Proportional score ramp.
  - If $d < 0.8\text{ km}$: Severe penalty with hard **Cannibalisation Risk Flag**.
- **Renormalisation:** If any signal is missing from public datasets, weights are automatically renormalised across available signals so the total weight remains $1.00$.

### 2. Property Multi-Factor Score ($S_{prop} \in [0, 100]$)
$$S_{prop} = 0.35 \cdot R_{comm} + 0.30 \cdot P_{phys} + 0.20 \cdot L_{loc} + 0.15 \cdot C_{catchment}$$
- **Provisional Fallback:** When a property is first sighted without a completed catchment study, $C_{catchment}$ is dropped, the remaining components are renormalised, and the property is stamped with a **"Provisional"** badge.
- **Dynamic Re-evaluation:** Once a Catchment Study is completed, the property score is automatically recalculated with ground truth lane data.

### 3. Grounded AI Narrative & Anti-Hallucination Validator
- LLMs often fabricate demographic counts or rent figures.
- In Savo SiteScout, the narrative generator passes all output through a strict **Grounding Validator**:
  - All numbers extracted from the generated text must match numeric figures in the raw metrics JSON.
  - If an ungrounded or hallucinated number is found, the system immediately rejects the output and falls back to a deterministic, transparent template labelled **"Template summary (no LLM)"**.

---

## 6. Catchment Survey Operations (M3)

1. **Non-Overlapping Partitioning:** The 500m catchment boundary is divided into 3 contiguous H3 resolution-9 clusters (e.g., Sector A: Arterial High-Street, Sector B: Residential Lanes, Sector C: Transit Feeders). Every lane midpoint belongs to exactly one task.
2. **Offline-First Field Resilience:**
   - Field executive captures are assigned a client-side UUID and stored immediately in `localStorage` / `IndexedDB`.
   - The UI displays explicit states: **"Saved locally"**, **"Syncing..."**, and **"Cloud Synced"**.
   - Sync is idempotent, deduplicating on `client_uuid` to handle intermittent mobile network connectivity.
3. **Data Reuse Engine:**
   - Before dispatching fresh surveyors, the system checks whether a completed study exists within 500m.
   - If coverage $\ge 70\%$ and study age $\le 90\text{ days}$, the system prompts 1-click data reuse, eliminating duplicated field spend.

---

## 7. Data Sources & Provenance Honesty

All spatial boundaries and feature points are ingested through automated scripts in `backend/ingest/`:

| Source | Usage in SiteScout | Data Honesty Classification |
| :--- | :--- | :--- |
| **OpenStreetMap (OSM) / Overpass** | Road lanes, supermarkets, transit hubs, commercial centers | **REAL PUBLIC DATA** |
| **OGD India (data.gov.in)** | Chennai postal pincodes and administrative boundaries | **REAL PUBLIC DATA** |
| **Savomart Stores API** | Live operational store proximity & cannibalisation checks | **LIVE API** (with realistic sample cache fallback if internal DNS is unreachable) |
| **Commercial Rent Benchmarks** | Rent per sqft by locality (e.g. Velachery ₹85, Anna Nagar ₹140) | **MOCK DATA** (explicitly labelled in UI) |
| **Household Monthly Spend** | Monthly grocery demand estimate (e.g. ₹3.25 Cr/mo) | **MOCK DATA** (explicitly labelled in UI) |

---

## 8. Verification & Test Suite

The test suite covers the platform's core algorithmic and business logic:

```bash
# Run backend tests
python -m pytest backend/app/tests -v
```

### Verified Test Cases:
- `test_scoring.py`: Sub-score bounds, weight renormalisation, cannibalisation ramp boundaries (0.8km, 2.0km), and hard risk flags.
- `test_llm_validator.py`: Grounding validator rejects hallucinated numbers and ensures template fallback fidelity.
- `test_pipeline.py`: Enforces legal state machine transitions, blocks illegal skips, and verifies audit events.
- `test_survey_split.py`: Validates H3 resolution-9 cell resolution and catchment data reuse logic.

```bash
# Verify frontend compilation
cd frontend
npm run build
```
*Result: Zero TypeScript or Vite bundling errors.*

---

## 9. Bonus Features Delivered

1. **City-Wide Opportunity Heatmap Scanner:** Automatically scans 16+ Chennai micro-markets and ranks un-scouted white-space pockets.
2. **Grounded Conversational Analyst:** Interactive AI assistant that can answer natural language comparative queries (e.g., *"Compare Velachery and Tambaram for our next 3,000 sq ft store"*).
3. **Shareable Leadership Decision Pack:** 1-click printable executive investment memo for store committee sign-off with browser print-to-PDF styles.

---

## 10. Known Issues & Future Roadmap

- **Census Block Disaggregation:** Currently uses OSM residential building counts as a density proxy; future versions would integrate 2021/2026 ward-level census microdata.
- **Pedestrian Computer Vision:** Integrating edge AI on mobile to automate pedestrian counting from camera feeds rather than manual sampling.
- **Multi-Tenant Dark Store Support:** Extending catchment modeling to quick-commerce dark stores with 10-minute isochrones.

---

## 11. Video Demo Link & Deliverables

- **Demo Video (3 to 5 Minutes):** [Google Drive Video Demo Placeholder - Anyone with the link can view](https://drive.google.com/file/d/savomart-sitescout-demo/view?usp=sharing)
- **AI Session History:** Located in [`ai-sessions/session-log.md`](ai-sessions/session-log.md).
- **Repository Name:** `SAVOmart-hackathon` with `mohammed.hafiz@ebono.com` invited as collaborator.
