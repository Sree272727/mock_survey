"""Extract a CEP survey definition from an uploaded PDF.

Primary path: OpenAI structured extraction of questions/sections/branching
rules into the AdminWorkflowPayload shape used by the import endpoints.
Fallback path: heuristic text parsing (lines ending in "?"), so the demo
still works offline or without an API key.
"""

from __future__ import annotations

import io
import json
import re

from pypdf import PdfReader

from app.config import settings

# Action types understood by app/services/workflow.py
KNOWN_ACTION_TYPES = {
    "add_flag",
    "add_citation",
    "recommend_pathway",
    "show_section",
    "require_evidence_min",
    "require_note",
    "goto_question",
}

MAX_QUESTIONS = 100  # real CEPs can have 50+ items (e.g. Neglect ≈ 53)
MAX_TEXT_CHARS = 24_000

SYSTEM_PROMPT = """You convert CMS Critical Element Pathway (CEP) survey PDFs into a JSON survey definition.

Return ONLY a JSON object with this exact shape:
{
  "title": "<short pathway title, e.g. 'Neglect Critical Element Pathway'>",
  "slug": "<kebab-case slug, e.g. 'neglect-cep'>",
  "sections": [
    {
      "slug": "<kebab-case>",
      "title": "<section title>",
      "nodes": [
        {
          "code": "<unique snake_case code, prefixed by pathway, e.g. 'neg_obs_1'>",
          "prompt": "<the question text, faithful to the source wording>",
          "choices": ["Yes", "No"],
          "parent_node_code": null,
          "rules": [
            {
              "when_choice": "No",
              "actions": [
                {"type": "add_flag", "payload": {"code": "NEG_CARE_FAIL", "message": "...", "severity": "warn"}}
              ]
            }
          ]
        }
      ]
    }
  ]
}

Rules for extraction:
- FIDELITY IS THE #1 PRIORITY. Reproduce the document's questions as faithfully as possible — the surveyor must see the real CEP questions, not your paraphrase.
- The input is PRE-SEGMENTED: produce EXACTLY ONE question per '•' bullet (hard max {max_q}). Never split one '•' bullet into multiple questions, and never merge two '•' bullets into one. A bullet may contain several sentences/sub-questions — keep them ALL together in that one question's text (e.g. a Record Review bullet that asks about the care plan AND how the resident responded AND whether it was revised stays as ONE question).
- A standalone directive bullet is STILL one question — e.g. "Ensure interventions adhere to professional standards of practice." becomes its own question (e.g. "Do interventions adhere to professional standards of practice?").
- Group questions under the '## ' section titles exactly as given.
- Keep each question's wording faithful to the source. You may ONLY: (a) repair line-break/spacing artifacts, (b) drop a trailing surveyor clarification within the SAME bullet such as "If not, describe." Do NOT reword the substance and do NOT drop secondary questions within a bullet.
- SKIP the "## Review the Following in Advance…" section entirely — those bullets are documents to review before the survey, not survey questions.
- Do NOT invent questions that are not in the document.
- Most CEP probes are open-ended interview/observation prompts. KEEP them phrased as in the document (do not force them into "Did the facility…?" yes/no form). Still set choices to ["Yes", "No"] as the answer toggle — the surveyor records specifics in notes. Only the numbered "Critical Element Decisions" are naturally yes/no.
- Group questions into sections mirroring the document's own headings exactly (e.g. "Observations Across Various Shifts", "Resident, Resident Representative, or Family Interview", "Staff Interviews", "Record Review", "Critical Element Decisions").
- choices: ["Yes", "No"] by default. For a Critical Element Decision that the document marks with an "NA, …" option, use ["Yes", "No", "NA"].
- parent_node_code: leave null unless the document CLEARLY nests one probe under another (a sub-bullet/indented follow-up). Most CEP probes are a flat list — do NOT invent parent/child relationships. When the document does nest, the child appears only when the parent is answered "No".
- The numbered compliance determinations (usually at the end, with explicit "If No, cite F###" instructions) belong in a section titled "Critical Element Decisions" — not in Observations.
- rules: add branching rules ONLY where the document clearly implies a consequence for an answer. Allowed action types and payloads:
  - add_flag: {"code": "<SNAKE_CODE>", "message": "<short surveyor warning>", "severity": "warn"} — code must be a descriptive SNAKE_CASE code, NEVER an F-tag
  - add_citation: {"tag": "<F-tag like F684>", "rationale": "<why>"} — REQUIRED whenever the document says "If No, cite F###": that must become add_citation with that tag (optionally plus an add_flag)
  - recommend_pathway: {"message": "<e.g. 'Initiate the Infection Control CEP'>"}
  - show_section: {"section_slug": "<slug of a later section in THIS pathway>"}
  - require_evidence_min: {"min": 1, "message": "<what evidence is required>"}
  - require_note: {"min_length": 10, "message": "<what to document>"}
  - goto_question: {"target_node_code": "<code of a LATER question in this pathway>"} — use ONLY when the document explicitly says to skip ahead (e.g. "If Yes, proceed to question 5"); questions in between will be skipped
- A "No" answer to a compliance question usually means a deficiency: add_flag and, when an F-tag is identifiable, add_citation.
- Node codes must be unique across the whole pathway.
- Output raw JSON only. No markdown fences, no commentary."""


