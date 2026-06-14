#!/usr/bin/env python3
"""
Demo Seed Script — Seeds 6 realistic surveys via the REST API.

Run with:  python backend/demo_seed.py
Requires:  Backend running on http://localhost:8000

Creates:
  1. Oakwood Care Center        — COMPLETED  (2 citations: F684, F609)
  2. Palm Gardens Rehabilitation — COMPLETED  (6 citations: F684, F609, F610, F600, F943, F880)
  3. Sunrise Senior Living       — IN PROGRESS (General CEP done with F684; Neglect started)
  4. Riverside Health Center     — IN PROGRESS (General CEP started — observations only)
  5. Bayshore Nursing Facility   — NEW
  6. Oakwood Care Center         — NEW (Complaint Investigation)
"""

import sys
import random
from datetime import datetime, timedelta
import requests

BASE = "http://localhost:8000"

# ────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────

node_map: dict = {}  # node_code → {"id": str, "choices": {"Yes": id, "No": id}}


def load_pathways():
    """Fetch all 3 pathway definitions and build a node/choice lookup."""
    global node_map
    for slug in ("general-cep", "neglect-cep", "infection-control-cep"):
        r = requests.get(f"{BASE}/api/pathways/{slug}")
        r.raise_for_status()
        pw = r.json()
        for section in pw["sections"]:
            for node in section["nodes"]:
                choices = {c["label"]: c["id"] for c in node["choices"]}
                node_map[node["code"]] = {"id": node["id"], "choices": choices}
    print(f"  Mapped {len(node_map)} nodes across 3 pathways")


def create_case(name: str, facility: str, resident_id: str) -> str:
    r = requests.post(f"{BASE}/api/cases", json={
        "external_case_id": name,
        "resident_id": resident_id,
        "facility_name": facility,
    })
    r.raise_for_status()
    return r.json()["id"]


def ans(case_id: str, pathway_slug: str, node_code: str, choice_label: str, notes: str = ""):
    """Submit a single answer through the workflow engine."""
    node = node_map[node_code]
    r = requests.post(f"{BASE}/api/cases/{case_id}/answers", json={
        "pathway_slug": pathway_slug,
        "node_id": node["id"],
        "choice_id": node["choices"][choice_label],
        "notes": notes,
        "evidence_refs": {},
    })
    if not r.ok:
        print(f"    ✗ FAILED {node_code}={choice_label}: {r.status_code} {r.text[:200]}")
        r.raise_for_status()
    return r.json()


def add_evidence(case_id: str, description: str):
    r = requests.post(f"{BASE}/api/cases/{case_id}/evidence", json={
        "description": description,
        "source_type": "manual",
    })
    r.raise_for_status()
    return r.json()


# Pathway slug shortcuts
G = "general-cep"
N = "neglect-cep"
I = "infection-control-cep"


# ────────────────────────────────────────────────────────────
# Survey Builders
# ────────────────────────────────────────────────────────────

