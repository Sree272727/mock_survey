from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models


def _refresh_case_status(db: Session, case_id: UUID) -> None:
    pathways = db.scalars(
        select(models.CasePathway).where(models.CasePathway.case_id == case_id)
    ).all()
    case = db.get(models.Case, case_id)
    if not case or not pathways:
        return

    if all(cp.status == "completed" for cp in pathways):
        case.status = "completed"
    elif any(cp.status in ("in_progress", "completed") for cp in pathways):
        case.status = "in_progress"


def evaluate_answer(
    db: Session,
    case_id: UUID,
    pathway_id: UUID,
    node_id: UUID,
    choice_id: UUID | None,
) -> dict:
    choice_label = None
    if choice_id:
        choice = db.get(models.Choice, choice_id)
        if choice:
            choice_label = choice.label

    def _matches_condition(transition: models.Transition) -> bool:
        condition_type = (transition.condition_type or "choice_match").lower()
        payload = transition.condition_payload or {}

        if condition_type == "always":
            return True

        if condition_type == "expression":
            if "current_choice_eq" in payload:
                return choice_label == str(payload.get("current_choice_eq"))
            if "current_choice_in" in payload:
                allowed = payload.get("current_choice_in") or []
                return choice_label in [str(x) for x in allowed]
            return False

        # Default and backward-compatible path.
        return transition.choice_id is None or transition.choice_id == choice_id

    def _upsert_issue(
        code: str,
        message: str,
        severity: str = "warn",
        node: UUID | None = node_id,
    ) -> None:
        existing = db.scalar(
            select(models.CaseValidationIssue)
            .where(models.CaseValidationIssue.case_id == case_id)
            .where(models.CaseValidationIssue.pathway_id == pathway_id)
            .where(models.CaseValidationIssue.code == code)
        )
        if existing:
            existing.message = message
            existing.severity = severity
            existing.status = "open"
            existing.resolved_at = None
            existing.node_id = node
            return
        db.add(
            models.CaseValidationIssue(
                case_id=case_id,
                pathway_id=pathway_id,
                node_id=node,
                code=code,
                message=message,
                severity=severity,
                status="open",
            )
        )

    def _resolve_issue(code: str) -> None:
        issue = db.scalar(
            select(models.CaseValidationIssue)
            .where(models.CaseValidationIssue.case_id == case_id)
            .where(models.CaseValidationIssue.pathway_id == pathway_id)
            .where(models.CaseValidationIssue.code == code)
            .where(models.CaseValidationIssue.status == "open")
        )
        if issue:
            issue.status = "resolved"
            issue.resolved_at = datetime.utcnow()

    transitions = db.scalars(
        select(models.Transition)
        .where(models.Transition.pathway_id == pathway_id)
        .where(models.Transition.from_node_id == node_id)
        .order_by(models.Transition.priority.asc())
    ).all()

    matched = None
    for transition in transitions:
        if _matches_condition(transition):
            matched = transition
            break

    response = {
        "next_node_id": None,
        "next_node_code": None,
        "flags_created": [],
        "citations_created": [],
        "recommendation": None,
        "recommendation_slug": None,
        "required_actions": [],
        "validation_issues": [],
    }

    if matched is None:
        return response

    # Reconcile node-scoped side effects when answers are corrected.
    # For this node, remove flags/citations that are possible on other transitions
    # but are not present on the currently matched transition.
    all_actions = db.scalars(
        select(models.RuleAction).where(models.RuleAction.transition_id.in_([t.id for t in transitions]))
    ).all() if transitions else []
    matched_actions = db.scalars(
        select(models.RuleAction).where(models.RuleAction.transition_id == matched.id)
    ).all()

    all_flag_codes = {
        str((a.payload or {}).get("code"))
        for a in all_actions
        if a.action_type == "add_flag" and (a.payload or {}).get("code")
    }
    all_citation_tags = {
        str((a.payload or {}).get("tag"))
        for a in all_actions
        if a.action_type == "add_citation" and (a.payload or {}).get("tag")
    }
    matched_flag_codes = {
        str((a.payload or {}).get("code"))
        for a in matched_actions
        if a.action_type == "add_flag" and (a.payload or {}).get("code")
    }
    matched_citation_tags = {
        str((a.payload or {}).get("tag"))
        for a in matched_actions
        if a.action_type == "add_citation" and (a.payload or {}).get("tag")
    }

    stale_flag_codes = all_flag_codes - matched_flag_codes
    stale_citation_tags = all_citation_tags - matched_citation_tags

    if stale_flag_codes:
        stale_flags = db.scalars(
            select(models.CaseFlag)
            .where(models.CaseFlag.case_id == case_id)
            .where(models.CaseFlag.pathway_id == pathway_id)
            .where(models.CaseFlag.code.in_(sorted(stale_flag_codes)))
        ).all()
        for flag in stale_flags:
            db.delete(flag)
            db.add(
                models.CaseEvent(
                    case_id=case_id,
                    event_type="flag_cleared",
                    payload={"pathway_id": str(pathway_id), "code": flag.code},
                )
            )

    if stale_citation_tags:
        stale_citations = db.scalars(
            select(models.CaseCitation)
            .where(models.CaseCitation.case_id == case_id)
            .where(models.CaseCitation.pathway_id == pathway_id)
            .where(models.CaseCitation.tag.in_(sorted(stale_citation_tags)))
        ).all()
        for citation in stale_citations:
            db.delete(citation)
            db.add(
                models.CaseEvent(
                    case_id=case_id,
                    event_type="citation_cleared",
                    payload={"pathway_id": str(pathway_id), "tag": citation.tag},
                )
            )

    # Cascade-clear sub-question side effects when parent answer changes.
    # When a parent node is re-answered (e.g. "No" → "Yes"), sub-questions
    # become irrelevant, but their flags/citations/validation issues remain.
    current_node = db.get(models.Node, node_id)
    if current_node:
        child_nodes = db.scalars(
            select(models.Node)
            .join(models.Section, models.Section.id == models.Node.section_id)
            .where(models.Section.pathway_id == pathway_id)
            .where(models.Node.parent_node_code == current_node.code)
        ).all()
        if child_nodes:
            child_node_ids = [cn.id for cn in child_nodes]
            # Collect all flag codes and citation tags from child node transitions
            child_transitions = db.scalars(
                select(models.Transition)
                .where(models.Transition.pathway_id == pathway_id)
                .where(models.Transition.from_node_id.in_(child_node_ids))
            ).all()
            if child_transitions:
                child_actions = db.scalars(
                    select(models.RuleAction)
                    .where(models.RuleAction.transition_id.in_([t.id for t in child_transitions]))
                ).all()
                child_flag_codes = {
                    str((a.payload or {}).get("code"))
                    for a in child_actions
                    if a.action_type == "add_flag" and (a.payload or {}).get("code")
                }
                child_citation_tags = {
                    str((a.payload or {}).get("tag"))
                    for a in child_actions
                    if a.action_type == "add_citation" and (a.payload or {}).get("tag")
                }
                if child_flag_codes:
                    orphan_flags = db.scalars(
                        select(models.CaseFlag)
                        .where(models.CaseFlag.case_id == case_id)
                        .where(models.CaseFlag.pathway_id == pathway_id)
                        .where(models.CaseFlag.code.in_(sorted(child_flag_codes)))
                    ).all()
                    for flag in orphan_flags:
                        db.delete(flag)
                        db.add(models.CaseEvent(
                            case_id=case_id,
                            event_type="flag_cleared",
                            payload={"pathway_id": str(pathway_id), "code": flag.code, "reason": "parent_answer_changed"},
                        ))
                if child_citation_tags:
                    orphan_citations = db.scalars(
                        select(models.CaseCitation)
                        .where(models.CaseCitation.case_id == case_id)
                        .where(models.CaseCitation.pathway_id == pathway_id)
                        .where(models.CaseCitation.tag.in_(sorted(child_citation_tags)))
                    ).all()
                    for citation in orphan_citations:
                        db.delete(citation)
                        db.add(models.CaseEvent(
                            case_id=case_id,
                            event_type="citation_cleared",
                            payload={"pathway_id": str(pathway_id), "tag": citation.tag, "reason": "parent_answer_changed"},
                        ))
            # Also resolve any open validation issues on child nodes
            for cn_id in child_node_ids:
                child_issues = db.scalars(
                    select(models.CaseValidationIssue)
                    .where(models.CaseValidationIssue.case_id == case_id)
                    .where(models.CaseValidationIssue.pathway_id == pathway_id)
                    .where(models.CaseValidationIssue.node_id == cn_id)
                    .where(models.CaseValidationIssue.status == "open")
                ).all()
                for issue in child_issues:
                    issue.status = "resolved"
                    issue.resolved_at = datetime.utcnow()

    cp = db.scalar(
        select(models.CasePathway)
        .where(models.CasePathway.case_id == case_id)
        .where(models.CasePathway.pathway_id == pathway_id)
    )
    if cp:
        cp.current_node_id = matched.to_node_id
        if cp.status == "not_started":
            cp.status = "in_progress"
            cp.started_at = datetime.utcnow()
        if matched.to_node_id is None:
            cp.status = "completed"
            cp.completed_at = datetime.utcnow()
    _refresh_case_status(db, case_id)

    if matched.to_node_id:
        next_node = db.get(models.Node, matched.to_node_id)
        if next_node:
            response["next_node_id"] = next_node.id
            response["next_node_code"] = next_node.code

    actions = matched_actions

    for action in actions:
        payload = action.payload or {}
        if action.action_type == "add_flag":
            code = payload.get("code", "FLAG")
            message = payload.get("message", "Flag raised")
            existing_flag = db.scalar(
                select(models.CaseFlag)
                .where(models.CaseFlag.case_id == case_id)
                .where(models.CaseFlag.pathway_id == pathway_id)
                .where(models.CaseFlag.code == code)
            )
            if not existing_flag:
                db.add(
                    models.CaseFlag(
                        case_id=case_id,
                        pathway_id=pathway_id,
                        severity=payload.get("severity", "warn"),
                        code=code,
                        message=message,
                    )
                )
                db.add(
                    models.CaseEvent(
                        case_id=case_id,
                        event_type="flag_generated",
                        payload={"pathway_id": str(pathway_id), "code": code, "message": message},
                    )
                )
                response["flags_created"].append(code)
        elif action.action_type == "add_citation":
            tag = str(payload.get("tag", "") or "").strip()
            if not tag:
                continue  # misconfigured rule with no F-tag — skip (no junk citation)
            rationale = payload.get("rationale", "Auto citation")
            existing_citation = db.scalar(
                select(models.CaseCitation)
                .where(models.CaseCitation.case_id == case_id)
                .where(models.CaseCitation.pathway_id == pathway_id)
                .where(models.CaseCitation.tag == tag)
            )
            if not existing_citation:
                db.add(
                    models.CaseCitation(
                        case_id=case_id,
                        pathway_id=pathway_id,
                        tag=tag,
                        rationale=rationale,
                    )
                )
                db.add(
                    models.CaseEvent(
                        case_id=case_id,
                        event_type="citation_generated",
                        payload={"pathway_id": str(pathway_id), "tag": tag, "rationale": rationale},
                    )
                )
                response["citations_created"].append(tag)
        elif action.action_type == "recommend_pathway":
            response["recommendation"] = payload.get("message")
            response["recommendation_slug"] = payload.get("pathway_slug") or payload.get("slug")
        elif action.action_type == "require_evidence_min":
            required_min = int(payload.get("min", 1))
            code = str(payload.get("code", f"EVIDENCE_MIN_{node_id}"))
            message = str(payload.get("message", f"At least {required_min} evidence item(s) required"))
            evidence_count = len(
                db.scalars(
                    select(models.EvidenceItem.id).where(models.EvidenceItem.case_id == case_id)
                ).all()
            )
            if evidence_count < required_min:
                _upsert_issue(code=code, message=message, severity=str(payload.get("severity", "warn")))
                response["required_actions"].append(f"Add at least {required_min} evidence item(s)")
            else:
                _resolve_issue(code)
        elif action.action_type == "require_note":
            code = str(payload.get("code", f"NOTE_REQUIRED_{node_id}"))
            min_len = int(payload.get("min_length", 10))
            message = str(payload.get("message", "Surveyor note is required"))
            answer = db.scalar(
                select(models.CaseAnswer)
                .where(models.CaseAnswer.case_id == case_id)
                .where(models.CaseAnswer.pathway_id == pathway_id)
                .where(models.CaseAnswer.node_id == node_id)
                .order_by(models.CaseAnswer.answered_at.desc())
            )
            note = (answer.notes if answer else "") or ""
            if len(note.strip()) < min_len:
                _upsert_issue(code=code, message=message, severity=str(payload.get("severity", "warn")))
                response["required_actions"].append(message)
            else:
                _resolve_issue(code)

    # General CEP escalation strengthening:
    # recommend Neglect only when critical decision failure is paired with Harm=Yes.
    current_node = db.get(models.Node, node_id)
    if current_node and current_node.code == "gen_dec_1" and choice_label == "No":
        harm_answer = db.execute(
            select(models.CaseAnswer, models.Choice.label)
            .join(models.Node, models.Node.id == models.CaseAnswer.node_id)
            .join(models.Choice, models.Choice.id == models.CaseAnswer.choice_id, isouter=True)
            .where(models.CaseAnswer.case_id == case_id)
            .where(models.CaseAnswer.pathway_id == pathway_id)
            .where(models.Node.code == "gen_harm_1")
            .order_by(models.CaseAnswer.answered_at.desc())
            .limit(1)
        ).first()
        if harm_answer and str(harm_answer[1]) == "Yes":
            response["recommendation"] = "Critical care failure with harm identified. Strongly recommend opening Neglect CEP."
            response["recommendation_slug"] = "neglect-cep"

    if current_node and current_node.code == "inf_dec_1" and choice_label == "No":
        harm_answer = db.execute(
            select(models.CaseAnswer, models.Choice.label)
            .join(models.Node, models.Node.id == models.CaseAnswer.node_id)
            .join(models.Choice, models.Choice.id == models.CaseAnswer.choice_id, isouter=True)
            .where(models.CaseAnswer.case_id == case_id)
            .where(models.CaseAnswer.pathway_id == pathway_id)
            .where(models.Node.code == "inf_harm_1")
            .order_by(models.CaseAnswer.answered_at.desc())
            .limit(1)
        ).first()
        if harm_answer and str(harm_answer[1]) == "Yes":
            response["recommendation"] = "Infection control program failure with harm identified. Escalate review and consider General CEP/Neglect CEP as appropriate."
            response["recommendation_slug"] = "general-cep"

    open_issues = db.scalars(
        select(models.CaseValidationIssue)
        .where(models.CaseValidationIssue.case_id == case_id)
        .where(models.CaseValidationIssue.pathway_id == pathway_id)
        .where(models.CaseValidationIssue.status == "open")
        .order_by(models.CaseValidationIssue.created_at.asc())
    ).all()
    response["validation_issues"] = [f"{i.code}: {i.message}" for i in open_issues]

    return response