# ── PDF text ─────────────────────────────────────────────────────────


def extract_pdf_text(data: bytes) -> tuple[str, int]:
    reader = PdfReader(io.BytesIO(data))
    pages = len(reader.pages)
    chunks: list[str] = []
    for page in reader.pages:
        try:
            chunks.append(page.extract_text() or "")
        except Exception:
            chunks.append("")
    return "\n".join(chunks), pages


# CEP PDFs use checkboxes/numbered items. pypdf renders the checkbox glyph as a
# leading space, so a NEW item begins on a line that starts with whitespace (or
# a numbered "N)"), and lines that start at column 0 are continuations of the
# current item. We use that to deterministically reconstruct one bullet per
# survey item — far more reliable than asking the LLM to guess boundaries.

_PAGE_HEADER_HINTS = (
    "DEPARTMENT OF HEALTH",
    "CENTERS FOR MEDICARE",
    "FORM CMS-",
    "Critical Element Pathway",
)
_NUMBERED_RE = re.compile(r"^\d+\)\s")
# Footer reference list that should not become questions.
_STOP_HINTS = ("Other Tags, Care Areas",)


def segment_bullets(raw_text: str) -> str:
    """Reconstruct '## Section' headers and one '• ' bullet per survey item."""
    out: list[str] = []
    current: str | None = None

    def flush() -> None:
        nonlocal current
        if current is not None:
            out.append("• " + re.sub(r"\s+", " ", current).strip())
            current = None

    for ln in raw_text.splitlines():
        s = ln.strip()
        if not s:
            continue
        if any(h in s for h in _PAGE_HEADER_HINTS):
            continue
        if any(h in s for h in _STOP_HINTS):
            break  # reached the trailing reference list — stop
        is_indented = ln[:1].isspace()
        # Section header: a column-0 line ending with ":" that starts with a
        # capital (rejects wrapped continuation lines that happen to end ":").
        if not is_indented and s.endswith(":") and s[:1].isupper() and not _NUMBERED_RE.match(s):
            flush()
            out.append(f"\n## {s}")
            continue
        # New item: a numbered decision, or a leading-whitespace checkbox bullet
        if _NUMBERED_RE.match(s) or is_indented:
            flush()
            current = _NUMBERED_RE.sub("", s)  # drop "N)" prefix; LLM renumbers
            continue
        # Otherwise a wrapped continuation line of the current item
        if current is not None:
            current += " " + s
    flush()
    return "\n".join(out).strip()


# ── helpers ──────────────────────────────────────────────────────────


def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return value or "pathway"


def _uniquify(base: str, existing: set[str], sep: str = "-") -> str:
    if base not in existing:
        return base
    i = 2
    while f"{base}{sep}{i}" in existing:
        i += 1
    return f"{base}{sep}{i}"


def _title_from_filename(filename: str) -> str:
    stem = re.sub(r"\.pdf$", "", filename, flags=re.I)
    stem = re.sub(r"[_\-]+", " ", stem).strip()
    return stem.title() or "Imported Pathway"


