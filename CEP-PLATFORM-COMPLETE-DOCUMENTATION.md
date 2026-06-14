# CEP Survey Authoring Platform — Complete Build Documentation

**Project:** AI-Assisted Critical Element Pathway (CEP) Survey Authoring & Execution Platform
**Audience:** Internal / client demo walkthrough
**Location on disk:** `/Users/venkatasree/Documents/cep-demo/`
**Status:** All features built, integrated, and verified. Running locally.
**Git:** Pushed to `https://github.com/Sree272727/mock_survey`

---

## TABLE OF CONTENTS

1. Business Context & Goal
2. The Big Picture — What Existed vs. What We Built
3. System Architecture (stack, ports, processes)
4. Data Model (all 14 tables)
5. Complete API Reference (every endpoint)
6. Feature-by-Feature Deep Dive (everything we built)
7. The PDF → AI Extraction Engine (in detail)
8. The Branching / Rules Engine (in detail)
9. End-to-End Data Flow
10. Bugs Fixed (full list)
11. Known Limitations & What's Still Hardcoded / Mocked
12. Environment, Setup & Run Instructions
13. File Inventory (new + modified)
14. Suggested Demo Script

---

## 1. BUSINESS CONTEXT & GOAL

### The domain
- **CMS** (Centers for Medicare & Medicaid Services) regulates US nursing homes.
- CMS surveyors (inspectors) investigate facilities using standardized checklists called **Critical Element Pathways (CEPs)** — one PDF per concern (General, Neglect, Infection Control, Dementia, Pressure Ulcers, etc.).
- A CEP guides the surveyor through **Observations → Interviews → Record Review → Critical Element Decisions** and ends with citation logic: e.g. *"Did the facility ensure the resident was free from neglect? **If No, cite F600.**"*
- **F-tags** (F600, F684, …) are regulation citation codes. Confirmed failures become citations on the official **CMS-2567 deficiency report**.
- CEPs are **decision trees**: an answer can reveal follow-up questions, skip irrelevant ones, or direct the surveyor to start another CEP entirely.

### The problem
A prior proof-of-concept (built by Preetha) could *run* a CEP survey, but each survey had to be **hand-coded by a developer** as JSON — days of work per document, not maintainable by business users, and not scalable across the dozens of CEPs CMS publishes.

### The goal (this build)
An **AI-assisted authoring platform** so a business user can:
1. **Upload a CEP PDF** → AI auto-extracts the survey (questions, sections, citation rules).
2. **Review & edit** the questions and **configure branching logic** in a friendly UI — no JSON, no developer.
3. **Save** and **run** the survey, which executes the configured branching.
4. Plus a post-survey **Learning Management System (LMS)** that recommends training based on cited deficiencies.

---

## 2. THE BIG PICTURE — WHAT EXISTED vs. WHAT WE BUILT

### Pre-existing (Preetha's POC)
- **Survey execution engine** — cases, answering questions, hide/show of sub-questions & sections, flags, citations, validation, evidence upload, audit trail.
- **CMS-2567 PDF generation** (custom PDF encoder, no external lib).
- **Three hand-built pathways** as JSON seed data: General CEP, Neglect CEP, Infection Control CEP (~50 questions total).
- **JSON import/export** endpoints and an admin "Workflow Builder" *skeleton*.
- **Dashboards** (compliance overview, per-facility) — backend-driven.

### Did NOT exist before (key gaps)
- ❌ No PDF upload or parsing anywhere; no AI/LLM integration; no PDF library installed.
- ❌ Branching rules were **display-only** in the builder — only creatable by hand-writing JSON.
- ❌ **No Save button** — the builder's `applyChanges` was never wired to any UI element, so edits were silently lost.
- ❌ Pathway table rows weren't clickable.
- ❌ Survey runtime, nav, milestones, and create-form were **hardcoded to exactly 3 pathways**.
- ❌ Several "management" pages were static mockups with no backend.

