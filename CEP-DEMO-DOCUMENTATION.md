# CEP Survey Authoring Platform — Complete Demo Documentation

**Project:** AI-Assisted Critical Element Pathway (CEP) Survey Authoring Demo
**Prepared for:** Client demo (TCS / The Compliance Store)
**Location:** `/Users/venkatasree/Documents/cep-demo/`
**Status:** All requested features built and verified

---

## 1. Background & Business Context

### 1.1 The domain

- **CMS** (Centers for Medicare & Medicaid Services) is the US government agency that regulates nursing homes.
- CMS sends **surveyors (inspectors)** into nursing homes to check resident safety and care quality.
- Surveyors follow standardized investigation checklists called **Critical Element Pathways (CEPs)** — one PDF document per topic of concern. Examples:
  - **CMS-20072** — General CEP (overall quality of care)
  - **CMS-20130** — Neglect CEP (suspected neglect of a resident)
  - Infection Control CEP, Dementia Care CEP, Pressure Ulcer CEP, and dozens more.
- Each CEP guides the surveyor through **Observations → Interviews → Record Review → Critical Element Decisions**, and ends with explicit citation logic such as: *"Did the facility ensure the resident was free from neglect? **If No, cite F600.**"*
- **F-tags** (F600, F684, …) are regulation citation codes. Confirmed failures become citations on the official **CMS-2567 deficiency report**.
- CEPs are **decision trees**: answers can reveal follow-up questions, skip irrelevant ones, or direct the surveyor to initiate an entirely different CEP.

### 1.2 The project origin

- Josh Stuedeman (General Manager, The Compliance Store) emailed the idea: *"some type of workflow or process driven application that would take users through the survey process and direct them wherever needed (follow-up questions, further guidance, etc.) based on their responses."* He attached the two real CEP PDFs (CMS-20072, CMS-20130).
- A first POC (the **survey execution engine**) was built by **Preetha** and previously demonstrated.
- **Sankar** then scoped the next demo: make survey **creation** (authoring) automatic and business-user friendly.

### 1.3 The problem being solved

In Preetha's POC, each CEP survey had to be **hand-converted by a developer** from the PDF into JSON — days of work per document, repeated for every new CEP or revision. Business users could not create or modify surveys. The demo's purpose is to prove this can be replaced by: **upload the CEP PDF → AI extracts the survey automatically → business user reviews/edits and configures branching in a friendly UI → survey runs immediately.**

---

## 2. What Already Existed (Preetha's System)

### 2.1 Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/radix components |
| Backend | FastAPI (Python) + SQLAlchemy + Alembic migrations |
| Database | PostgreSQL 16 (Docker) |
| AI / PDF parsing | **None** — did not exist |

### 2.2 How a survey was defined (the JSON model)

Surveys are defined as a 4-level tree: **Pathway → Sections → Questions (nodes) → Choices + Rules**.

```jsonc
{
  "pathways": [{
    "slug": "general-cep",
    "title": "General Critical Element Pathway",
    "is_active": true,
    "sections": [{
      "slug": "observations",
      "title": "Observations Across Various Shifts",
      "nodes": [{
        "code": "gen_obs_1",                          // unique question ID
        "prompt": "Does staff consistently implement the care-planned interventions?",
        "node_type": "question",
        "parent_node_code": null,                     // null = main question; set = follow-up
        "choices": ["Yes", "No"],
        "rules": [{
          "when_choice": "No",                        // IF the answer is...
          "actions": [{                               // THEN do...
            "type": "add_flag",
            "payload": { "code": "GEN_OBS_CARE_IMPL_FAILURE",
                         "message": "Care-planned interventions may not be consistently implemented.",
                         "severity": "warn" }
          }]
        }]
      }]
    }]
  }]
}
```

### 2.3 How the JSON becomes a running survey

1. **Import/seed**: a script (or the import API) flattens the JSON into 6 database tables:
   `pathway → section → node → choice`, plus `transition` (from-node + choice → to-node) and `rule_action` (attached to a transition).