# ── OpenAI extraction ────────────────────────────────────────────────


def extract_with_openai(text: str, filename: str) -> dict:
    from openai import OpenAI

    # Prefer the deterministically pre-segmented bullets; fall back to raw text
    # if segmentation didn't find a clear structure (e.g. an unusual layout).
    segmented = segment_bullets(text)
    if segmented.count("• ") >= 3 and "## " in segmented:
        body = (
            "The document text below has ALREADY been segmented. Each line starting "
            "with '•' is EXACTLY ONE survey item — output exactly one question per "
            "'•' bullet (never split a bullet into two, never merge two bullets). "
            "Lines starting with '## ' are the section titles to group under.\n\n"
            f"{segmented[:MAX_TEXT_CHARS]}"
        )
    else:
        body = f"PDF text (may contain layout noise):\n\n{text[:MAX_TEXT_CHARS]}"

    client = OpenAI(api_key=settings.openai_api_key)
    user_content = f"Source PDF filename: {filename}\n\n{body}"
    response = client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        temperature=0.1,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT.replace("{max_q}", str(MAX_QUESTIONS))},
            {"role": "user", "content": user_content},
        ],
    )
    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


# ── Heuristic fallback ───────────────────────────────────────────────

SECTION_HINTS = [
    ("observation", "Observations"),
    ("interview", "Interviews"),
    ("record review", "Record Review"),
    ("record", "Record Review"),
    ("critical element decision", "Critical Element Decisions"),
    ("decision", "Critical Element Decisions"),
]


def extract_heuristic(text: str, filename: str) -> dict:
    """Best-effort extraction without an LLM: question = line ending in '?'."""
    title = _title_from_filename(filename)
    lines = [ln.strip() for ln in text.splitlines()]

    sections: list[dict] = []
    current = {"slug": "general", "title": "General", "nodes": []}

    def push_current():
        if current["nodes"]:
            sections.append({**current, "nodes": list(current["nodes"])})

    buffer = ""
    total = 0
    for ln in lines:
        if not ln:
            continue
        low = ln.lower()
        matched_section = None
        if len(ln) < 60 and not ln.endswith("?"):
            for hint, sec_title in SECTION_HINTS:
                if hint in low:
                    matched_section = sec_title
                    break
        if matched_section:
            push_current()
            current = {"slug": slugify(matched_section), "title": matched_section, "nodes": []}
            buffer = ""
            continue

        # Accumulate wrapped lines until a question mark closes the sentence.
        buffer = f"{buffer} {ln}".strip() if buffer else ln
        if buffer.endswith("?"):
            prompt = re.sub(r"\s+", " ", buffer).strip()
            buffer = ""
            if 15 <= len(prompt) <= 400 and total < MAX_QUESTIONS:
                total += 1
                current["nodes"].append(
                    {
                        "code": f"q_{total}",
                        "prompt": prompt,
                        "choices": ["Yes", "No"],
                        "parent_node_code": None,
                        "rules": [],
                    }
                )
        elif len(buffer) > 500:
            buffer = ""

    push_current()

    if not sections:
        # Scanned/image PDF or no questions found — return a starter skeleton
        sections = [
            {
                "slug": "observations",
                "title": "Observations",
                "nodes": [
                    {
                        "code": "q_1",
                        "prompt": "Were the care and services described in this pathway observed to be provided appropriately?",
                        "choices": ["Yes", "No"],
                        "parent_node_code": None,
                        "rules": [
                            {
                                "when_choice": "No",
                                "actions": [
                                    {
                                        "type": "add_flag",
                                        "payload": {
                                            "code": "REVIEW_REQUIRED",
                                            "message": "Potential concern observed — review the source document.",
                                            "severity": "warn",
                                        },
                                    }
                                ],
                            }
                        ],
                    }
                ],
            }
        ]

    return {"title": title, "slug": slugify(title), "sections": sections}


# ── Normalization ────────────────────────────────────────────────────