### What we built (summary — detailed in §6)
1. **PDF → AI extraction** (OpenAI + deterministic bullet segmentation + heuristic fallback).
2. **Editable branching-rule editor** (7 action types) + working **Apply/Discard** save model.
3. **"Create Pathway" dropdown** consolidating Add-Pathway and Upload-CEP-PDF (modal).
4. **Pathway delete** (backend cascade endpoint + confirm UI).
5. **Visual decision-tree** ("Flow View").
6. **"Go to question" branching** (same-pathway skip + cross-pathway jump).
7. **"Trigger another CEP"** + **pop-up CEP runner** with return-to-form (nested, stacked).
8. **Dynamic pathway execution** (`/app/pathway/:slug` + dynamic sidebar).
9. **Multi-select pathway survey creation** + persisted selection order (`display_order` migration).
10. **Dynamic, gated milestones / sidebar / summary** driven by the survey's chosen pathways.
11. **Inline branching feedback** chips on the survey screen.
12. **Dynamic next-pathway navigation.**
13. **Live Question Library** (was a static mockup).
14. **LMS / Trainings** feature (My / Recommended / All).
15. **Survey delete** from the surveys list.
16. **Mode auto-switch** to Platform Admin on admin routes.
17. Numerous bug fixes (see §10).

---

## 3. SYSTEM ARCHITECTURE

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · React Router · Tailwind CSS · shadcn/Radix UI · lucide-react · Recharts |
| Backend | FastAPI (Python 3.12) · SQLAlchemy 2 · Alembic · Pydantic v2 |
| Database | PostgreSQL 16 (Docker) |
| AI / PDF | OpenAI (`gpt-4o`) via `openai` SDK · `pypdf` for text extraction |

### Running processes & ports (remapped to avoid conflicts on this machine)
| Component | URL / port | Notes |
|---|---|---|
| PostgreSQL (Docker `cms_survey_postgres`) | host **5435** → container 5432 | db `cms_survey`, user `cms_user`, pass `cms_pass` |
| Backend API (uvicorn) | **8010** | `app.main:app`, Python 3.12 venv |
| Frontend (Vite dev) | **5173** | |
| Swagger API docs | http://localhost:8010/docs | |

### Two "modes" in the UI
- **LTC Customer** — surveyor-facing: Compliance Dashboard, Surveys, **Trainings**, Facilities, Users.
- **Platform Admin** — content-facing: Question Library, Templates, Pathways, **Workflow Builder**, Admin Guide.
- The app auto-switches to Platform Admin on admin-only routes (so the header label and sidebar match the page).

---

## 4. DATA MODEL (14 tables)

**Definition tables** (the survey content):
- `pathway` — a CEP (slug, title, is_active).
- `section` — a section within a pathway (slug, title, display_order).
- `node` — a question (code, prompt, node_type, display_order, is_start, is_terminal, **parent_node_code** ← added in migration 0003 for follow-ups).
- `choice` — an answer option (code, label, value).
- `transition` — generated edge: from_node + choice → to_node (condition_type, condition_payload, priority).
- `rule_action` — a side-effect attached to a transition (action_type + JSON payload).

**Runtime tables** (a survey in progress):
- `case` — a survey instance (external_case_id, resident_id, facility_name, status).
- `case_pathway` — which pathways are attached to a case + per-pathway status + **display_order** ← added in migration 0004 to preserve the surveyor's selected order.
- `case_answer` — answers given (node, choice, notes, evidence_refs).
- `case_flag` — flags raised.
- `case_citation` — F-tag citations raised.
- `case_event` — audit trail (answer_submitted, recommendation_generated, etc.).
- `case_validation_issue` — open requirements (e.g. evidence/note required).
- `evidence_item` — uploaded evidence files + manual notes.

**Foreign-key cascades:** definition children (section/node/choice/transition/rule_action) and `case_pathway`/`case_answer` use `ON DELETE CASCADE`; citations/flags/events use `SET NULL` on pathway. This is what makes single-pathway and single-case deletes clean.

**Migrations (Alembic):**
- `0001_init_schema`
- `0002_phase1_branching_validation`
- `0003_add_parent_node_code` (follow-up questions)
- `0004_case_pathway_display_order` (**new — preserves survey pathway sequence**)

---

## 5. COMPLETE API REFERENCE

### Pathways & catalog
- `GET /health` — health check.
- `GET /api/pathways` — list all pathways (slug, title, is_active). **(new)**
- `GET /api/pathways/{slug}` — full pathway definition (sections → nodes → choices → rules).
- `GET /api/lms/trainings` — **(new)** LMS catalog (one training per unique F-tag, with `recommended` flag).