def seed_survey_1():
    """Oakwood Care Center — COMPLETED (2 citations: F684, F609)
    Showcases: Branching, harm escalation, citation + evidence, full pathway completion.
    """
    print("\n━━ Survey 1: Oakwood Care Center (Completed, 2 citations) ━━")
    cid = create_case(
        "Q1 2026 Annual Recertification - Oakwood",
        "Oakwood Care Center",
        "RES-1001",
    )
    print(f"  Case: {cid[:8]}…")

    # Evidence BEFORE gen_dec_1=No (validation requires ≥1 evidence item)
    add_evidence(cid, "Night shift observation notes documenting care plan deviations — 02/28/2026")
    print("  Evidence: EVID-01 added")

    # ── General CEP ──
    ans(cid, G, "gen_obs_1", "No")       # care interventions inconsistent
    ans(cid, G, "gen_obs_1_a", "Yes")     # multi-staff deviations
    ans(cid, G, "gen_obs_1_b", "No")      # no system-level factors
    ans(cid, G, "gen_obs_2", "Yes")       # observations match assessment
    ans(cid, G, "gen_rec_1", "Yes")       # assessments timely
    ans(cid, G, "gen_rec_2", "Yes")       # care plan developed
    # Harm section required (gen_obs_1=No)
    ans(cid, G, "gen_harm_1", "Yes")      # harm found → escalation to Neglect
    # gen_harm_1=Yes skips sub-questions, transitions to gen_dec_1
    ans(cid, G, "gen_dec_1", "No",        # F684 citation generated
        notes="Resident care plan dated 01/15/2026 not followed. Staff observed skipping "
              "prescribed repositioning schedule during night shift observation on 02/28/2026.")
    ans(cid, G, "gen_dec_1_a", "Yes")     # failures due to knowledge deficits
    ans(cid, G, "gen_dec_1_b", "No")      # no corrective actions initiated
    # gen_dec_1_b is terminal → General CEP auto-completes
    print("  General CEP ✓  (F684)")

    # ── Neglect CEP ──
    ans(cid, N, "neg_int_1", "Yes")       # neglect suspected
    ans(cid, N, "neg_rec_1", "No")        # reporting failure → F609
    ans(cid, N, "neg_rec_1_a", "No")      # not lack of awareness
    ans(cid, N, "neg_rec_1_b", "No")      # no prior reporting failures
    ans(cid, N, "neg_inv_1", "Yes")       # thorough investigation done
    ans(cid, N, "neg_sup_1", "Yes")       # sufficient staff
    ans(cid, N, "neg_qa_1", "Yes")        # corrective actions taken → terminal
    print("  Neglect CEP ✓  (F609)")

    # ── Infection Control ──
    ans(cid, I, "inf_prev_1", "Yes")      # prevention practices OK
    ans(cid, I, "inf_mon_1", "Yes")       # monitoring OK
    ans(cid, I, "inf_ord_1", "Yes")       # physician orders OK
    # Harm section NOT required (all above = Yes) — skip inf_harm_1
    ans(cid, I, "inf_dec_1", "Yes")       # program effective → terminal, clean
    print("  Infection Control ✓  (clean)")

    print("  ✓ Survey 1 seeded — Completed, Moderate Risk (~84/100)")
    return cid