2. **Transitions are generated, not authored**: questions connect linearly (each choice points to the next question). Branching is achieved through *side effects* attached to specific answer-edges, plus frontend visibility conventions.
3. **Runtime** (`evaluate_answer()` in `app/services/workflow.py`): on every answer —
   - match the transition for the chosen answer,
   - execute its rule actions (create flags / citations / validation issues, emit recommendation),
   - **reconcile**: if a question is re-answered differently, the old answer's flags/citations are retracted, and hidden follow-ups' data is cleaned up,
   - return next node + everything created.
4. **Frontend visibility conventions**:
   - A question with `parent_node_code` set is a **follow-up** — shown only while the parent's answer is **"No"** (hardwired convention).
   - `show_section` actions reveal hidden sections.
5. **Output**: a custom PDF generator produces the official **CMS-2567 deficiency report** (no external library — hand-built PDF 1.4 encoder).

### 2.4 Rule action types the engine supports (pre-existing)

| Action type | Payload keys | Effect |
|---|---|---|
| `add_flag` | `code`, `message`, `severity` | Amber warning flag on the case |
| `add_citation` | `tag` (F-tag), `rationale` | Regulatory citation → feeds 2567 report |
| `recommend_pathway` | `message` (+ `pathway_slug`) | Recommendation to open another CEP |
| `show_section` | `section_slug` | Reveals a hidden section |
| `require_evidence_min` | `min`, `message` | Blocks completion until N evidence items attached |
| `require_note` | `min_length`, `message` | Blocks completion until a note is written |

### 2.5 What Preetha's system could and could not do

**Worked well:**
- Full survey execution: cases, answering, follow-up reveal, flags, citations, validation, evidence upload, audit trail, CMS-2567 PDF generation, dashboards.
- 3 hand-built pathways: General CEP (~18 questions), Neglect CEP, Infection Control CEP (50 questions total across all three).

**Did not exist / did not work (the gaps):**
- **No PDF upload or parsing of any kind** — no library, no endpoint, no UI.
- **No AI/LLM integration anywhere.**
- The admin "Workflow Builder" UI existed as a skeleton, but:
  - Branching **rules were displayed read-only** — they could only be created by hand-writing JSON.
  - **There was no Save button** — `applyChanges` existed in code but was never wired to any UI element, so all edits were silently lost.
  - Pathway table rows were not clickable (navigation bug).
- "CMS Question Packs" cards looked like an import feature but were **pre-typed JSON hardcoded in the frontend** (and 2 of 3 cards were empty "Coming Soon" placeholders).
- Survey screens were **hardcoded to the 3 seeded pathways** — a new pathway could not be executed in the UI.
- The most advanced behaviors (e.g., "Harm section becomes mandatory after a failure") are **hardcoded Python functions keyed to the 3 seeded slugs** — they don't generalize to new pathways.

> Honest framing: Preetha built the **player piano** (the engine that plays a survey). This project built the **machine that writes the music rolls** — directly from the sheet music CMS publishes.

---

## 3. What Sankar Asked For (Requirements)

From the meeting transcript and requirement summary:

| # | Requirement (Sankar's words, paraphrased) |
|---|---|
| 1 | "Can I upload this PDF?" — upload existing CEP PDFs (TCS has many) |
| 2 | "It should show up all these questions — save time by reading existing PDFs, not forcing them to manually create questions" — automatic question extraction |
| 3 | "Make the JSON an authorable interface" — review, edit, add, remove, organize questions without touching JSON or developers |
| 4 | "If I select No for this, you should ask question 5" — configurable question-to-question logic |
| 5 | "It can trigger another critical element pathway" — cross-CEP triggers (e.g., answer triggers Infection Control CEP) |
| 6 | Save the survey definition |
| 7 | Show the survey **executes** using the configured rules (engine already exists) |
| 8 | Demo-grade, not production: "It's a demo only for five minutes... as long as they get the idea, we are good." |

---

## 4. What Was Built (Feature by Feature)

### 4.1 PDF Upload → AI Question Extraction  *(Requirement 1 + 2)*