### Authoring (admin)
- `GET /api/admin/workflows/export` — full definition snapshot (all pathways).
- `POST /api/admin/workflows/import` — full replace (with `reset_runtime`).
- `POST /api/admin/workflows/import-pack` — **additive** import (no wipe). Used by PDF import & Add Pathway.
- `POST /api/admin/workflows/extract-pdf` — **(new)** upload a PDF → returns an editable `AdminWorkflowPayload`.
- `DELETE /api/admin/pathways/{slug}` — **(new)** permanently delete one pathway (cascade).
- `GET /api/admin/workflows/runtime-status` — case/answer counts (for the reset-confirm dialog).

### Cases (surveys)
- `POST /api/cases` — create a survey. **(extended)** accepts `pathway_slugs` (attach only selected, in order).
- `GET /api/cases` · `GET /api/cases/{id}` — list / get.
- `PATCH /api/cases/{id}` — update survey details.
- `DELETE /api/cases/{id}` — hard-delete a survey (cascade). **(used by new UI delete)**
- `DELETE /api/cases` — purge all.
- `GET /api/cases/{id}/pathways` — **(new)** the case's chosen pathways, in order, with status. Drives milestones / nav / summary.
- `GET /api/cases/{id}/state` — fixed general/neglect/infection statuses + flags + citations (legacy).
- `GET /api/cases/{id}/pathways/{slug}/snapshot` — answers + current node for a pathway.
- `PATCH /api/cases/{id}/pathways/{slug}/status` — mark a pathway in_progress / completed (completion validation here).

### Answering & findings
- `POST /api/cases/{id}/answers` — submit an answer → runs the rules engine → returns flags/citations/recommendation (**+ `recommendation_slug`, new**).
- `GET /api/cases/{id}/findings-summary` — findings rollup.
- `GET /api/cases/{id}/validation-issues` · `…/pathways/{slug}/validation-issues` — open requirements.
- `POST /api/cases/{id}/validation-issues/{issue_id}/resolve`.
- `GET /api/cases/{id}/events` — audit trail.
- `POST /api/cases/{id}/save` · `POST /api/cases/{id}/reset`.
- Evidence: `GET/POST /api/cases/{id}/evidence`, `POST …/evidence/upload`, `GET …/evidence/{id}/download`.
- `GET /api/cases/{id}/report.pdf` — CMS-2567 PDF.

### Dashboards
- `GET /api/dashboard/overview` · `/facilities` · `/survey-frequency` · `/facility/{name}`.

### Demo utility
- `POST /api/demo/reset` — re-seed demo data.

---

## 6. FEATURE-BY-FEATURE DEEP DIVE

### 6.1 PDF → AI Question Extraction  *(the headline feature)*
**Files:** `app/services/pdf_extract.py`, endpoint `POST /api/admin/workflows/extract-pdf`, `src/pages/admin/workflows/PdfImportSection.tsx`.

**Flow:** Upload PDF → `pypdf` extracts text → **deterministic bullet segmentation** → OpenAI (`gpt-4o`) returns the survey JSON → normalize → return for review → user edits title/slug → **Import as Pathway** (additive import-pack).

- **Deterministic bullet segmentation** (`segment_bullets`): CEP PDFs use checkboxes that `pypdf` renders as leading spaces. Each new bullet starts with leading whitespace (or a numbered "N)"), continuation lines start at column 0, and section headers are capital-start lines ending ":". The segmenter reconstructs exactly **one `•` per survey item** and `## ` per section, skipping page headers and the trailing "Other Tags to Consider" reference list. This **eliminates the AI guessing bullet boundaries** (which earlier caused both over-merging and over-splitting).
- **OpenAI prompt** prioritizes **fidelity**: one question per bullet, faithful wording, never invent/drop/split, keep multi-sentence probes whole, convert each "If No, cite F###" into an `add_citation` rule, add `Yes/No` (and `NA` where the doc lists it), skip the "Review in Advance" prep list.
- **Fallback** (`extract_heuristic`): if no API key / network failure / quota error, a heuristic text parser runs so the demo **never hard-fails**. The UI labels the source ("AI Extracted" vs "Text Parser").
- **Normalization** (`normalize_pathway`): unique slug (auto-suffixes on conflict), prefixed unique node codes, dangling parent/goto references dropped, unknown action types stripped, choices default to Yes/No.
- **Caps:** `MAX_QUESTIONS = 100` (raised from 40 — the Neglect CEP has 53 items and was being truncated, dropping its entire citations section), `MAX_TEXT_CHARS = 24000`.