def seed_survey_2():
    """Palm Gardens — COMPLETED, HIGH RISK (6 citations: F684, F609, F610, F600, F943, F880)
    Showcases: Maximum citations, multi-pathway failures, high-severity flags.
    """
    print("\n━━ Survey 2: Palm Gardens Rehabilitation (Completed, 6 citations, HIGH RISK) ━━")
    cid = create_case(
        "Complaint Investigation - Palm Gardens",
        "Palm Gardens Rehabilitation",
        "RES-2045",
    )
    print(f"  Case: {cid[:8]}…")

    add_evidence(cid, "Environmental observation report and staff interview documentation — 03/01/2026")
    print("  Evidence: EVID-01 added")

    # ── General CEP ──
    ans(cid, G, "gen_obs_1", "Yes")       # care interventions OK
    ans(cid, G, "gen_obs_2", "No")        # observations don't match assessment
    ans(cid, G, "gen_obs_2_a", "No")      # discrepancies not communicated
    ans(cid, G, "gen_obs_2_b", "Yes")     # condition change requiring reassessment
    ans(cid, G, "gen_rec_1", "No")        # assessments NOT timely
    ans(cid, G, "gen_rec_1_a", "Yes")     # pattern affecting other residents
    ans(cid, G, "gen_rec_1_b", "Yes")     # missed changes in condition
    ans(cid, G, "gen_rec_2", "Yes")       # care plan developed
    # Harm required (gen_obs_2=No, gen_rec_1=No)
    ans(cid, G, "gen_harm_1", "Yes")      # harm found → escalation
    ans(cid, G, "gen_dec_1", "No",        # F684 citation
        notes="Multiple care deficiencies observed across shifts. Assessment documentation does "
              "not reflect current resident condition. Night shift coverage inadequate for "
              "acuity levels. Systematic failures in care planning process.")
    ans(cid, G, "gen_dec_1_a", "Yes")     # knowledge deficits/systemic issues
    ans(cid, G, "gen_dec_1_b", "No")      # no corrective actions → terminal
    print("  General CEP ✓  (F684)")

    # ── Neglect CEP ──
    ans(cid, N, "neg_int_1", "Yes")       # neglect suspected
    ans(cid, N, "neg_rec_1", "No")        # reporting failure → F609
    ans(cid, N, "neg_rec_1_a", "Yes")     # lack of awareness of reporting
    ans(cid, N, "neg_rec_1_b", "Yes")     # prior reporting failures
    ans(cid, N, "neg_inv_1", "No")        # investigation incomplete → F610
    ans(cid, N, "neg_inv_1_a", "No")      # witnesses not interviewed
    ans(cid, N, "neg_inv_1_b", "No")      # no root cause analysis
    ans(cid, N, "neg_sup_1", "No")        # insufficient staff → F600
    ans(cid, N, "neg_sup_1_a", "Yes")     # below minimum staffing
    ans(cid, N, "neg_sup_1_b", "No")      # inappropriate assignments
    ans(cid, N, "neg_qa_1", "No")         # no corrective actions → F943
    ans(cid, N, "neg_qa_1_a", "No")       # QAPI not reviewed
    ans(cid, N, "neg_qa_1_b", "No")       # no interim measures → terminal
    print("  Neglect CEP ✓  (F609, F610, F600, F943)")

    # ── Infection Control ──
    ans(cid, I, "inf_prev_1", "No")       # prevention practices failed
    ans(cid, I, "inf_prev_1_a", "Yes")    # specific protocols deficient
    ans(cid, I, "inf_prev_1_b", "No")     # staff don't know policies
    ans(cid, I, "inf_mon_1", "Yes")       # monitoring OK
    ans(cid, I, "inf_ord_1", "Yes")       # physician orders OK
    # Harm required (inf_prev_1=No)
    ans(cid, I, "inf_harm_1", "No")       # no confirmed harm/spread
    ans(cid, I, "inf_harm_1_a", "Yes")    # containment effective
    ans(cid, I, "inf_harm_1_b", "Yes")    # ongoing transmission risk
    ans(cid, I, "inf_dec_1", "No")        # program NOT effective → F880
    ans(cid, I, "inf_dec_1_a", "No")      # no designated IP
    ans(cid, I, "inf_dec_1_b", "Yes")     # antibiotic stewardship OK → terminal
    print("  Infection Control ✓  (F880)")

    print("  ✓ Survey 2 seeded — Completed, High Risk (~52/100)")
    return cid


def seed_survey_3():
    """Sunrise Senior Living — IN PROGRESS (General CEP done, Neglect started, Infection not started)
    Showcases: Mid-workflow progress, branching visible, partial completion.
    """
    print("\n━━ Survey 3: Sunrise Senior Living (In Progress, 1 citation) ━━")
    cid = create_case(
        "Q1 2026 Annual Recertification - Sunrise",
        "Sunrise Senior Living",
        "RES-3022",
    )
    print(f"  Case: {cid[:8]}…")

    add_evidence(cid, "Staff training records and observation documentation — 02/20/2026")
    print("  Evidence: EVID-01 added")

    # ── General CEP (fully answered → auto-completes) ──
    ans(cid, G, "gen_obs_1", "No")        # care interventions inconsistent
    ans(cid, G, "gen_obs_1_a", "No")      # not multi-staff
    ans(cid, G, "gen_obs_1_b", "Yes")     # system-level factors
    ans(cid, G, "gen_obs_2", "Yes")       # observations match
    ans(cid, G, "gen_rec_1", "Yes")       # assessments timely
    ans(cid, G, "gen_rec_2", "Yes")       # care plan developed
    # Harm required (gen_obs_1=No)
    ans(cid, G, "gen_harm_1", "No")       # no harm found
    ans(cid, G, "gen_harm_1_a", "Yes")    # preventive measures in place
    ans(cid, G, "gen_harm_1_b", "No")     # no future harm risk
    ans(cid, G, "gen_dec_1", "No",        # F684 citation
        notes="Care plan interventions not consistently implemented. Staff training gaps "
              "identified during observation period 02/15-02/20/2026. Repositioning protocol "
              "missed on 3 documented occasions.")
    ans(cid, G, "gen_dec_1_a", "No")      # not knowledge deficits — individual performance
    ans(cid, G, "gen_dec_1_b", "No")      # no corrective actions → terminal
    print("  General CEP ✓  (F684)")

    # ── Neglect CEP (only one answer → in_progress) ──
    ans(cid, N, "neg_int_1", "Yes")       # neglect suspected — leaves survey at this point
    print("  Neglect CEP: in progress (1 of 5 sections)")

    # ── Infection Control: no answers → not_started ──
    print("  Infection Control: not started")

    print("  ✓ Survey 3 seeded — In Progress")
    return cid


