from sqlalchemy import select

from app.database import SessionLocal
from app.models import Choice, Node, Pathway, RuleAction, Section, Transition


GENERAL_SECTIONS = [
    {
        "slug": "observations",
        "title": "Observations Across Various Shifts",
        "nodes": [
            {
                "code": "gen_obs_1",
                "prompt": "Does staff consistently implement the care-planned interventions?",
                "choices": ["Yes", "No"],
                "sub_questions": [
                    {
                        "code": "gen_obs_1_a",
                        "prompt": "Were the deviations from the care plan observed across multiple staff members or shifts?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "gen_obs_1_b",
                        "prompt": "Were there system-level factors (e.g., staffing shortages, inadequate training) contributing to the inconsistency?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
            {
                "code": "gen_obs_2",
                "prompt": "Do observations of the resident match the assessment?",
                "choices": ["Yes", "No"],
                "sub_questions": [
                    {
                        "code": "gen_obs_2_a",
                        "prompt": "Were the discrepancies between observations and the assessment documented and communicated to the care team?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "gen_obs_2_b",
                        "prompt": "Did the discrepancy indicate a change in the resident's condition that required reassessment?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
    {
        "slug": "records",
        "title": "Record Review",
        "nodes": [
            {
                "code": "gen_rec_1",
                "prompt": "Were required assessments (comprehensive or significant change) completed timely?",
                "choices": ["Yes", "No"],
                "sub_questions": [
                    {
                        "code": "gen_rec_1_a",
                        "prompt": "Was the delay in completing assessments a pattern affecting other residents as well?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "gen_rec_1_b",
                        "prompt": "Did the untimely assessment result in missed changes to the resident's condition or care needs?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
            {
                "code": "gen_rec_2",
                "prompt": "Was a resident-specific care plan developed and revised when necessary?",
                "choices": ["Yes", "No"],
                "sub_questions": [
                    {
                        "code": "gen_rec_2_a",
                        "prompt": "Were the deficiencies in the care plan related to specific care areas (e.g., nutrition, mobility, medications)?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "gen_rec_2_b",
                        "prompt": "Did the lack of an updated care plan result in staff using outdated or incorrect interventions?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
    {
        "slug": "harm",
        "title": "Harm Determination",
        "nodes": [
            {
                "code": "gen_harm_1",
                "prompt": "Did the failure result in actual harm or potential for harm?",
                "choices": ["Yes", "No"],
                "sub_questions": [
                    {
                        "code": "gen_harm_1_a",
                        "prompt": "Were any preventive measures already in place that mitigated the risk of harm?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "gen_harm_1_b",
                        "prompt": "Is there potential for future harm if the identified failure is not corrected?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
    {
        "slug": "decisions",
        "title": "Critical Element Decisions",
        "nodes": [
            {
                "code": "gen_dec_1",
                "prompt": "Did the facility ensure the resident received treatment and care in accordance with professional standards of practice and the care plan?",
                "choices": ["Yes", "No"],
                "citation_tag": "F684",
                "citation_rationale": "Facility failed to ensure treatment and care were provided according to professional standards and the care plan.",
                "sub_questions": [
                    {
                        "code": "gen_dec_1_a",
                        "prompt": "Were the failures due to knowledge deficits, systemic issues, or individual staff performance?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "gen_dec_1_b",
                        "prompt": "Has the facility demonstrated awareness of the deficiency and initiated any corrective actions?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
]


NEGLECT_SECTIONS = [
    {
        "slug": "interviews",
        "title": "Interviews with Staff Working During the Time the Alleged Neglect Occurred",
        "nodes": [
            {
                "code": "neg_int_1",
                "prompt": "Was the resident not receiving necessary care and services?",
                "choices": ["Yes", "No"],
                "sub_questions": [
                    {
                        "code": "neg_int_1_a",
                        "prompt": "Did staff interviews indicate awareness of the resident's care needs and service requirements?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "neg_int_1_b",
                        "prompt": "Were there inconsistencies between staff accounts and documented care records?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
    {
        "slug": "records",
        "title": "Record Review",
        "nodes": [
            {
                "code": "neg_rec_1",
                "prompt": "Did the facility report the alleged neglect to required authorities within mandated timeframes?",
                "choices": ["Yes", "No"],
                "citation_tag": "F609",
                "citation_rationale": "Facility did not report alleged neglect to required authorities within mandated timeframes.",
                "sub_questions": [
                    {
                        "code": "neg_rec_1_a",
                        "prompt": "Was the reporting failure due to a lack of awareness of mandated reporting requirements?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "neg_rec_1_b",
                        "prompt": "Were there prior instances of reporting delays or failures at this facility?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
    {
        "slug": "investigator",
        "title": "Facility Investigator Interview",
        "nodes": [
            {
                "code": "neg_inv_1",
                "prompt": "Was a thorough investigation initiated and completed with appropriate documentation?",
                "choices": ["Yes", "No"],
                "citation_tag": "F610",
                "citation_rationale": "Facility did not initiate/complete a thorough documented investigation.",
                "sub_questions": [
                    {
                        "code": "neg_inv_1_a",
                        "prompt": "Were key witnesses and relevant parties interviewed as part of the investigation?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "neg_inv_1_b",
                        "prompt": "Did the investigation include root cause analysis and identification of contributing factors?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
    {
        "slug": "supervision",
        "title": "Supervisory Staff Interviews",
        "nodes": [
            {
                "code": "neg_sup_1",
                "prompt": "Were sufficient numbers of qualified staff deployed to meet resident needs?",
                "choices": ["Yes", "No"],
                "citation_tag": "F600",
                "citation_rationale": "Staffing/supervision levels were insufficient to protect resident from neglect risk.",
                "sub_questions": [
                    {
                        "code": "neg_sup_1_a",
                        "prompt": "Were staffing levels below the facility's own staffing plan or regulatory minimums?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "neg_sup_1_b",
                        "prompt": "Were staff assignments appropriate for the acuity level of the affected residents?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
    {
        "slug": "qa",
        "title": "Quality Assurance Interview",
        "nodes": [
            {
                "code": "neg_qa_1",
                "prompt": "Did the facility take corrective action and implement safeguards to prevent recurrence?",
                "choices": ["Yes", "No"],
                "citation_tag": "F943",
                "citation_rationale": "Corrective action and safeguards were not effectively implemented to prevent recurrence.",
                "sub_questions": [
                    {
                        "code": "neg_qa_1_a",
                        "prompt": "Has the facility's Quality Assurance and Performance Improvement (QAPI) committee reviewed this issue?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "neg_qa_1_b",
                        "prompt": "Were any interim protective measures put in place pending completion of corrective actions?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
]

INFECTION_SECTIONS = [
    {
        "slug": "prevention",
        "title": "Infection Prevention Practices",
        "nodes": [
            {
                "code": "inf_prev_1",
                "prompt": "Were infection prevention and control practices implemented according to facility policy?",
                "choices": ["Yes", "No"],
                "sub_questions": [
                    {
                        "code": "inf_prev_1_a",
                        "prompt": "Were specific protocols (hand hygiene, PPE use, environmental cleaning) identified as deficient?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "inf_prev_1_b",
                        "prompt": "Did staff demonstrate knowledge of infection prevention policies during interviews?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
    {
        "slug": "monitoring",
        "title": "Monitoring & Surveillance",
        "nodes": [
            {
                "code": "inf_mon_1",
                "prompt": "Was the resident appropriately monitored and documented for signs and symptoms of infection?",
                "choices": ["Yes", "No"],
                "sub_questions": [
                    {
                        "code": "inf_mon_1_a",
                        "prompt": "Was there a structured surveillance system in place for tracking infection indicators?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "inf_mon_1_b",
                        "prompt": "Were observed signs or symptoms of infection communicated promptly to medical staff?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
    {
        "slug": "orders",
        "title": "Physician Orders & Isolation Precautions",
        "nodes": [
            {
                "code": "inf_ord_1",
                "prompt": "Were physician orders and isolation precautions followed correctly?",
                "choices": ["Yes", "No"],
                "sub_questions": [
                    {
                        "code": "inf_ord_1_a",
                        "prompt": "Were isolation precaution signs posted and transmission-based precautions clearly communicated to all staff?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "inf_ord_1_b",
                        "prompt": "Were there delays in obtaining or implementing physician orders for infection treatment?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
    {
        "slug": "harm",
        "title": "Harm / Transmission Evaluation",
        "nodes": [
            {
                "code": "inf_harm_1",
                "prompt": "Did the infection control failure result in resident harm or spread of infection?",
                "choices": ["Yes", "No"],
                "sub_questions": [
                    {
                        "code": "inf_harm_1_a",
                        "prompt": "Were any containment measures effective in preventing further transmission?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "inf_harm_1_b",
                        "prompt": "Is there an ongoing risk of transmission if the identified failures are not corrected?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
    {
        "slug": "decisions",
        "title": "Decision Summary",
        "nodes": [
            {
                "code": "inf_dec_1",
                "prompt": "Did the facility maintain an effective infection prevention and control program?",
                "choices": ["Yes", "No"],
                "citation_tag": "F880",
                "citation_rationale": "Facility did not maintain an effective infection prevention and control program.",
                "sub_questions": [
                    {
                        "code": "inf_dec_1_a",
                        "prompt": "Does the facility have a designated Infection Preventionist with appropriate training and authority?",
                        "choices": ["Yes", "No"],
                    },
                    {
                        "code": "inf_dec_1_b",
                        "prompt": "Were antibiotic stewardship practices reviewed and found compliant with current guidelines?",
                        "choices": ["Yes", "No"],
                    },
                ],
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _create_choices(db, node: Node, labels: list[str]) -> list[Choice]:
    """Create Yes/No Choice objects for a node."""
    choices = []
    for c_idx, label in enumerate(labels, start=1):
        choice = Choice(
            node_id=node.id,
            code=label.lower(),
            label=label,
            value=label,
            display_order=c_idx,
        )
        db.add(choice)
        db.flush()
        choices.append(choice)
    return choices


def _attach_main_rule_actions(db, transition: Transition, choice: Choice, node_data: dict) -> None:
    """Attach RuleActions to main-question transitions (citations, flags, recommendations, validation)."""
    code = node_data.get("code", "")

    # --- Citation on "No" for nodes with citation_tag ---
    if choice.label == "No" and node_data.get("citation_tag"):
        db.add(
            RuleAction(
                transition_id=transition.id,
                action_type="add_citation",
                payload={
                    "tag": node_data["citation_tag"],
                    "rationale": node_data["citation_rationale"],
                },
            )
        )
        # Decision node flags
        decision_flag_payload = None
        if code == "gen_dec_1":
            decision_flag_payload = {"code": "GEN_DEC_1_NO", "message": "General Decision #1 answered No", "severity": "high"}
        elif code.startswith("gen_dec_"):
            decision_flag_payload = {"code": f"{code.upper()}_NO", "message": f"{code.replace('_', ' ').title()} answered No", "severity": "warn"}
        elif code == "neg_dec_1":
            decision_flag_payload = {"code": "NEG_DEC_1_NO", "message": "Neglect Decision #1 answered No", "severity": "high"}
        elif code.startswith("neg_dec_"):
            decision_flag_payload = {"code": f"{code.upper()}_NO", "message": f"{code.replace('_', ' ').title()} answered No", "severity": "warn"}
        if decision_flag_payload:
            db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload=decision_flag_payload))

    # --- General CEP observation/record flags ---
    if choice.label == "No" and code == "gen_obs_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "GEN_OBS_CARE_IMPL_FAILURE", "message": "Care-planned interventions may not be consistently implemented.", "severity": "warn",
        }))
    if choice.label == "No" and code == "gen_obs_2":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "GEN_OBS_ASSESSMENT_INCONSISTENCY", "message": "Observed resident condition may not match documented assessment.", "severity": "warn",
        }))
    if choice.label == "No" and code == "gen_rec_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "GEN_REC_ASSESSMENT_TIMELINESS", "message": "Potential F636/F637 concern: required assessments may not be timely.", "severity": "warn",
        }))
    if choice.label == "No" and code == "gen_rec_2":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "GEN_REC_CAREPLAN_REVISION", "message": "Potential F656/F657 concern: care plan may not be developed/revised as needed.", "severity": "warn",
        }))

    # --- General harm escalation ---
    if choice.label == "Yes" and code == "gen_harm_1":
        db.add(RuleAction(transition_id=transition.id, action_type="recommend_pathway", payload={
            "pathway_slug": "neglect-cep", "message": "Failure detected with harm/potential harm. Recommend opening Neglect CEP.",
        }))
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "GEN_HARM_YES_ESCALATE", "message": "Harm or potential for harm identified. Escalation review recommended.", "severity": "high",
        }))
    if choice.label == "No" and code == "gen_harm_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "GEN_HARM_NO_REVIEW", "message": "No harm confirmed, but review findings and determine if escalation is still needed.", "severity": "warn",
        }))

    # --- General decision validation ---
    if choice.label == "No" and code == "gen_dec_1":
        db.add(RuleAction(transition_id=transition.id, action_type="require_evidence_min", payload={
            "min": 1, "code": "GEN_DEC_1_EVIDENCE_MIN", "message": "Please attach at least 1 evidence item for General Decision #1.", "severity": "warn",
        }))
        db.add(RuleAction(transition_id=transition.id, action_type="require_note", payload={
            "min_length": 20, "code": "GEN_DEC_1_NOTE_REQUIRED", "message": "Please add a note with at least 20 characters for General Decision #1.", "severity": "warn",
        }))

    # --- Neglect CEP flags ---
    if choice.label == "No" and code == "neg_int_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "NEG_ENTRY_NOT_CONFIRMED", "message": "Neglect criteria not confirmed based on interview evidence.", "severity": "warn",
        }))
        db.add(RuleAction(transition_id=transition.id, action_type="recommend_pathway", payload={
            "pathway_slug": "general-cep", "message": "Neglect criteria not confirmed. Continue evaluation in General CEP.",
        }))
    if choice.label == "No" and code == "neg_rec_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "NEG_REPORTING_VIOLATION", "message": "Reporting timeframe concern identified for alleged neglect.", "severity": "warn",
        }))
    if choice.label == "No" and code == "neg_inv_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "NEG_INVESTIGATION_FAILURE", "message": "Investigation completeness/documentation concern identified.", "severity": "warn",
        }))
    if choice.label == "No" and code == "neg_sup_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "NEG_SYSTEMIC_PROTECTION_FAILURE", "message": "Potential systemic protection failure (F600/F606 indicator).", "severity": "high",
        }))
    if choice.label == "No" and code == "neg_qa_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "NEG_SAFEGUARD_FAILURE", "message": "Safeguard/corrective action failure identified (F610/F943 indicator).", "severity": "warn",
        }))

    # --- Infection CEP flags ---
    if choice.label == "No" and code == "inf_prev_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "INF_PREVENTION_COMPLIANCE_FAILURE", "message": "Infection prevention practice compliance failure identified.", "severity": "warn",
        }))
    if choice.label == "No" and code == "inf_mon_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "INF_MONITORING_DOC_FAILURE", "message": "Monitoring/documentation concern identified (potential F880).", "severity": "warn",
        }))
    if choice.label == "No" and code == "inf_ord_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "INF_ORDERS_ISOLATION_FAILURE", "message": "Physician orders/isolation precaution concern identified (potential F880/F684).", "severity": "warn",
        }))
    if choice.label == "Yes" and code == "inf_harm_1":
        db.add(RuleAction(transition_id=transition.id, action_type="recommend_pathway", payload={
            "pathway_slug": "general-cep", "message": "Infection failure with harm/spread identified. Recommend General CEP or Neglect CEP for systemic review.",
        }))
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "INF_HARM_ESCALATION", "message": "Infection harm/spread escalation identified.", "severity": "high",
        }))
    if choice.label == "No" and code == "inf_harm_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "INF_HARM_BANNER", "message": "Compliance failure noted without confirmed harm. Escalation banner displayed.", "severity": "warn",
        }))
    if choice.label == "No" and code == "inf_dec_1":
        db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
            "code": "INF_DECISION_FAILURE", "message": "Infection prevention/control program concern identified.", "severity": "warn",
        }))


def _attach_sub_question_rule_actions(db, transition: Transition, choice: Choice, sq_data: dict) -> None:
    """Add warning flags for selected sub-question answers that indicate deeper issues."""
    code = sq_data.get("code", "")

    # Sub-question "Yes" answers that indicate systemic/widespread issues
    if choice.label == "Yes":
        systemic_yes_flags = {
            "gen_obs_1_a": ("GEN_OBS_MULTI_STAFF", "Deviations observed across multiple staff members or shifts — potential systemic concern.", "warn"),
            "gen_obs_1_b": ("GEN_OBS_SYSTEM_FACTORS", "System-level factors (staffing, training) contributing to care inconsistency.", "warn"),
            "gen_obs_2_b": ("GEN_OBS_CONDITION_CHANGE", "Discrepancy indicates a change in resident condition requiring reassessment.", "warn"),
            "gen_rec_1_a": ("GEN_REC_PATTERN_DELAY", "Assessment delays appear to be a pattern affecting other residents.", "warn"),
            "gen_rec_1_b": ("GEN_REC_MISSED_CHANGES", "Untimely assessment resulted in missed changes to resident condition.", "warn"),
            "gen_rec_2_b": ("GEN_REC_OUTDATED_INTERVENTIONS", "Staff may be using outdated or incorrect interventions due to care plan gaps.", "warn"),
            "gen_harm_1_b": ("GEN_HARM_FUTURE_RISK", "Potential for future harm if identified failure is not corrected.", "warn"),
            "neg_int_1_b": ("NEG_INT_INCONSISTENCIES", "Inconsistencies found between staff accounts and documented care records.", "warn"),
            "neg_rec_1_b": ("NEG_REC_PRIOR_FAILURES", "Prior instances of reporting delays or failures identified at this facility.", "warn"),
            "neg_sup_1_a": ("NEG_SUP_BELOW_MINIMUM", "Staffing levels below the facility's own staffing plan or regulatory minimums.", "high"),
            "inf_harm_1_b": ("INF_HARM_ONGOING_RISK", "Ongoing risk of transmission if identified failures are not corrected.", "warn"),
        }
        if code in systemic_yes_flags:
            flag_code, message, severity = systemic_yes_flags[code]
            db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
                "code": flag_code, "message": message, "severity": severity,
            }))

    # Sub-question "No" answers that indicate lack of safeguards/process
    if choice.label == "No":
        safeguard_no_flags = {
            "gen_obs_2_a": ("GEN_OBS_NOT_COMMUNICATED", "Discrepancies not documented or communicated to the care team.", "warn"),
            "gen_dec_1_b": ("GEN_DEC_NO_CORRECTIVE", "Facility has not demonstrated awareness or initiated corrective actions.", "warn"),
            "neg_int_1_a": ("NEG_INT_UNAWARE", "Staff interviews did not indicate awareness of resident care needs.", "warn"),
            "neg_inv_1_a": ("NEG_INV_WITNESSES_MISSED", "Key witnesses and relevant parties were not interviewed.", "warn"),
            "neg_inv_1_b": ("NEG_INV_NO_ROOT_CAUSE", "Investigation did not include root cause analysis.", "warn"),
            "neg_sup_1_b": ("NEG_SUP_INAPPROPRIATE_ASSIGN", "Staff assignments not appropriate for the acuity level of affected residents.", "warn"),
            "neg_qa_1_a": ("NEG_QA_NO_QAPI_REVIEW", "QAPI committee has not reviewed this issue.", "warn"),
            "neg_qa_1_b": ("NEG_QA_NO_INTERIM_MEASURES", "No interim protective measures put in place pending corrective actions.", "warn"),
            "inf_prev_1_b": ("INF_PREV_KNOWLEDGE_GAP", "Staff did not demonstrate knowledge of infection prevention policies.", "warn"),
            "inf_mon_1_a": ("INF_MON_NO_SURVEILLANCE", "No structured surveillance system in place for tracking infection indicators.", "warn"),
            "inf_mon_1_b": ("INF_MON_NOT_COMMUNICATED", "Signs or symptoms of infection not communicated promptly to medical staff.", "warn"),
            "inf_dec_1_a": ("INF_DEC_NO_IP", "Facility does not have a designated Infection Preventionist with appropriate training.", "warn"),
        }
        if code in safeguard_no_flags:
            flag_code, message, severity = safeguard_no_flags[code]
            db.add(RuleAction(transition_id=transition.id, action_type="add_flag", payload={
                "code": flag_code, "message": message, "severity": severity,
            }))


# ---------------------------------------------------------------------------
# Main pathway creation with true branching
# ---------------------------------------------------------------------------

def create_pathway(db, slug: str, title: str, sections_data: list[dict]):
    pathway = Pathway(slug=slug, title=title, is_active=True)
    db.add(pathway)
    db.flush()

    # ── Phase 1: Create all nodes (main + sub) and their choices ──
    # all_main_nodes: ordered list of (node, node_data, choices, section_slug)
    all_main_nodes: list[tuple[Node, dict, list[Choice], str]] = []
    # sub_nodes_by_parent: parent_code → [(sub_node, sub_data, sub_choices)]
    sub_nodes_by_parent: dict[str, list[tuple[Node, dict, list[Choice]]]] = {}

    for s_idx, section_data in enumerate(sections_data, start=1):
        section = Section(
            pathway_id=pathway.id,
            slug=section_data["slug"],
            title=section_data["title"],
            display_order=s_idx,
        )
        db.add(section)
        db.flush()

        display_order_counter = 1
        for node_data in section_data["nodes"]:
            # Create main question node
            node = Node(
                section_id=section.id,
                code=node_data["code"],
                prompt=node_data["prompt"],
                node_type="decision" if section.slug == "decisions" else "question",
                display_order=display_order_counter,
                is_start=(s_idx == 1 and display_order_counter == 1),
                is_terminal=False,
                parent_node_code=None,
            )
            db.add(node)
            db.flush()
            display_order_counter += 1

            choices = _create_choices(db, node, node_data["choices"])
            all_main_nodes.append((node, node_data, choices, section.slug))

            # Create sub-question nodes in the same section
            sub_list: list[tuple[Node, dict, list[Choice]]] = []
            for sq_data in node_data.get("sub_questions", []):
                sq_node = Node(
                    section_id=section.id,
                    code=sq_data["code"],
                    prompt=sq_data["prompt"],
                    node_type="question",
                    display_order=display_order_counter,
                    is_start=False,
                    is_terminal=False,
                    parent_node_code=node_data["code"],
                )
                db.add(sq_node)
                db.flush()
                display_order_counter += 1

                sq_choices = _create_choices(db, sq_node, sq_data["choices"])
                sub_list.append((sq_node, sq_data, sq_choices))

            if sub_list:
                sub_nodes_by_parent[node_data["code"]] = sub_list

    # ── Phase 2: Wire transitions with true branching ──
    for idx, (node, node_data, choices, section_slug) in enumerate(all_main_nodes):
        next_main = all_main_nodes[idx + 1][0] if idx + 1 < len(all_main_nodes) else None
        subs = sub_nodes_by_parent.get(node_data["code"], [])
        first_sub = subs[0][0] if subs else None

        # If this is the very last main node AND it has no sub-questions, mark terminal
        if next_main is None and not subs:
            node.is_terminal = True

        for priority, choice in enumerate(choices, start=1):
            if choice.label == "Yes":
                # Yes → skip sub-questions → next main question (or terminal)
                to_node = next_main
            elif choice.label == "No" and first_sub:
                # No → branch into first sub-question
                to_node = first_sub
            else:
                # No with no sub-questions → next main question (or terminal)
                to_node = next_main

            transition = Transition(
                pathway_id=pathway.id,
                from_node_id=node.id,
                choice_id=choice.id,
                to_node_id=to_node.id if to_node else None,
                priority=priority,
            )
            db.add(transition)
            db.flush()

            # Attach existing RuleActions for main questions
            _attach_main_rule_actions(db, transition, choice, node_data)

        # Wire sub-question transitions (linear: both Yes/No → same next target)
        for sq_idx, (sq_node, sq_data, sq_choices) in enumerate(subs):
            if sq_idx + 1 < len(subs):
                sq_next = subs[sq_idx + 1][0]  # next sub-question
            else:
                sq_next = next_main  # last sub-Q → next main question

            # If this is the very last sub-Q of the very last main node, mark terminal
            if sq_next is None:
                sq_node.is_terminal = True

            for priority, sq_choice in enumerate(sq_choices, start=1):
                sq_transition = Transition(
                    pathway_id=pathway.id,
                    from_node_id=sq_node.id,
                    choice_id=sq_choice.id,
                    to_node_id=sq_next.id if sq_next else None,
                    priority=priority,
                )
                db.add(sq_transition)
                db.flush()

                _attach_sub_question_rule_actions(db, sq_transition, sq_choice, sq_data)


def seed_if_empty() -> None:
    db = SessionLocal()
    try:
        existing = db.scalar(select(Pathway).limit(1))
        if existing:
            return

        create_pathway(db, "general-cep", "General Critical Element Pathway", GENERAL_SECTIONS)
        create_pathway(db, "neglect-cep", "Neglect Critical Element Pathway", NEGLECT_SECTIONS)
        create_pathway(db, "infection-control-cep", "Infection Control Pathway", INFECTION_SECTIONS)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_if_empty()