**Verified extraction quality (real CMS PDFs):**
| PDF | Result |
|---|---|
| CMS-20072 General (4 pp) | **31 questions, 5 sections** — Observations(4), Resident Interview(5), Staff Interviews(8), Record Review(7), Critical Element Decisions(7) — F684/F655/F636/F637/F641/F656/F657, NA where the doc has it |
| CMS-20130 Neglect (6 pp) | **53 questions, 7 sections** (incl. 5 role-specific interview sections) — F600/F606/F607/F609/F610/F943/F947 |

### 6.2 Editable Branching-Rule Editor  *(authoring)*
**File:** `src/pages/admin/workflows/QuestionEditForm.tsx`.

Was read-only; now a full editor. Per question: **When answer is [choice] → then [action]**, add/remove rules & actions. **7 action types**, each with type-specific fields:
1. `goto_question` — **two dropdowns**: target **pathway** + target **question** (same-pathway = skip; different = cross-CEP jump).
2. `add_flag` — code + message.
3. `add_citation` — F-tag + rationale.
4. `recommend_pathway` — choose the CEP to recommend (message auto-fills).
5. `show_section` — choose a section to reveal.
6. `require_evidence_min` — min count + message.
7. `require_note` — min length + message.

Also: **"Follow-up of (parent question)"** dropdown (a follow-up appears only when its parent is answered "No").

### 6.3 Save model — Apply / Discard + dirty tracking
**Files:** `WorkflowContext.tsx`, `WorkflowBuilderPage.tsx`.

The original builder had **no save button at all**. Added **Apply Changes** (persists the whole edited workflow) and **Discard Changes** (reloads). Added **`isDirty` tracking**: the save bar is hidden on the pathways-list home page when there are no pending edits (Add/Delete/Upload persist immediately), and appears on deeper editing views or whenever there are unsaved drawer edits.

### 6.4 "Create Pathway" dropdown (consolidated entry points)
**Files:** `PathwaysTable.tsx`, `PdfImportSection.tsx` (now supports modal mode).

Replaced the separate "Add Pathway" button + inline "Create Pathway from PDF" section with **one "Create Pathway ▾"** dropdown:
- **Add Pathway** → persists a new pathway immediately, opens the editor (survives refresh).
- **Upload CEP PDF** → opens a **modal** with the drag/drop zone → extraction → preview → import.

### 6.5 Pathway delete
**Files:** `DELETE /api/admin/pathways/{slug}`, `PathwaysTable.tsx`.

Was local-state-only (reappeared on refresh). Now: trash icon → confirm dialog → backend cascade delete → reload. The last-pathway guard was removed (empty list is valid), which also fixed a bug where the disabled delete button's click fell through and navigated into the pathway.

### 6.6 Visual decision tree ("Flow View")
**File:** `PathwayFlowView.tsx`. A read-only full-screen diagram: numbered sections, connected question cards, nested follow-ups, and color-coded rule chips (Flag, Citation, Triggers CEP, Reveals section, Go-to/skip, evidence/note). Opened via "Flow View" on a pathway's sections page.

### 6.7 "Go to question" branching
**Files:** backend `goto_question` handling in completion logic; `App.tsx` runtime; `QuestionEditForm.tsx`.
- **Same pathway:** answering the trigger choice **skips** the questions between it and the target (hidden + excluded from progress and the completion gate).
- **Cross pathway:** opens the pop-up runner at the target question (highlighted).

### 6.8 "Trigger another CEP" + pop-up runner
**Files:** `src/components/PathwayTriggerModal.tsx`, `App.tsx`, backend `recommendation_slug`.
- Answering a `recommend_pathway` rule shows a **purple banner** ("Another CEP triggered — Initiate …") with **Open now / Later**.
- **Open now** → a **modal** runs the triggered CEP's questions for the same case. Nested triggers **stack** (breadcrumb shows the chain) with a loop guard. Completing/closing **returns to the original form exactly where you left off**.
- The dashboard recommendation card's button is now **dynamic** (deep-links to the actual recommended pathway via the event's `target_slug`).

### 6.9 Dynamic pathway execution
**Files:** `App.tsx` (`DynamicPathwayScreen`, route `/app/pathway/:slug`), `AppShell.tsx`.
Runtime was hardcoded to 3 pathway screens. Now **any** pathway (seeded or uploaded) runs via `/app/pathway/:slug`, and the survey sidebar lists the case's actual pathways.