**Backend** — new endpoint `POST /api/admin/workflows/extract-pdf`:
- Accepts a PDF upload; extracts text with `pypdf`.
- **Primary path**: sends the text to **OpenAI (model `gpt-4o`)** with a carefully engineered prompt that returns the exact `AdminWorkflowPayload` JSON shape the existing import engine understands. The prompt instructs the model to:
  - extract every distinct probe question (comprehensive, max 40),
  - rephrase open-ended probes into Yes/No questions,
  - mirror the document's section structure (incl. multiple role-specific Interview sections),
  - place numbered compliance determinations in a "Critical Element Decisions" section,
  - convert every *"If No, cite F###"* instruction into a real `add_citation` rule,
  - wire follow-up questions via `parent_node_code`,
  - use only the engine's known action vocabulary.
- **Fallback path** (so the demo can never die): if no API key / network failure / quota error, a built-in heuristic text parser extracts question-like lines (sentences ending in "?") and groups them by detected section headings. The UI clearly labels which path was used.
- **Normalization & safety**: output is validated and coerced — unique slug (auto-suffixes if a pathway with the same slug exists), unique prefixed question codes, dangling parent/target references dropped, unknown action types stripped, choices default to Yes/No.
- Nothing is imported at extraction time — the user reviews first.

**Frontend** — new **"Create Pathway from PDF"** section on the Workflow Builder page:
- Drag-and-drop zone + "browse files" (`PdfImportSection.tsx`).
- Extraction progress state → **preview modal** showing: page/section/question counts, "AI Extracted" (blue) vs "Text Parser" (amber) badge, editable Title & Slug, and every question with its choices, follow-up badges, and rule chips (citations, flags, triggers).
- **"Import as Pathway"** → posts to the existing additive `import-pack` endpoint → the new pathway appears in the builder, fully editable and immediately runnable.

**Verified results on the real CMS PDFs:**

| Document | AI extraction result |
|---|---|
| CMS-20130 Neglect (6 pages) | ~23–25 questions, 7 sections (incl. 5 role-specific interview sections: frontline staff, supervisors, investigator, administrator, QAA committee), **all 7 citation rules**: F600, F606, F607, F609, F610, F943, F947, plus auto-wired follow-ups |
| CMS-20072 General (4 pages) | ~32 questions, 5 sections, **all 7 citation rules**: F684, F655, F636, F637, F641, F656, F657 |

> Comparison worth quoting: the hand-built General CEP took a developer days and has 18 questions; the AI extracted 32 questions with the same F-tags from the same document in ~30 seconds.

### 4.2 Editable Authoring Interface  *(Requirement 3 + 6)*

- **Branching Rules editor** (rewritten `QuestionEditForm.tsx`): rules are now fully editable with business-friendly dropdowns —
  *"When answer is [No ▾] → then [Raise a flag ▾ / Add citation (F-tag) ▾ / Trigger another CEP ▾ / Go to a specific question ▾ / Show a section ▾ / Require evidence ▾ / Require surveyor note ▾]"* — with type-specific payload fields (F-tag + rationale, flag code + message, min evidence count, etc.). Add/remove rules and actions freely.
- **Follow-up configuration**: "Parent Node Code" free-text box replaced with a **"Follow-up of (parent question)"** dropdown listing the section's main questions, with explanatory text ("appears only when X is answered No").
- **Apply Changes / Discard Changes buttons** added to the Workflow Builder toolbar — **the original UI had no save mechanism at all**; edits were silently lost. Saving runs the full import (with a confirmation dialog when runtime data would be reset).
- **Bug fix**: pathway table rows are now clickable (they had hover styling but no click handler — `navigate` was imported but never used).

### 4.3 "Go to a Specific Question" Branching  *(Requirement 4 — Sankar's literal example)*

New rule action `goto_question`, configured with **two dropdowns**:
1. **Pathway** — any pathway in the system (current one marked "(this pathway)")
2. **Question** — the questions of the chosen pathway

Two runtime behaviors:
- **Same pathway**: answering with the configured choice **skips** every question between the answered one and the target (they disappear from the form; numbering stays stable so the jump is visible, e.g., 1 → 5). Skipped questions are excluded from progress counts and from the backend's "Complete Pathway" requirement check (server-side enforcement added).
- **Different pathway (cross-CEP jump)**: answering shows the trigger banner; opening it launches the **pop-up runner** (see 4.5) with the target CEP **auto-scrolled to the target question, highlighted with a purple ring and a "Jumped here from the previous form" badge**.