def seed_survey_4():
    """Riverside Health Center — IN PROGRESS (General CEP observations done, rest not started)
    Showcases: Early-stage progress, clean observations.
    """
    print("\n━━ Survey 4: Riverside Health Center (In Progress, 0 citations) ━━")
    cid = create_case(
        "Q1 2026 Annual Recertification - Riverside",
        "Riverside Health Center",
        "RES-4010",
    )
    print(f"  Case: {cid[:8]}…")

    # ── General CEP (only observations section) ──
    ans(cid, G, "gen_obs_1", "Yes")       # care interventions OK
    ans(cid, G, "gen_obs_2", "Yes")       # observations match assessment
    print("  General CEP: in progress (observations done, 2 of 4+ sections)")

    # ── Neglect CEP: not started ──
    # ── Infection Control: not started ──
    print("  Neglect CEP: not started")
    print("  Infection Control: not started")

    print("  ✓ Survey 4 seeded — In Progress (early stage)")
    return cid


def seed_survey_5():
    """Bayshore Nursing — NEW (just created, 0% progress)."""
    print("\n━━ Survey 5: Bayshore Nursing Facility (New) ━━")
    cid = create_case(
        "Q1 2026 Annual Recertification - Bayshore",
        "Bayshore Nursing Facility",
        "RES-5005",
    )
    print(f"  Case: {cid[:8]}…")
    print("  ✓ Survey 5 seeded — New")
    return cid


def seed_survey_6():
    """Oakwood Care Center — NEW, Complaint Investigation (same facility as Survey 1)."""
    print("\n━━ Survey 6: Oakwood Care Center (New, Complaint Investigation) ━━")
    cid = create_case(
        "Complaint Investigation - Oakwood",
        "Oakwood Care Center",
        "RES-6001",
    )
    print(f"  Case: {cid[:8]}…")
    print("  ✓ Survey 6 seeded — New")
    return cid


# ────────────────────────────────────────────────────────────
# Backdated Cases — lightweight cases for time-series charts
# ────────────────────────────────────────────────────────────

FACILITIES = [
    "Oakwood Care Center",
    "Palm Gardens Rehabilitation",
    "Sunrise Senior Living",
    "Riverside Health Center",
    "Bayshore Nursing Facility",
]

CITATION_TAGS = ["F684", "F609", "F610", "F600", "F943", "F880"]

# date, facility_index, status, num_citations
BACKDATED_CASES = [
    # Dec 2025 — 6 cases
    ("2025-12-04", 0, "completed", 1),
    ("2025-12-09", 1, "completed", 2),
    ("2025-12-14", 2, "completed", 0),
    ("2025-12-18", 3, "in_progress", 0),
    ("2025-12-22", 4, "completed", 1),
    ("2025-12-28", 0, "in_progress", 0),
    # Jan 2026 — 12 cases
    ("2026-01-03", 1, "completed", 1),
    ("2026-01-05", 2, "completed", 2),
    ("2026-01-08", 3, "completed", 0),
    ("2026-01-10", 4, "in_progress", 0),
    ("2026-01-12", 0, "completed", 1),
    ("2026-01-15", 1, "completed", 3),
    ("2026-01-17", 2, "in_progress", 0),
    ("2026-01-20", 3, "completed", 1),
    ("2026-01-22", 4, "completed", 0),
    ("2026-01-25", 0, "in_progress", 0),
    ("2026-01-27", 1, "new", 0),
    ("2026-01-30", 2, "completed", 2),
    # Feb 2026 — 11 cases
    ("2026-02-02", 3, "completed", 1),
    ("2026-02-04", 4, "completed", 0),
    ("2026-02-07", 0, "completed", 2),
    ("2026-02-10", 1, "in_progress", 0),
    ("2026-02-12", 2, "completed", 1),
    ("2026-02-14", 3, "in_progress", 0),
    ("2026-02-17", 4, "completed", 0),
    ("2026-02-19", 0, "completed", 1),
    ("2026-02-22", 1, "new", 0),
    ("2026-02-25", 2, "completed", 3),
    ("2026-02-28", 3, "in_progress", 0),
]