### 6.10 Multi-select survey creation + ordering
**Files:** `App.tsx` create form, `POST /api/cases` (`pathway_slugs`), migration `0004`, `GET /api/cases/{id}/pathways`.
- The hardcoded 3-item "Starting Pathway" dropdown → a **checkbox multi-select loaded from the DB's active pathways**, with numbered badges showing the chosen order.
- The backend attaches **only the selected** pathways, **in the selected order** (persisted via `display_order`).
- Verified: selecting [General, Neglect] yields General → Neglect even though the DB has Neglect at a lower id.

### 6.11 Dynamic, gated milestones / sidebar / summary
**Files:** `App.tsx` (milestones, Summary), `AppShell.tsx` (`SurveyWorkspaceNav`).
All three now build from `GET /api/cases/{id}/pathways`:
- **Milestone bar:** Survey Created → [chosen pathways] → Review & Summary, with locked (un-clickable) future steps.
- **Sidebar:** chosen pathways, **sequentially gated** (a pathway unlocks when the previous completes), polling for live status.
- **Summary tiles:** one per chosen pathway.

### 6.12 Inline branching feedback
**File:** `App.tsx` survey question render.
Under each answered question, a **"Triggered:"** chip row shows exactly what the answer did (⚑ Flag, § Cite F684, → Recommends neglect-cep, ↓ Skip to …, Reveals section, Evidence/Note required). Computed from the rules + answer, so it's accurate, persists across refresh, and even surfaces misconfigured rules (e.g. "§ Cite (no F-tag set)").

### 6.13 Dynamic next-pathway navigation
The "next" button after completing a pathway was hardcoded (`general→neglect→infection→summary`). Now it follows the survey's **chosen pathway order**; the last pathway goes to Summary. (This fixed the "after Neglect it asks for Infection Control and errors" bug.)

### 6.14 Live Question Library
**File:** `src/pages/QuestionLibraryPage.tsx`. Was a static `SEED_QUESTIONS` mockup; now lists **every question from the DB** (flattened from the live export), with real counts, citations pulled from each question's `add_citation` rules, search, pathway filter, and a pencil that deep-links each question into the Workflow Builder.

### 6.15 LMS / Trainings  *(new module)*
**Files:** `GET /api/lms/trainings`, `src/pages/TrainingsPage.tsx`, sidebar entry in `AppShell.tsx`, route `/app/trainings`.
A mock Learning Management System so surveyors get training to avoid repeat deficiencies. **Three tabs:**
- **All Training** — catalog: one training per unique F-tag found across the pathways, with realistic detail derived from the existing `F_TAG_METADATA` + `COMPLIANCE_AREAS` (title, category, regulation, severity) plus deterministic mock LMS fields (duration, format, level, module count) and a description.
- **Recommended** — trainings whose F-tags were **actually cited** in surveys (system-wide), each with a **Register** button.
- **My Training** — registered trainings with a 0%/"Not started" progress bar.

**Register flow:** click Register → toast → flips to green "Registered" → **moves out of Recommended into My Training**. Persisted in **localStorage** (mock, survives refresh). KPI tiles: Catalog / Recommended / Registered / Completed. Trainings have no inner content yet (populated later, by design).

### 6.16 Survey delete (surveys list)
**File:** `App.tsx` `SurveyHistory`. Each survey row has a **trash icon** → confirm → hard-delete (`DELETE /api/cases/{id}`) → list refreshes; clears the active case if it was the deleted one.

### 6.17 Smaller fixes (see §10)
Mode auto-switch to Platform Admin on admin routes; "Active Pathway" checkbox layout fix; duplicate survey name returns a friendly 409; clickable pathway rows.

---

## 7. THE PDF → AI EXTRACTION ENGINE (detail)

```
PDF bytes
  → pypdf extract_text()                      (raw text, checkbox glyphs become leading spaces)
  → segment_bullets()                          (deterministic: '## Section' + one '•' per item)
       • new item   = line starting with whitespace, OR a numbered "N)"
       • continuation = column-0 line (joined into the current item)
       • section    = capital-start line ending ":"
       • skipped    = page headers, "Other Tags to Consider" footer
  → if key present: OpenAI gpt-4o (fidelity prompt, temp 0.1, JSON mode)
       else / on error: extract_heuristic()    (fallback parser; UI shows "Text Parser")
  → normalize_pathway()                         (unique slug + codes, fix refs, validate actions, Yes/No[/NA])
  → PdfExtractResultOut { source, pages, section_count, question_count, warning, payload }
  → (frontend) review/edit title+slug → POST import-pack → live pathway
```