def normalize_pathway(raw: dict, filename: str, existing_slugs: set[str], existing_codes: set[str]) -> dict:
    """Coerce LLM/heuristic output into a valid, conflict-free pathway payload."""
    title = str(raw.get("title") or _title_from_filename(filename)).strip()[:120]
    slug = _uniquify(slugify(str(raw.get("slug") or title)), existing_slugs)
    prefix = re.sub(r"[^a-z0-9]+", "_", slug).strip("_")

    seen_codes: set[str] = set()
    sections_out: list[dict] = []
    section_slugs: set[str] = set()
    total_questions = 0

    for sec in raw.get("sections") or []:
        sec_title = str(sec.get("title") or "Section").strip()[:80]
        sec_slug = _uniquify(slugify(str(sec.get("slug") or sec_title)), section_slugs)
        section_slugs.add(sec_slug)

        nodes_out: list[dict] = []
        for node in sec.get("nodes") or []:
            if total_questions >= MAX_QUESTIONS:
                break
            prompt = re.sub(r"\s+", " ", str(node.get("prompt") or "")).strip()
            if not prompt:
                continue
            total_questions += 1

            base_code = re.sub(r"[^a-z0-9_]+", "_", str(node.get("code") or f"q_{total_questions}").lower()).strip("_")
            code = f"{prefix}_{base_code}" if not base_code.startswith(prefix) else base_code
            code = _uniquify(code, seen_codes | existing_codes, sep="_")
            seen_codes.add(code)

            choices = [str(c).strip() for c in (node.get("choices") or []) if str(c).strip()]
            if not choices:
                choices = ["Yes", "No"]

            rules_out: list[dict] = []
            for rule in node.get("rules") or []:
                when_choice = str(rule.get("when_choice") or "").strip()
                if when_choice not in choices:
                    continue
                actions_out = []
                for action in rule.get("actions") or []:
                    a_type = str(action.get("type") or "").strip()
                    if a_type not in KNOWN_ACTION_TYPES:
                        continue
                    payload = action.get("payload")
                    actions_out.append({"type": a_type, "payload": payload if isinstance(payload, dict) else {}})
                if actions_out:
                    rules_out.append({"when_choice": when_choice, "actions": actions_out})

            parent = node.get("parent_node_code")
            nodes_out.append(
                {
                    "code": code,
                    "prompt": prompt[:500],
                    "node_type": "question",
                    "parent_node_code": str(parent) if parent else None,
                    "choices": choices,
                    "rules": rules_out,
                }
            )

        if nodes_out:
            sections_out.append({"slug": sec_slug, "title": sec_title, "nodes": nodes_out})

    # Fix parent references: remap to prefixed codes; drop dangling ones
    raw_to_final: dict[str, str] = {}
    for sec_raw, sec_out in zip(raw.get("sections") or [], sections_out):
        for node_raw, node_out in zip(sec_raw.get("nodes") or [], sec_out["nodes"]):
            raw_code = str(node_raw.get("code") or "")
            if raw_code:
                raw_to_final[raw_code] = node_out["code"]
    all_codes = {n["code"] for s in sections_out for n in s["nodes"]}
    for sec in sections_out:
        for node in sec["nodes"]:
            parent = node["parent_node_code"]
            if parent:
                resolved = raw_to_final.get(parent, parent)
                node["parent_node_code"] = resolved if (resolved in all_codes and resolved != node["code"]) else None

    # Fix show_section payloads pointing at unknown sections,
    # and remap goto_question targets to final codes (drop dangling ones)
    valid_section_slugs = {s["slug"] for s in sections_out}
    for sec in sections_out:
        for node in sec["nodes"]:
            for rule in node["rules"]:
                kept_actions = []
                for a in rule["actions"]:
                    if a["type"] == "show_section":
                        if str((a["payload"] or {}).get("section_slug", "")) in valid_section_slugs:
                            kept_actions.append(a)
                    elif a["type"] == "goto_question":
                        raw_target = str((a["payload"] or {}).get("target_node_code", ""))
                        resolved = raw_to_final.get(raw_target, raw_target)
                        if resolved in all_codes and resolved != node["code"]:
                            a["payload"]["target_node_code"] = resolved
                            kept_actions.append(a)
                    else:
                        kept_actions.append(a)
                rule["actions"] = kept_actions
            node["rules"] = [r for r in node["rules"] if r["actions"]]

    return {"slug": slug, "title": title, "is_active": True, "sections": sections_out}