The Flow View and extraction preview both render these rules as chips (e.g., *"No → Go to q5 (skip in-between)"* / *"No → Go to neglect-cep : neg_staff_2"*). The AI extractor may also emit `goto_question` when a document explicitly says "If Yes, proceed to question 5".

### 4.4 "Trigger Another CEP"  *(Requirement 5)*

- Rule editor action **"Trigger another CEP"**: pick the target pathway from a dropdown; the recommendation message auto-fills ("Initiate the <CEP title>") and is editable.
- Mechanically the engine raises a **recommendation** (not a forced navigation): message + target slug are returned with the answer, logged to the audit trail, shown on the Survey Overview card and Findings Summary. *This mirrors the paper process — the CEP document instructs the surveyor; the human decides.* ("System recommends, surveyor decides" is the defensible answer if the client asks.)
- **Backend enhancement**: `recommendation_slug` added to the answer response and audit event, so the UI can deep-link to the actual recommended pathway (previously the dashboard card's buttons were hardcoded to General/Neglect regardless of what was recommended — fixed to one dynamic "Open Recommended CEP" button).

### 4.5 Pop-up CEP Runner with Return-to-Form  *(UX requested during build)*

`PathwayTriggerModal.tsx` — when a trigger fires while filling a survey:
1. A **purple banner** appears instantly above the questions: *"Another CEP triggered — <message>"* with **[Open now] [Later]**.
2. **Open now** → a **pop-up (modal)** opens over the current form with the triggered CEP's questions (same survey case — answers save for real), grouped by section, with the same visibility logic (follow-ups, skips).
3. **Nested triggers stack**: if a question inside the pop-up triggers yet another CEP, it pushes deeper; a breadcrumb shows the chain (*Current survey → infection-control-cep → neglect-cep*). A loop guard prevents two CEPs that trigger each other from ping-ponging.
4. When all visible questions are answered the footer button turns green: **"Done — return to previous form"** — popping back level by level until the user lands on the original form **exactly where they left off** (it stayed mounted underneath; data refreshes on close).
5. Flags/citations raised inside the pop-up show as chips and count toward the same survey's findings and 2567 report.

### 4.6 Visual Decision Tree ("Flow View")

`PathwayFlowView.tsx` — a **"Flow View"** button on every pathway's sections page opens a full-screen read-only diagram:
- numbered sections with connector lines, question cards in order,
- follow-up questions nested under their parent with "Asked only when answered 'No'",
- color-coded rule chips with a legend: Flag (orange), Citation (amber), Triggers another CEP (purple), Reveals section (blue), Go-to/skip (indigo), evidence/note requirements (teal).

### 4.7 Imported Pathways Are Fully Executable  *(Requirement 7)*

The runtime previously hardcoded 3 pathway screens. Added:
- `GET /api/pathways` — list endpoint (slug, title, is_active),
- dynamic route `/app/pathway/:slug` rendering the standard survey screen for any pathway,
- dynamic sidebar navigation entries for every active non-core pathway.

Net effect: **a pathway imported from a PDF minutes ago can be opened from the sidebar of a new survey and executed end-to-end** — branching, flags, citations, completion, and inclusion in the CMS-2567 report.

### 4.8 Smaller fixes & hardening

- Duplicate survey names: creating a survey with an existing name used to crash with a raw 500 ("Failed to fetch" in the browser); now returns a clear message: *"A survey named 'X' already exists. Please choose a different name."*
- Extraction endpoint rejects non-PDF/empty files cleanly; slug & question-code conflicts with existing pathways are auto-resolved at extraction time.
- Port remapping (see §6) performed without touching the user's other running projects; frontend's two hardcoded `localhost:8000` URLs replaced with the shared `API_BASE` constant.

---

## 5. End-to-End Data Flow (How It All Connects)

```
CEP PDF (CMS-20072 / CMS-20130 / any)
        │  upload (drag & drop)
        ▼
POST /api/admin/workflows/extract-pdf
        │  pypdf text extraction → OpenAI gpt-4o (fallback: heuristic parser)
        ▼
AdminWorkflowPayload JSON  (pathway → sections → nodes → choices → rules)
        │  user reviews/edits title & slug in preview modal → "Import as Pathway"
        ▼
POST /api/admin/workflows/import-pack   (additive — existing pathways untouched)
        │  flattens into: pathway / section / node / choice / transition / rule_action
        ▼
Workflow Builder  (edit prompts, choices, follow-ups, branching rules → Apply Changes)
Flow View         (visual decision tree)
        ▼
New survey case  (every active pathway attached, incl. imported ones)
        │  surveyor answers questions
        ▼
evaluate_answer(): match transition → run rule actions → reconcile on changes
        │  flags / citations / validation issues / recommendations (+ slug)
        │  frontend: follow-up reveal (parent="No"), goto skips, trigger banner → pop-up runner
        ▼
Complete Pathway  (skipped/hidden questions excluded from requirements)
        ▼
CMS-2567 deficiency report PDF  (citations with F-tags + findings)
```

---

## 6. Environment & Setup Details

| Component | Detail |
|---|---|
| Repo folders | `tcs-latest-cep-demo-backend/`, `tcs-latest-cep-demo-frontend/` |
| Postgres | Docker container `cms_survey_postgres`, host port **5435** (remapped from 5432 — conflict with other local projects), db `cms_survey`, user `cms_user` / pass `cms_pass` |
| Backend API | uvicorn on port **8010** (remapped from 8000), Python **3.12** venv (`.venv`) |
| Frontend | Vite dev server on port **5173** |
| Backend `.env` | `DATABASE_URL`, `CORS_ORIGINS`, `OPENAI_API_KEY` |
| Frontend `.env` | `VITE_API_BASE_URL=http://localhost:8010` |
| OpenAI model | `gpt-4o` (set in `app/config.py`; `gpt-4o-mini` was tested and extracted too few questions) |
| Extraction cost | roughly $0.01–0.03 per PDF extraction |
| Sample PDFs | `sample-pdfs/CMS-20072-General.pdf`, `sample-pdfs/CMS-20130-Neglect-10.24.22.pdf` (the real CMS documents from the client email), `sample-pdfs/Neglect_CEP.pdf` (synthetic test file) |

**Start commands:**

```bash
# Backend
cd tcs-latest-cep-demo-backend
docker compose up -d postgres
source .venv/bin/activate
uvicorn app.main:app --reload --port 8010

# Frontend
cd tcs-latest-cep-demo-frontend
npm run dev          # http://localhost:5173/
```

**Key URLs:**
- App: `http://localhost:5173/app`
- Workflow Builder (authoring + PDF upload): `http://localhost:5173/app/admin/workflows`
- API docs (Swagger): `http://localhost:8010/docs`

**OpenAI key notes (learned the hard way):**
- The key lives only in the backend `.env`; uvicorn must be restarted after changing it (auto-reload watches `.py` files only).
- Keys get revoked if exposed publicly; accounts without billing credits return `insufficient_quota` even with a valid key. **Verify the key works on demo morning** (a 30-second test).
- If OpenAI is unreachable during the demo, extraction silently falls back to the text parser with a visible notice — the demo cannot hard-fail.

---

## 7. Suggested 5-Minute Demo Flow

1. **Set the scene (30s):** "CEPs are the government's investigation checklists — decision trees published as PDFs. Today, converting one into a digital survey takes a developer days of manual JSON work. Watch this instead."
2. **Upload (60s):** Workflow Builder → "Create Pathway from PDF" → drop the **real CMS-20130 Neglect CEP** (the very document the client's GM emailed). ~30s later: preview with "AI Extracted" badge, ~25 questions in 7 sections, **F600–F947 citation rules pre-wired**. Rename → Import.
3. **Authoring (60s):** Click into the new pathway → open a question → show the **Branching Rules** editor: add *"When answer is No → Go to a specific question / Trigger Infection Control CEP"* → **Apply Changes**. (Point at the "CMS Question Packs — Coming Soon" cards as the old manual way.)
4. **Visualize (30s):** **Flow View** — the decision tree with follow-ups, citations, triggers.
5. **Execute (90s):** New survey → open the imported pathway from the sidebar → answer "No" → **follow-up appears**; the goto rule **skips ahead** (numbering jumps); the trigger rule shows the **purple banner → pop-up opens the other CEP → answer → "Done — return to previous form"**.
6. **Close (30s):** Complete pathway → Findings Summary → download the **CMS-2567 PDF** with the citations. "From government PDF to executable, intelligent survey — minutes, not days, and no developer in the loop."

---

## 8. Honest Limitations & Talking Points (if asked)

| Topic | Reality | Suggested framing |
|---|---|---|
| Trigger = recommendation, not forced jump | Triggering a CEP raises a banner/pop-up; the surveyor chooses to enter it | "System recommends, surveyor decides — mirrors the regulatory process where the document instructs a human" |
| Follow-up trigger condition | Follow-ups always appear when parent = **"No"** (platform convention); not configurable per-choice yet | Rephrase questions so the problem answer is "No"; making it configurable is a small planned enhancement |
| Seeded pathways' special logic | A few advanced behaviors of the 3 original pathways are hardcoded Python (e.g., mandatory Harm section) | Imported pathways use the fully generic rule engine — which is everything shown in the demo |
| Extraction quality | gpt-4o output is strong but not guaranteed perfect — that's why the editable preview/authoring step exists | "AI drafts, human approves" is the designed workflow, not a workaround |
| Demo-grade scope | Single-user, no auth, local deployment, costs pennies per extraction | Matches Sankar's directive: communicate the concept in 5 minutes |

---

## 9. Inventory of Changes (for engineers)

**New backend files/endpoints:**
- `app/services/pdf_extract.py` — text extraction, OpenAI prompt & call, heuristic fallback, normalization
- `POST /api/admin/workflows/extract-pdf` — PDF → reviewable payload
- `GET /api/pathways` — pathway list for dynamic UI
- `requirements.txt` — added `pypdf`, `openai`
- `app/config.py` — `openai_api_key`, `openai_model` settings

**Modified backend:**
- `app/schemas.py` — `PdfExtractResultOut`; `NextStepOut.recommendation_slug`
- `app/services/workflow.py` — recommendation slug propagation (incl. the two hardcoded recommendations)
- `app/main.py` — extract endpoint; goto-skip exclusion in pathway-completion check; recommendation event carries `target_slug`; duplicate-survey-name returns friendly 409

**New frontend files:**
- `src/pages/admin/workflows/PdfImportSection.tsx` — upload card + extraction preview modal
- `src/pages/admin/workflows/PathwayFlowView.tsx` — decision-tree Flow View
- `src/components/PathwayTriggerModal.tsx` — pop-up CEP runner (stack, breadcrumb, highlight/scroll-to-question)

**Modified frontend:**
- `QuestionEditForm.tsx` — full branching-rule editor (7 action types incl. two-dropdown cross-pathway goto); follow-up parent dropdown
- `WorkflowBuilderPage.tsx` — Apply/Discard Changes buttons (save was previously unreachable)
- `PathwaysTable.tsx` — clickable rows; hosts the PDF import section
- `SectionsTable.tsx` — Flow View button
- `App.tsx` — trigger banner + pop-up wiring; cross-pathway goto detection; goto skip visibility + progress/requirements; dynamic `/app/pathway/:slug` route; dynamic recommendation card; `API_BASE` usage
- `AppShell.tsx` — dynamic sidebar entries for imported pathways
- `api.ts`, `types.ts` — `adminExtractPdf`, `listPathways`, new types

**Verification performed:** every feature exercised end-to-end (extraction on both real CMS PDFs through gpt-4o; import; rule editing persisted; goto-skip honored by frontend and by the backend completion gate; trigger slug propagation; pop-up flow; survey completion; cleanup of all test data).

---

*Document generated as the single source of truth for the CEP Authoring demo. For the deeper story of how the pre-existing engine works internally (table-by-table, function-by-function), see the conversation notes or ask for the technical appendix.*