**Why segmentation matters:** earlier the AI guessed boundaries from flattened text and was inconsistent — it once merged a real checkbox ("Ensure interventions adhere to professional standards…") into the previous question, and another time split one multi-sentence Record-Review bullet into two. Deterministic segmentation makes the per-section question counts exact and stable.

---

## 8. THE BRANCHING / RULES ENGINE (detail)

**Definition:** a pathway is a linear list of questions; each answer-edge (`transition`) can carry side-effect `rule_action`s. Branching = side effects + frontend visibility conventions.

**On every answer** (`POST /api/cases/{id}/answers` → `evaluate_answer` in `workflow.py`):
1. Match the transition for the chosen choice.
2. Execute its rule actions:
   - `add_flag` → `case_flag` row.
   - `add_citation` → `case_citation` row (feeds the 2567 report + LMS recommendations).
   - `recommend_pathway` → returns `recommendation` + **`recommendation_slug`** (drives the trigger banner/pop-up).
   - `require_evidence_min` / `require_note` → `case_validation_issue` (blocks completion until satisfied).
   - `show_section` → reveals a section (frontend).
   - `goto_question` → skip / cross-pathway jump (frontend + completion logic).
3. **Reconcile:** re-answering differently retracts the old answer's flags/citations and cleans up hidden follow-ups.
4. Return `NextStepOut` (next node, flags_created, citations_created, recommendation, recommendation_slug, required_actions).

**Frontend visibility conventions (generic, any pathway):**
- A question with `parent_node_code` shows only while its parent = "No".
- `goto_question` (same pathway) hides the in-between questions and drops them from the completion requirement.
- `show_section` reveals a hidden section.

---

## 9. END-TO-END DATA FLOW

```
CEP PDF
  │ upload (Create Pathway ▾ → Upload CEP PDF)
  ▼
extract-pdf  →  AI/fallback  →  AdminWorkflowPayload  →  review/edit  →  import-pack
  ▼
Pathway in DB (pathway/section/node/choice/transition/rule_action)
  │ edit questions, follow-ups, branching rules → Apply Changes
  │ Flow View (visualize)
  ▼
Create Survey  →  multi-select pathways (ordered)  →  POST /api/cases {pathway_slugs}
  ▼
case + case_pathway rows (display_order)  →  GET /api/cases/{id}/pathways drives milestones/nav/summary (gated)
  ▼
Answer questions  →  evaluate_answer → flags / citations / recommendation / goto / require
       • inline "Triggered:" chips
       • follow-ups reveal, goto skips
       • recommend_pathway → purple banner → pop-up runner (return-to-form)
  ▼
Complete pathways (skips/hidden excluded)  →  next pathway (dynamic) → Review & Summary
  ▼
CMS-2567 PDF report (citations + findings)
  ▼
LMS: cited F-tags → Recommended training → Register → My Training
```

---

## 10. BUGS FIXED (full list)

1. **No Save in the Workflow Builder** — `applyChanges` existed but was wired to nothing; added Apply/Discard + dirty tracking.
2. **Branching rules were read-only** — built the full rule editor.
3. **Pathway rows not clickable** — added row navigation.
4. **Pathway delete didn't persist** — was local-state splice; added cascade `DELETE /api/admin/pathways/{slug}` + confirm + reload.
5. **Delete button click fell through to row** — the disabled-when-last button passed the click to the row (navigated in); removed the guard so delete always works.
6. **Add Pathway lost on refresh** — now persists immediately via import-pack.
7. **Duplicate survey name → raw 500 ("Failed to fetch")** — now a friendly `409` message.
8. **"Active Pathway" checkbox misaligned** — a global `input{width:100%}` rule stretched the checkbox; scoped overrides fixed it.
9. **Mode showed "LTC Customer" on admin pages** — auto-switches to Platform Admin on platform-only routes, no flash.
10. **Extraction over-paraphrased / dropped / split questions** — rewrote prompt for fidelity, then added deterministic bullet segmentation.
11. **Extraction dropped a real checkbox** ("Ensure interventions adhere…") — fixed segmentation + prompt.
12. **Extraction split one multi-sentence bullet into two** — fixed via segmentation (one `•` = one question).
13. **MAX_QUESTIONS=40 truncated the Neglect CEP** (dropped its Critical Element Decisions / F-tags) — raised to 100.
14. **Survey ignored selected pathway order** (showed Neglect before General) — added `display_order`; attaches in selected order.
15. **Only 3 hardcoded pathways in create form / milestones / nav / summary** — made all dynamic from the DB / case.
16. **After Neglect it navigated to a hardcoded `/app/infection` and errored** — dynamic next-pathway navigation.
17. **Branching "not working" (no visible effect)** — engine was fine; added inline "Triggered:" feedback chips.
18. **Question Library was a static mockup** — made it live from the DB.
19. **Recommendation card buttons hardcoded** to General/Neglect — now deep-links the actual recommended pathway.
20. **OpenAI key handling** — repeated key/billing failures diagnosed (revoked / no-quota / invalid); resilient fallback ensures the demo never breaks.
21. **Port conflicts (5432/8000)** — remapped to 5435/8010 without disturbing other local projects; fixed two hardcoded `localhost:8000` frontend URLs to use a shared `API_BASE`.