def seed_backdated_cases():
    """Create ~31 lightweight cases with backdated timestamps for time-series charts.
    Uses API to create cases, then direct DB access to backdate created_at and update statuses.
    """
    import sys as _sys
    _sys.path.insert(0, "backend")
    from sqlalchemy import update
    from app.database import SessionLocal
    from app import models as db_models

    print("\n━━ Seeding backdated cases for time-series charts ━━")

    case_ids = []
    for idx, (date_str, fac_idx, status, num_cit) in enumerate(BACKDATED_CASES):
        facility = FACILITIES[fac_idx]
        ext_id = f"HIST-{date_str}-{fac_idx}"
        res_id = f"RES-H{idx + 100}"

        cid = create_case(ext_id, facility, res_id)
        case_ids.append((cid, date_str, status, num_cit))

    print(f"  Created {len(case_ids)} historical cases via API")

    # Now backdate and update statuses via direct DB access
    db = SessionLocal()
    try:
        for cid, date_str, status, num_cit in case_ids:
            target_dt = datetime.fromisoformat(date_str + "T10:00:00")

            # Update case created_at and status
            db.execute(
                update(db_models.Case)
                .where(db_models.Case.id == cid)
                .values(created_at=target_dt, status=status)
            )

            # Update CasePathway records
            if status == "completed":
                db.execute(
                    update(db_models.CasePathway)
                    .where(db_models.CasePathway.case_id == cid)
                    .values(
                        status="completed",
                        started_at=target_dt,
                        completed_at=target_dt + timedelta(days=random.randint(1, 5)),
                    )
                )
            elif status == "in_progress":
                db.execute(
                    update(db_models.CasePathway)
                    .where(db_models.CasePathway.case_id == cid)
                    .values(status="in_progress", started_at=target_dt)
                )

            # Add citations for cases that need them
            if num_cit > 0:
                tags = random.sample(CITATION_TAGS, min(num_cit, len(CITATION_TAGS)))
                # Get a pathway id for citations
                pw_row = db.execute(
                    db_models.CasePathway.__table__.select()
                    .where(db_models.CasePathway.case_id == cid)
                    .limit(1)
                ).first()
                pw_id = pw_row.pathway_id if pw_row else None

                for tag in tags:
                    import uuid
                    db.execute(
                        db_models.CaseCitation.__table__.insert().values(
                            id=uuid.uuid4(),
                            case_id=cid,
                            pathway_id=pw_id,
                            tag=tag,
                            rationale=f"Historical citation for {tag}",
                            created_at=target_dt + timedelta(hours=random.randint(1, 48)),
                        )
                    )

        db.commit()
        print(f"  ✓ Backdated {len(case_ids)} cases (Dec 2025 → Feb 2026)")

        # Summary
        status_counts = {}
        for _, _, s, _ in case_ids:
            status_counts[s] = status_counts.get(s, 0) + 1
        total_cit = sum(nc for _, _, _, nc in case_ids)
        print(f"    Statuses: {status_counts}")
        print(f"    Total citations added: {total_cit}")

    finally:
        db.close()


# ────────────────────────────────────────────────────────────
# Verify
# ────────────────────────────────────────────────────────────