---

## 11. KNOWN LIMITATIONS & WHAT'S STILL HARDCODED / MOCKED

**Still hardcoded (only affects the 3 seeded slugs; uploaded pathways are fully generic):**
- The backend's special-case section logic (`_general_harm_required`, `_neglect_visibility_state`, `_infection_harm_required`) and two extra recommendations (`gen_harm_1`/`inf_dec_1`) run only for slugs `general-cep`/`neglect-cep`/`infection-control-cep`. They never execute for uploaded pathways. (User decision: **leave for now, delete later.**)
- `CaseStateOut` still carries fixed `general_status`/`neglect_status`/`infection_status` fields (legacy; superseded by `GET /api/cases/{id}/pathways`).

**Still static mockups (not yet wired to the DB):** `TemplatesPage`, `FacilitiesPage`, `UsersPage`, and the standalone `PathwaysPage` (the **Workflow Builder** is the real pathway manager; the **Question Library** *is* live now).

**Mock by design:** LMS registration is localStorage (per-browser); trainings have no inner content yet; survey-type (Annual/Complaint) is decoupled from pathway selection (user will define behavior — likely Annual=all, Complaint=specific).

**Other notes:**
- Single-user, no auth — demo scope.
- Survey pathway order = the selected order (persisted); surveys created *before* migration 0004 keep their old order.
- The Neglect pathway currently in the DB may be an older partial import — re-upload to get the full 53 questions + citations.

---

## 12. ENVIRONMENT, SETUP & RUN

**Backend `.env`** (`tcs-latest-cep-demo-backend/.env`):
```
DATABASE_URL=postgresql+psycopg://cms_user:cms_pass@localhost:5435/cms_survey
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
OPENAI_API_KEY=sk-...            # gpt-4o; keep secret (gitignored)
```
**Frontend `.env`** (`tcs-latest-cep-demo-frontend/.env`): `VITE_API_BASE_URL=http://localhost:8010`
**OpenAI model:** `gpt-4o` (set in `app/config.py`).

**Run:**
```bash
# Backend
cd tcs-latest-cep-demo-backend
docker compose up -d postgres
python3.12 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt   # first time
alembic upgrade head            # applies migrations incl. 0004
python -m app.seed              # optional: seed the 3 original pathways (only if empty)
uvicorn app.main:app --reload --port 8010

# Frontend
cd tcs-latest-cep-demo-frontend
npm install                     # first time
npm run dev                     # http://localhost:5173/
```
**Key URLs:** App `http://localhost:5173/app` · Workflow Builder `…/app/admin/workflows` · Trainings `…/app/trainings` · Question Library `…/app/admin/questions` · API docs `http://localhost:8010/docs`.

**Sample PDFs:** `sample-pdfs/CMS-20072-General.pdf`, `sample-pdfs/CMS-20130-Neglect-10.24.22.pdf` (real CMS documents).
**Restore the 3 original pathways:** `curl -X POST http://localhost:8010/api/admin/workflows/import-pack -H "Content-Type: application/json" --data @seeds/original-3-pathways.json`

---

## 13. FILE INVENTORY

**New backend files**
- `app/services/pdf_extract.py` — segmentation, OpenAI call, heuristic fallback, normalization.
- `alembic/versions/0004_case_pathway_display_order.py` — survey pathway ordering.
- `seeds/original-3-pathways.json` (+ `seeds/README.md`) — restorable snapshot of the 3 originals.

**New backend endpoints (in `app/main.py`)**
- `POST /api/admin/workflows/extract-pdf`, `GET /api/pathways`, `GET /api/cases/{id}/pathways`, `DELETE /api/admin/pathways/{slug}`, `GET /api/lms/trainings`.

**Modified backend**
- `app/main.py` — the endpoints above; `create_case` accepts `pathway_slugs` + sets `display_order`; goto-skip in completion; duplicate-name 409; recommendation `target_slug` event.
- `app/models.py` — `CasePathway.display_order`.
- `app/schemas.py` — `PdfExtractResultOut`; `CaseCreateIn.pathway_slugs`; `NextStepOut.recommendation_slug`.
- `app/services/workflow.py` — `recommendation_slug` propagation.
- `app/config.py` — `openai_api_key`, `openai_model`; `requirements.txt` — `pypdf`, `openai`.

**New frontend files**
- `src/pages/TrainingsPage.tsx` — the LMS.
- `src/pages/admin/workflows/PdfImportSection.tsx` — PDF upload card + preview modal (+ modal mode).
- `src/pages/admin/workflows/PathwayFlowView.tsx` — decision-tree Flow View.
- `src/components/PathwayTriggerModal.tsx` — pop-up CEP runner (stacked, return-to-form).

**Modified frontend**
- `src/App.tsx` — dynamic `/app/pathway/:slug`; multi-select create form; dynamic milestones; trigger banner + pop-up wiring; cross-pathway goto detection; goto-skip visibility; inline "Triggered:" chips; dynamic next-pathway; dynamic summary tiles; survey delete; `API_BASE` usage; `/app/trainings` route.
- `src/layouts/AppShell.tsx` — dynamic survey sidebar (gated, case-driven); Trainings nav; mode auto-switch.
- `src/pages/QuestionLibraryPage.tsx` — rewritten live.
- `src/pages/admin/workflows/QuestionEditForm.tsx` — full rule editor (7 actions, two-dropdown cross-pathway goto, follow-up picker).
- `src/pages/admin/workflows/WorkflowBuilderPage.tsx` — Apply/Discard with dirty-state.
- `src/pages/admin/workflows/WorkflowContext.tsx` — `isDirty` tracking.
- `src/pages/admin/workflows/PathwaysTable.tsx` — Create Pathway dropdown, clickable rows, persistent delete with confirm.
- `src/pages/admin/workflows/SectionsTable.tsx` — Flow View button.
- `src/pages/admin/workflows/PathwayEditForm.tsx` — checkbox layout fix.
- `src/api.ts`, `src/types.ts` — `adminExtractPdf`, `listPathways`, `getCasePathways`, `adminDeletePathway`, `getLmsTrainings`, `CasePathwayItem`, `LmsTraining`, `PdfExtractResult`, etc.
- `.gitignore` (top-level, new) — protects `.env`/secrets, `node_modules`, `.venv`, uploads.

---

## 14. SUGGESTED DEMO SCRIPT (≈6 min)

1. **Frame (30s):** "CEPs are CMS's investigation checklists — decision trees published as PDFs. Converting one to a digital survey used to take a developer days. Watch this."
2. **Upload (60s):** Workflow Builder → **Create Pathway ▾ → Upload CEP PDF** → drop the real **CMS-20130 Neglect** PDF → ~30s → preview shows **"AI Extracted"**, ~53 questions in 7 sections, F600-series citations pre-wired → rename → Import.
3. **Author (60s):** open a question → **Branching Rules**: add *"When No → Trigger Infection Control CEP"* and *"When No → Go to question X"* → **Apply Changes**.
4. **Visualize (30s):** **Flow View** — the decision tree with follow-ups, citations, triggers.
5. **Run (120s):** Create Survey → **multi-select** General + Neglect (numbered order) → open General → answer "No" → see **inline Triggered: chips**, follow-ups, a **goto skip**, and the **purple trigger banner → pop-up runs the other CEP → return to form**. Complete → it advances to the next chosen pathway (no phantom Infection Control).
6. **Findings + LMS (60s):** Findings Summary → download the **CMS-2567 PDF** → go to **Trainings → Recommended** → the cited F-tags' trainings appear → **Register** → moves to **My Training**.
7. **Close (20s):** "PDF → editable survey → configurable branching → execution → official report → targeted training. Minutes, not days, and no developer in the loop."

---

*This document reflects the full state of the build as of the latest session. Every feature, endpoint, table, and fix listed has been implemented and verified in the running application.*