def verify():
    """Fetch all cases and print verification summary."""
    r = requests.get(f"{BASE}/api/cases")
    r.raise_for_status()
    cases = r.json()

    status_counts = {"new": 0, "in_progress": 0, "completed": 0}
    facilities = set()
    for case in cases:
        status_counts[case["status"]] = status_counts.get(case["status"], 0) + 1
        facilities.add(case["facility_name"])

    print("\n╔══════════════════════════════════════════════════╗")
    print("║           DEMO SEED VERIFICATION                ║")
    print("╠══════════════════════════════════════════════════╣")
    print(f"║  Total Surveys:   {len(cases):>3}                            ║")
    print(f"║  Completed:       {status_counts.get('completed', 0):>3}                            ║")
    print(f"║  In Progress:     {status_counts.get('in_progress', 0):>3}                            ║")
    print(f"║  New:             {status_counts.get('new', 0):>3}                            ║")
    print(f"║  Facilities:      {len(facilities):>3}                            ║")
    print("╠══════════════════════════════════════════════════╣")

    for case in cases:
        name = case["external_case_id"][:40]
        status = case["status"].upper()
        print(f"║  {status:>11}  {name:<35} ║")

    print("╚══════════════════════════════════════════════════╝")

    # Verify expected counts (6 original + 31 backdated = 37 total)
    expected_total = 6 + len(BACKDATED_CASES)
    ok = True
    if len(cases) != expected_total:
        print(f"  ✗ Expected {expected_total} surveys, got {len(cases)}")
        ok = False
    if ok:
        print("\n  ✓ All checks passed!")
    print(f"\n  Open http://localhost:5173/app to view the demo data\n")


# ────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────

def main():
    print("=" * 55)
    print("  TCS Survey Readiness Tool — Demo Data Seeder")
    print("=" * 55)

    # Check backend is running
    try:
        r = requests.get(f"{BASE}/health", timeout=5)
        r.raise_for_status()
    except Exception as e:
        print(f"\n  ✗ Backend not reachable at {BASE}")
        print(f"    Start it with: cd backend && uvicorn app.main:app --reload --port 8000")
        print(f"    Error: {e}")
        sys.exit(1)
    print(f"\n  ✓ Backend running at {BASE}")

    # Purge existing data
    r = requests.delete(f"{BASE}/api/cases")
    r.raise_for_status()
    print("  ✓ Purged all existing cases")

    # Load pathway definitions
    load_pathways()

    # Seed all 6 surveys
    try:
        seed_survey_1()
        seed_survey_2()
        seed_survey_3()
        seed_survey_4()
        seed_survey_5()
        seed_survey_6()
    except requests.HTTPError as e:
        print(f"\n  ✗ Seeding failed: {e}")
        print(f"    Response: {e.response.text[:500] if e.response else 'N/A'}")
        sys.exit(1)

    # Seed backdated cases for time-series charts
    try:
        seed_backdated_cases()
    except Exception as e:
        print(f"\n  ✗ Backdated seeding failed: {e}")
        sys.exit(1)

    # Backdate the original 6 cases to early March 2026
    try:
        import sys as _sys
        _sys.path.insert(0, "backend")
        from sqlalchemy import update, select as sa_select
        from app.database import SessionLocal
        from app import models as db_models

        db = SessionLocal()
        orig_cases = db.execute(
            sa_select(db_models.Case)
            .where(db_models.Case.external_case_id.notin_(
                [f"HIST-{d}-{f}" for d, f, _, _ in BACKDATED_CASES]
            ))
            .order_by(db_models.Case.created_at)
        ).scalars().all()

        march_dates = [
            datetime(2026, 3, 1, 9, 0),
            datetime(2026, 3, 1, 14, 0),
            datetime(2026, 3, 2, 10, 0),
            datetime(2026, 3, 2, 15, 0),
            datetime(2026, 3, 3, 11, 0),
            datetime(2026, 3, 3, 16, 0),
        ]
        for i, c in enumerate(orig_cases[:6]):
            db.execute(
                update(db_models.Case)
                .where(db_models.Case.id == c.id)
                .values(created_at=march_dates[i % len(march_dates)])
            )
        db.commit()
        db.close()
        print(f"\n  ✓ Backdated original 6 cases to early March 2026")
    except Exception as e:
        print(f"\n  ⚠ Could not backdate original cases: {e}")

    # Verify
    verify()


if __name__ == "__main__":
    main()
