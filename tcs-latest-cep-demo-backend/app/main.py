from datetime import datetime
from pathlib import Path
import json
import shutil
import sys
from uuid import UUID

from fastapi import Depends, FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import case, delete, func, select
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.database import get_db
from app.services.workflow import evaluate_answer

app = FastAPI(title="CMS Survey Workflow Demo API")
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"

F_TAG_METADATA: dict[str, dict[str, str]] = {
    "F684": {"title": "Professional Standards of Practice", "regulation": "§483.25", "scope_severity": "D - Isolated, No Actual Harm"},
    "F655": {"title": "Baseline Care Plan", "regulation": "§483.21", "scope_severity": "D - Isolated, No Actual Harm"},
    "F636": {"title": "Comprehensive Assessments", "regulation": "§483.20", "scope_severity": "D - Isolated, No Actual Harm"},
    "F637": {"title": "Significant Change Assessment", "regulation": "§483.20", "scope_severity": "D - Isolated, No Actual Harm"},
    "F641": {"title": "Accuracy of Assessments", "regulation": "§483.20", "scope_severity": "D - Isolated, No Actual Harm"},
    "F656": {"title": "Comprehensive Care Plans", "regulation": "§483.21", "scope_severity": "D - Isolated, No Actual Harm"},
    "F657": {"title": "Care Plan Revision", "regulation": "§483.21", "scope_severity": "D - Isolated, No Actual Harm"},
    "F600": {"title": "Free from Abuse and Neglect", "regulation": "§483.12", "scope_severity": "G - Actual Harm"},
    "F606": {"title": "Staff Hiring / Reporting Requirements", "regulation": "§483.12", "scope_severity": "D - Isolated, No Actual Harm"},
    "F607": {"title": "Abuse/Neglect Prevention Policies", "regulation": "§483.12", "scope_severity": "D - Isolated, No Actual Harm"},
    "F609": {"title": "Reporting of Alleged Violations", "regulation": "§483.12", "scope_severity": "D - Isolated, No Actual Harm"},
    "F610": {"title": "Investigation / Corrective Action", "regulation": "§483.12", "scope_severity": "G - Actual Harm"},
    "F880": {"title": "Infection Prevention and Control", "regulation": "§483.80", "scope_severity": "D - Isolated, No Actual Harm"},
    "F943": {"title": "Staff Training Program", "regulation": "§483.95", "scope_severity": "D - Isolated, No Actual Harm"},
    "F947": {"title": "Nurse Aide In-service Abuse Prevention", "regulation": "§483.95", "scope_severity": "D - Isolated, No Actual Harm"},
}

COMPLIANCE_AREAS: dict[str, dict] = {
    "Assessment": {"regulation": "§483.20", "tags": ["F636", "F637", "F641"]},
    "Care Planning": {"regulation": "§483.21", "tags": ["F655", "F656", "F657"]},
    "Quality of Care": {"regulation": "§483.25", "tags": ["F684"]},
    "Abuse / Neglect": {"regulation": "§483.12", "tags": ["F600", "F606", "F607", "F609", "F610"]},
    "Infection Control": {"regulation": "§483.80", "tags": ["F880"]},
    "Training": {"regulation": "§483.95", "tags": ["F943", "F947"]},
}

ACTION_PLAN_TEMPLATES: dict[str, str] = {
    "F684": "Review and update professional standards of practice documentation. Conduct targeted staff training on care plan adherence.",
    "F655": "Establish a standardized baseline care plan development process within 48 hours of admission.",
    "F656": "Implement a comprehensive care plan audit process. Ensure interdisciplinary team meetings address all resident care domains.",
    "F657": "Create a care plan revision trigger protocol. Ensure significant changes in condition prompt timely care plan updates.",
    "F636": "Review the comprehensive assessment completion timeline. Implement tracking dashboards for assessment due dates.",
    "F637": "Establish significant change assessment triggers and workflow. Train nursing staff on identifying significant changes.",
    "F641": "Implement an assessment accuracy verification process. Add peer review steps for MDS accuracy.",
    "F600": "Conduct immediate facility-wide abuse/neglect risk assessment. Implement enhanced resident monitoring protocols.",
    "F606": "Review hiring and background check processes. Implement enhanced staff screening procedures.",
    "F607": "Update and disseminate abuse/neglect prevention policies. Conduct mandatory staff training on updated policies.",
    "F609": "Implement mandated reporting workflow with automated timeline tracking. Train all staff on reporting obligations.",
    "F610": "Establish a structured investigation protocol with documentation requirements and root cause analysis.",
    "F880": "Review and strengthen the infection prevention and control program. Implement surveillance and monitoring systems.",
    "F943": "Develop a comprehensive staff training program with documented competency assessments.",
    "F947": "Establish and document nurse aide in-service training on abuse prevention. Track completion and competency verification.",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_pathway_by_slug(db: Session, slug: str) -> models.Pathway:
    pathway = db.scalar(select(models.Pathway).where(models.Pathway.slug == slug))
    if not pathway:
        raise HTTPException(status_code=404, detail="Pathway not found")
    return pathway


def _get_ordered_nodes(db: Session, pathway_id: UUID) -> list[models.Node]:
    return db.scalars(
        select(models.Node)
        .join(models.Section, models.Section.id == models.Node.section_id)
        .where(models.Section.pathway_id == pathway_id)
        .order_by(models.Section.display_order.asc(), models.Node.display_order.asc())
    ).all()


def _pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _wrap_pdf_text(text: str, max_chars: int) -> list[str]:
    normalized = " ".join((text or "").split())
    if not normalized:
        return [""]
    words = normalized.split(" ")
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) <= max_chars:
            current = candidate
            continue
        if current:
            lines.append(current)
        if len(word) <= max_chars:
            current = word
        else:
            chunk_start = 0
            while chunk_start < len(word):
                chunk = word[chunk_start:chunk_start + max_chars]
                if len(chunk) == max_chars and (chunk_start + max_chars) < len(word):
                    lines.append(f"{chunk}-")
                else:
                    current = chunk
                chunk_start += max_chars
            if chunk_start >= len(word) and not current:
                current = ""
    if current:
        lines.append(current)
    return lines or [""]


def _max_chars_for_col(col_width: int, font_size: float, padding: int = 12) -> int:
    usable = max(24, col_width - padding)
    # Helvetica average width approximation ~0.52em at small sizes.
    avg_char = max(3.6, font_size * 0.52)
    return max(8, int(usable / avg_char))


def _build_cms_2567_pdf(
    summary: schemas.FindingsSummaryOut,
    state: schemas.CaseStateOut,
    generated_at_iso: str,
) -> bytes:
    # PDF page dimensions (Letter): 612 x 792.
    page_w = 612
    page_h = 792
    margin_x = 24
    top_y = 770
    bottom_y = 38

    table_x = margin_x
    table_w = page_w - (margin_x * 2)
    # Must sum exactly to table_w (564) to prevent overflow.
    col_widths = [56, 206, 56, 206, 40]  # X4, deficiency, X5, POC, completion date
    col_x = [table_x]
    for width in col_widths[:-1]:
        col_x.append(col_x[-1] + width)

    citation_map = {c.tag: c for c in summary.citations}
    deficiencies = [citation_map[c.tag] for c in summary.citations]
    if not deficiencies:
        deficiencies = [
            schemas.CitationDetailOut(
                tag="N/A",
                title="No citations generated",
                regulation="N/A",
                scope_severity="N/A",
                rationale="No deficiency citations were generated for this survey.",
            )
        ]

    # Build row payloads up-front for pagination.
    row_payloads: list[dict] = []
    supporting_findings: list[str] = []
    for text in summary.observation_details[:3]:
        supporting_findings.append(f"Observation: {text}")
    for text in summary.interview_details[:3]:
        supporting_findings.append(f"Interview: {text}")
    for text in summary.record_review_details[:3]:
        supporting_findings.append(f"Record Review: {text}")
    if not supporting_findings:
        supporting_findings = ["No supporting findings documented."]

    for idx, citation in enumerate(deficiencies, start=1):
        def_font = 8.2
        poc_font = 8.0
        def_chars = _max_chars_for_col(col_widths[1], def_font, padding=14)
        poc_chars = _max_chars_for_col(col_widths[3], poc_font, padding=14)
        deficiency_lines: list[str] = []
        deficiency_lines.extend(
            _wrap_pdf_text(
                f"{citation.tag} - {citation.title} ({citation.regulation})",
                def_chars,
            )
        )
        deficiency_lines.extend(_wrap_pdf_text(f"Scope/Severity: {citation.scope_severity}", def_chars))
        deficiency_lines.extend(_wrap_pdf_text("Statement of Deficiency:", def_chars))
        deficiency_lines.extend(_wrap_pdf_text(citation.rationale or "No rationale recorded.", def_chars))
        deficiency_lines.extend(_wrap_pdf_text("Supporting Findings:", def_chars))
        for finding in supporting_findings[:3]:
            deficiency_lines.extend(_wrap_pdf_text(f"- {finding}", def_chars))

        poc_lines: list[str] = []
        poc_lines.extend(_wrap_pdf_text("Facility Plan of Correction:", poc_chars))
        poc_lines.extend(_wrap_pdf_text("To be completed by facility administrator.", poc_chars))
        poc_lines.extend(_wrap_pdf_text("1) Corrective action steps:", poc_chars))
        poc_lines.extend(_wrap_pdf_text("2) Systemic prevention method:", poc_chars))
        poc_lines.extend(_wrap_pdf_text("3) Completion date and responsible staff:", poc_chars))

        max_lines = max(len(deficiency_lines), len(poc_lines), 3)
        row_h = max(72, 14 + (max_lines * 9))
        row_payloads.append(
            {
                "idx": idx,
                "tag": citation.tag,
                "def_lines": deficiency_lines,
                "poc_lines": poc_lines,
                "row_h": row_h,
            }
        )

    objects: list[str] = []
    # 1: catalog, 2: pages, 3: Helvetica, 4: Helvetica-Bold.
    objects.append("<< /Type /Catalog /Pages 2 0 R >>")
    objects.append("<< /Type /Pages /Kids [] /Count 0 >>")
    objects.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    objects.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    pages_streams: list[str] = []

    def draw_text(cmds: list[str], x: int, y: int, text: str, size: float = 8.5, bold: bool = False) -> None:
        font = "F2" if bold else "F1"
        cmds.append("BT")
        cmds.append(f"/{font} {size:.1f} Tf")
        cmds.append(f"{x} {y} Td")
        cmds.append(f"({_pdf_escape(text)}) Tj")
        cmds.append("ET")

    def draw_rect(cmds: list[str], x: int, y: int, w: int, h: int, lw: float = 1.0) -> None:
        cmds.append(f"{lw:.2f} w")
        cmds.append(f"{x} {y} {w} {h} re S")

    def draw_line(cmds: list[str], x1: int, y1: int, x2: int, y2: int, lw: float = 1.0) -> None:
        cmds.append(f"{lw:.2f} w")
        cmds.append(f"{x1} {y1} m {x2} {y2} l S")

    def draw_multiline(
        cmds: list[str],
        x: int,
        top_y_val: int,
        lines: list[str],
        size: float = 8.3,
        bold: bool = False,
        leading: int = 9,
    ) -> None:
        baseline = top_y_val - 11
        for i, line in enumerate(lines):
            draw_text(cmds, x, baseline - (i * leading), line, size=size, bold=bold)

    def draw_form_header(cmds: list[str], page_num: int) -> int:
        y = top_y

        # Top agency row
        top_h = 34
        draw_rect(cmds, table_x, y - top_h, table_w, top_h, lw=1.2)
        split_x = table_x + int(table_w * 0.72)
        draw_line(cmds, split_x, y - top_h, split_x, y, lw=1.0)
        draw_text(cmds, table_x + 6, y - 12, "DEPARTMENT OF HEALTH AND HUMAN SERVICES", 8.0, True)
        draw_text(cmds, table_x + 6, y - 22, "CENTERS FOR MEDICARE & MEDICAID SERVICES", 8.0, True)
        draw_text(cmds, split_x + 6, y - 12, "Form Approved", 8.0, True)
        draw_text(cmds, split_x + 6, y - 22, "OMB No. 0938-0391", 8.0, True)
        y -= top_h

        title_h = 22
        draw_rect(cmds, table_x, y - title_h, table_w, title_h, lw=1.0)
        title_txt = "STATEMENT OF DEFICIENCIES AND PLAN OF CORRECTION (CMS-2567)"
        title_size = 9.2
        title_x = table_x + max(8, int((table_w - (len(title_txt) * title_size * 0.48)) / 2))
        draw_text(cmds, title_x, y - 14, title_txt, title_size, True)
        y -= title_h

        # Provider / survey fields row.
        row1_h = 32
        draw_rect(cmds, table_x, y - row1_h, table_w, row1_h, lw=1.0)
        f1 = table_x + 200
        f2 = table_x + 400
        draw_line(cmds, f1, y - row1_h, f1, y, lw=1.0)
        draw_line(cmds, f2, y - row1_h, f2, y, lw=1.0)
        draw_text(cmds, table_x + 6, y - 10, "(X1) PROVIDER/SUPPLIER/CLIA IDENTIFICATION NUMBER:", 7.2, True)
        draw_text(cmds, table_x + 6, y - 22, str(summary.case_id)[:18], 8.2, False)
        draw_text(cmds, f1 + 6, y - 10, "MULTIPLE CONSTRUCTION", 7.2, True)
        draw_text(cmds, f1 + 6, y - 22, "A. Building: N/A   B. Wing: N/A", 8.0, False)
        draw_text(cmds, f2 + 6, y - 10, "(X3) DATE SURVEY COMPLETED", 7.2, True)
        draw_text(cmds, f2 + 6, y - 22, summary.survey_dates.split(" - ")[-1] if summary.survey_dates else "N/A", 8.3, True)
        y -= row1_h

        row2_h = 32
        draw_rect(cmds, table_x, y - row2_h, table_w, row2_h, lw=1.0)
        split = table_x + 332
        draw_line(cmds, split, y - row2_h, split, y, lw=1.0)
        draw_text(cmds, table_x + 6, y - 10, "NAME OF FACILITY SURVEYED:", 7.2, True)
        draw_text(cmds, table_x + 6, y - 22, summary.facility[:56], 8.2, False)
        draw_text(cmds, split + 6, y - 10, "FACILITY ADDRESS (Street, City, State, Zip Code):", 7.2, True)
        draw_text(cmds, split + 6, y - 22, "N/A", 8.2, False)
        y -= row2_h

        # Column headers
        col_h = 40
        draw_rect(cmds, table_x, y - col_h, table_w, col_h, lw=1.0)
        x_cursor = table_x
        for width in col_widths[:-1]:
            x_cursor += width
            draw_line(cmds, x_cursor, y - col_h, x_cursor, y, lw=1.0)

        draw_text(cmds, col_x[0] + 14, y - 12, "ID", 7.0, True)
        draw_text(cmds, col_x[0] + 8, y - 20, "PREFIX", 7.0, True)
        draw_text(cmds, col_x[0] + 12, y - 28, "TAG", 7.0, True)
        draw_text(cmds, col_x[0] + 11, y - 36, "(X4)", 7.0, True)

        draw_text(cmds, col_x[1] + 8, y - 12, "SUMMARY STATEMENT OF DEFICIENCIES", 7.2, True)
        draw_text(cmds, col_x[1] + 8, y - 22, "(Each deficiency should be preceded by full regulatory", 6.8, False)
        draw_text(cmds, col_x[1] + 8, y - 30, "or LSC identifying information)", 6.8, False)

        draw_text(cmds, col_x[2] + 14, y - 12, "ID", 7.0, True)
        draw_text(cmds, col_x[2] + 8, y - 20, "PREFIX", 7.0, True)
        draw_text(cmds, col_x[2] + 12, y - 28, "TAG", 7.0, True)
        draw_text(cmds, col_x[2] + 11, y - 36, "(X5)", 7.0, True)

        draw_text(cmds, col_x[3] + 8, y - 12, "PROVIDER'S PLAN OF CORRECTION", 7.2, True)
        draw_text(cmds, col_x[3] + 8, y - 22, "(Each corrective action should be cross-referred", 6.8, False)
        draw_text(cmds, col_x[3] + 8, y - 30, "to the appropriate deficiency)", 6.8, False)

        draw_text(cmds, col_x[4] + 2, y - 14, "(X6)", 7.0, True)
        draw_text(cmds, col_x[4] + 2, y - 22, "DATE", 7.0, True)
        draw_text(cmds, col_x[4] + 2, y - 30, "COMP", 7.0, True)

        y -= col_h

        draw_text(cmds, table_x, 24, f"FORM CMS-2567 ({generated_at_iso[:10]})", 7.0, False)
        draw_text(cmds, page_w - 74, 24, f"Page {page_num}", 7.0, False)
        return y

    page_num = 1
    idx = 0
    while idx < len(row_payloads):
        cmds: list[str] = []
        y_cursor = draw_form_header(cmds, page_num)

        while idx < len(row_payloads):
            row = row_payloads[idx]
            row_h = int(row["row_h"])
            if (y_cursor - row_h) < bottom_y:
                break

            draw_rect(cmds, table_x, y_cursor - row_h, table_w, row_h, lw=0.8)
            x_cursor = table_x
            for width in col_widths[:-1]:
                x_cursor += width
                draw_line(cmds, x_cursor, y_cursor - row_h, x_cursor, y_cursor, lw=0.8)

            tag = str(row["tag"])
            draw_text(cmds, col_x[0] + 9, y_cursor - 16, tag, 8.6, True)
            draw_text(cmds, col_x[2] + 9, y_cursor - 16, tag, 8.6, True)

            draw_multiline(cmds, col_x[1] + 7, y_cursor, list(row["def_lines"]), 8.2, False, 9)
            draw_multiline(cmds, col_x[3] + 7, y_cursor, list(row["poc_lines"]), 8.0, False, 9)
            draw_text(cmds, col_x[4] + 2, y_cursor - 16, "__/__/____", 7.0, False)

            y_cursor -= row_h
            idx += 1

        pages_streams.append("\n".join(cmds))
        page_num += 1

    # Build page objects.
    page_kids = " ".join(f"{5 + i * 2} 0 R" for i in range(len(pages_streams)))
    objects[1] = f"<< /Type /Pages /Kids [{page_kids}] /Count {len(pages_streams)} >>"

    for i, stream in enumerate(pages_streams):
        page_obj_num = 5 + (i * 2)
        content_obj_num = page_obj_num + 1
        content = f"<< /Length {len(stream.encode('utf-8'))} >>\nstream\n{stream}\nendstream"
        page = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {content_obj_num} 0 R >>"
        )
        objects.append(page)
        objects.append(content)

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{i} 0 obj\n{obj}\nendobj\n".encode("utf-8"))

    xref_pos = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n".encode("utf-8"))
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("utf-8"))
    out.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        ).encode("utf-8")
    )
    return bytes(out)


def _build_simple_pdf(lines: list[str]) -> bytes:
    # Small PDF generator with lightweight style markers:
    # - "# "  => centered primary title
    # - "### " => centered subtitle
    # - "## " => section heading with divider line
    # - all else => body text
    # - empty string => spacer line
    styled_lines: list[tuple[str, str]] = []
    for raw in lines:
        if raw.startswith("# "):
            styled_lines.append((raw[2:], "title"))
        elif raw.startswith("### "):
            styled_lines.append((raw[4:], "subtitle"))
        elif raw.startswith("## "):
            styled_lines.append((raw[3:], "section"))
        elif not raw.strip():
            styled_lines.append(("", "blank"))
        else:
            styled_lines.append((raw, "body"))

    def _line_height(kind: str) -> int:
        if kind == "title":
            return 34
        if kind == "subtitle":
            return 24
        if kind == "section":
            return 20
        if kind == "blank":
            return 8
        return 14

    pages: list[list[tuple[str, str]]] = []
    current: list[tuple[str, str]] = []
    y = 760
    min_y = 58
    for text, kind in styled_lines:
        line_height = _line_height(kind)
        if y - line_height < min_y:
            pages.append(current)
            current = []
            y = 760
        current.append((text, kind))
        y -= line_height
    if current or not pages:
        pages.append(current)

    objects: list[str] = []
    # 1: catalog, 2: pages, 3: Helvetica, 4: Helvetica-Bold
    objects.append("<< /Type /Catalog /Pages 2 0 R >>")
    page_kids = " ".join(f"{5 + i * 2} 0 R" for i in range(len(pages)))
    objects.append(f"<< /Type /Pages /Kids [{page_kids}] /Count {len(pages)} >>")
    objects.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    objects.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    for idx, page_lines in enumerate(pages):
        page_obj_num = 5 + idx * 2
        content_obj_num = page_obj_num + 1
        stream_lines: list[str] = []
        y_cursor = 760
        for text, kind in page_lines:
            if kind == "blank":
                y_cursor -= _line_height(kind)
                continue

            size = 10
            font = "F1"
            x = 50
            if kind == "title":
                size = 24
                font = "F2"
                # Approximate center alignment using average glyph width.
                approx_width = len(text) * size * 0.48
                x = max(50, int(306 - (approx_width / 2)))
            elif kind == "subtitle":
                size = 15
                font = "F2"
                approx_width = len(text) * size * 0.5
                x = max(50, int(306 - (approx_width / 2)))
            elif kind == "section":
                size = 13
                font = "F2"
            elif text.startswith("- "):
                x = 64

            escaped = _pdf_escape(text if text else " ")
            stream_lines.append("BT")
            stream_lines.append(f"/{font} {size} Tf")
            stream_lines.append(f"{x} {y_cursor} Td")
            stream_lines.append(f"({escaped}) Tj")
            stream_lines.append("ET")

            if kind == "section":
                line_y = y_cursor - 4
                stream_lines.append("0.7 w")
                stream_lines.append("0.72 G")
                stream_lines.append(f"50 {line_y} m 562 {line_y} l S")

            y_cursor -= _line_height(kind)
        if not page_lines:
            stream_lines.extend(["BT", "/F1 10 Tf", "50 760 Td", "( ) Tj", "ET"])
        stream = "\n".join(stream_lines)
        content = f"<< /Length {len(stream.encode('utf-8'))} >>\nstream\n{stream}\nendstream"
        page = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {content_obj_num} 0 R >>"
        )
        objects.append(page)
        objects.append(content)

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{i} 0 obj\n{obj}\nendobj\n".encode("utf-8"))

    xref_pos = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n".encode("utf-8"))
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("utf-8"))
    out.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        ).encode("utf-8")
    )
    return bytes(out)


def _clear_definition_tables(db: Session) -> None:
    db.execute(delete(models.RuleAction))
    db.execute(delete(models.Transition))
    db.execute(delete(models.Choice))
    db.execute(delete(models.Node))
    db.execute(delete(models.Section))
    db.execute(delete(models.Pathway))


def _clear_runtime_tables(db: Session) -> None:
    db.execute(delete(models.CaseAnswer))
    db.execute(delete(models.CaseFlag))
    db.execute(delete(models.CaseCitation))
    db.execute(delete(models.CaseValidationIssue))
    db.execute(delete(models.CaseEvent))
    db.execute(delete(models.EvidenceItem))
    db.execute(delete(models.CasePathway))
    db.execute(delete(models.Case))


def _build_findings_summary(case_id: UUID, db: Session) -> schemas.FindingsSummaryOut:
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    citations = db.scalars(
        select(models.CaseCitation)
        .where(models.CaseCitation.case_id == case_id)
        .order_by(models.CaseCitation.created_at.asc())
    ).all()
    answers = db.execute(
        select(models.CaseAnswer, models.Node.code, models.Node.prompt, models.Section.slug)
        .join(models.Node, models.Node.id == models.CaseAnswer.node_id)
        .join(models.Section, models.Section.id == models.Node.section_id)
        .where(models.CaseAnswer.case_id == case_id)
        .order_by(models.CaseAnswer.answered_at.asc())
    ).all()

    citation_details: list[schemas.CitationDetailOut] = []
    for c in citations:
        meta = F_TAG_METADATA.get(c.tag, {})
        citation_details.append(
            schemas.CitationDetailOut(
                tag=c.tag,
                title=meta.get("title", "Regulatory Deficiency"),
                regulation=meta.get("regulation", "Regulation reference not configured"),
                scope_severity=meta.get("scope_severity", "Scope/Severity pending"),
                rationale=c.rationale,
            )
        )

    def _fmt_answer(prompt: str, note: str) -> str:
        if note and note.strip():
            return f"{prompt} | {note.strip()}"
        return prompt

    observation_details: list[str] = []
    interview_details: list[str] = []
    record_review_details: list[str] = []
    date_set: set[str] = set()
    for ans, _code, prompt, section_slug in answers:
        date_set.add(ans.answered_at.strftime("%m/%d/%Y"))
        text = _fmt_answer(prompt, ans.notes)
        if section_slug in {"observations"}:
            observation_details.append(text)
        elif section_slug in {"resident", "staff", "interviews"}:
            interview_details.append(text)
        elif section_slug in {"records"}:
            record_review_details.append(text)

    survey_dates = "N/A"
    if date_set:
        sorted_dates = sorted(date_set)
        survey_dates = sorted_dates[0] if len(sorted_dates) == 1 else f"{sorted_dates[0]} - {sorted_dates[-1]}"

    resident = case.resident_id or "UNKNOWN"
    anonymized = f"RES-***{resident[-3:]}" if len(resident) >= 3 else "RES-***"

    general_citations = sum(1 for c in citations if c.tag.startswith("F6") and c.tag in {"F684", "F655", "F636", "F637", "F641", "F656", "F657"})
    neglect_citations = len(citations) - general_citations

    return schemas.FindingsSummaryOut(
        case_id=case_id,
        facility=case.facility_name,
        survey_type="Complaint Investigation",
        survey_dates=survey_dates,
        resident_identifier_anonymized=anonymized,
        total_citations=len(citations),
        general_citations=general_citations,
        neglect_citations=neglect_citations,
        citations=citation_details,
        observation_details=observation_details[:20],
        interview_details=interview_details[:20],
        record_review_details=record_review_details[:20],
        dates=sorted(date_set),
    )


def _evidence_file_url(case_id: UUID, evidence_id: UUID) -> str:
    return f"/api/cases/{case_id}/evidence/{evidence_id}/download"


def _serialize_evidence(item: models.EvidenceItem) -> schemas.EvidenceOut:
    filename = None
    if item.source_type == "file" and item.description:
        try:
            meta = json.loads(item.description)
            if isinstance(meta, dict):
                filename = str(meta.get("filename") or "")
        except json.JSONDecodeError:
            filename = None
    return schemas.EvidenceOut(
        id=item.id,
        label=item.label,
        description=item.description if item.source_type != "file" else "Attached file evidence",
        source_type=item.source_type,
        filename=filename or None,
        file_url=_evidence_file_url(item.case_id, item.id) if item.source_type == "file" else None,
        created_at=item.created_at,
    )


def _case_event_exists(case_id: UUID, event_type: str, payload_match: dict[str, str], db: Session) -> bool:
    events = db.scalars(
        select(models.CaseEvent)
        .where(models.CaseEvent.case_id == case_id)
        .where(models.CaseEvent.event_type == event_type)
    ).all()
    for event in events:
        payload = event.payload or {}
        if all(str(payload.get(key)) == str(value) for key, value in payload_match.items()):
            return True
    return False


def _emit_case_event_once(case_id: UUID, event_type: str, payload: dict[str, str], db: Session) -> None:
    if _case_event_exists(case_id, event_type, payload, db):
        return
    db.add(models.CaseEvent(case_id=case_id, event_type=event_type, payload=payload))


def _section_is_complete(case_id: UUID, pathway_id: UUID, section_id: UUID, db: Session) -> bool:
    all_nodes = db.scalars(
        select(models.Node).where(models.Node.section_id == section_id)
    ).all()
    if not all_nodes:
        return False

    node_ids = [n.id for n in all_nodes]
    answered_node_ids = set(
        db.scalars(
            select(models.CaseAnswer.node_id)
            .where(models.CaseAnswer.case_id == case_id)
            .where(models.CaseAnswer.pathway_id == pathway_id)
            .where(models.CaseAnswer.node_id.in_(node_ids))
        ).all()
    )

    # Build map: parent_code -> latest choice label for sub-question conditional logic
    parent_codes = {n.parent_node_code for n in all_nodes if n.parent_node_code}
    parent_answer_map: dict[str, str | None] = {}
    if parent_codes:
        parent_nodes = [n for n in all_nodes if n.code in parent_codes]
        for pn in parent_nodes:
            if pn.id in answered_node_ids:
                row = db.execute(
                    select(models.Choice.label)
                    .join(models.CaseAnswer, models.CaseAnswer.choice_id == models.Choice.id)
                    .where(models.CaseAnswer.case_id == case_id)
                    .where(models.CaseAnswer.pathway_id == pathway_id)
                    .where(models.CaseAnswer.node_id == pn.id)
                    .order_by(models.CaseAnswer.answered_at.desc())
                    .limit(1)
                ).first()
                parent_answer_map[pn.code] = str(row[0]) if row else None

    # Determine required nodes: sub-questions only required when parent answered "No"
    required_node_ids = set()
    for node in all_nodes:
        if node.parent_node_code is None:
            required_node_ids.add(node.id)
        elif parent_answer_map.get(node.parent_node_code) == "No":
            required_node_ids.add(node.id)

    return len(answered_node_ids & required_node_ids) >= len(required_node_ids)


def _maybe_emit_survey_ready_for_review(case_id: UUID, db: Session) -> None:
    pathways = db.scalars(
        select(models.CasePathway).where(models.CasePathway.case_id == case_id)
    ).all()
    if not pathways:
        return
    if any(cp.status != "completed" for cp in pathways):
        return
    open_issue_count = db.scalar(
        select(func.count())
        .select_from(models.CaseValidationIssue)
        .where(models.CaseValidationIssue.case_id == case_id)
        .where(models.CaseValidationIssue.status == "open")
    ) or 0
    if open_issue_count > 0:
        return
    _emit_case_event_once(case_id, "survey_ready_for_review", {}, db)


def _general_harm_required(case_id: UUID, pathway_id: UUID, db: Session) -> bool:
    trigger_codes = {"gen_obs_1", "gen_obs_2", "gen_rec_1", "gen_rec_2"}
    rows = db.execute(
        select(models.CaseAnswer, models.Node.code, models.Choice.label)
        .join(models.Node, models.Node.id == models.CaseAnswer.node_id)
        .join(models.Choice, models.Choice.id == models.CaseAnswer.choice_id, isouter=True)
        .where(models.CaseAnswer.case_id == case_id)
        .where(models.CaseAnswer.pathway_id == pathway_id)
        .where(models.Node.code.in_(sorted(trigger_codes)))
        .order_by(models.CaseAnswer.answered_at.asc())
    ).all()
    latest_choice_by_code: dict[str, str | None] = {}
    for _answer, code, choice_label in rows:
        latest_choice_by_code[str(code)] = str(choice_label) if choice_label is not None else None
    return any(latest_choice_by_code.get(code) == "No" for code in trigger_codes)


def _neglect_visibility_state(case_id: UUID, pathway_id: UUID, db: Session) -> tuple[bool, bool]:
    rows = db.execute(
        select(models.CaseAnswer, models.Node.code, models.Choice.label)
        .join(models.Node, models.Node.id == models.CaseAnswer.node_id)
        .join(models.Choice, models.Choice.id == models.CaseAnswer.choice_id, isouter=True)
        .where(models.CaseAnswer.case_id == case_id)
        .where(models.CaseAnswer.pathway_id == pathway_id)
        .where(models.Node.code.in_(["neg_int_1", "neg_rec_1"]))
        .order_by(models.CaseAnswer.answered_at.asc())
    ).all()
    latest_choice_by_code: dict[str, str | None] = {}
    for _answer, code, choice_label in rows:
        latest_choice_by_code[str(code)] = str(choice_label) if choice_label is not None else None
    care_failure_confirmed = latest_choice_by_code.get("neg_int_1") == "Yes"
    reporting_failure = latest_choice_by_code.get("neg_rec_1") == "No"
    return care_failure_confirmed, reporting_failure


def _infection_harm_required(case_id: UUID, pathway_id: UUID, db: Session) -> bool:
    trigger_codes = {"inf_prev_1", "inf_mon_1", "inf_ord_1"}
    rows = db.execute(
        select(models.CaseAnswer, models.Node.code, models.Choice.label)
        .join(models.Node, models.Node.id == models.CaseAnswer.node_id)
        .join(models.Choice, models.Choice.id == models.CaseAnswer.choice_id, isouter=True)
        .where(models.CaseAnswer.case_id == case_id)
        .where(models.CaseAnswer.pathway_id == pathway_id)
        .where(models.Node.code.in_(sorted(trigger_codes)))
        .order_by(models.CaseAnswer.answered_at.asc())
    ).all()
    latest_choice_by_code: dict[str, str | None] = {}
    for _answer, code, choice_label in rows:
        latest_choice_by_code[str(code)] = str(choice_label) if choice_label is not None else None
    return any(latest_choice_by_code.get(code) == "No" for code in trigger_codes)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "time": datetime.utcnow().isoformat()}


@app.get("/api/pathways")
def list_pathways(db: Session = Depends(get_db)) -> list[dict]:
    pathways = db.scalars(select(models.Pathway).order_by(models.Pathway.id.asc())).all()
    return [{"slug": p.slug, "title": p.title, "is_active": p.is_active} for p in pathways]


@app.get("/api/lms/trainings")
def list_lms_trainings(db: Session = Depends(get_db)) -> list[dict]:
    """LMS catalog: one training per unique F-tag citable across all pathways.
    `recommended=True` when that tag has actually been cited in a survey."""
    # Tags that appear in any pathway's add_citation rules (the catalog).
    catalog_tags: set[str] = set()
    rule_actions = db.scalars(
        select(models.RuleAction).where(models.RuleAction.action_type == "add_citation")
    ).all()
    for ra in rule_actions:
        tag = str((ra.payload or {}).get("tag", "")).strip()
        if tag:
            catalog_tags.add(tag)

    # Tags actually cited in surveys → recommended.
    cited_tags = {str(t).strip() for t in db.scalars(select(models.CaseCitation.tag)).all() if str(t).strip()}
    # Include cited tags even if a rule wasn't found (defensive).
    catalog_tags |= cited_tags
    catalog_tags = {t for t in catalog_tags if t.strip()}

    # Reverse map tag -> compliance area for category/regulation.
    tag_area: dict[str, tuple[str, str]] = {}
    for area, info in COMPLIANCE_AREAS.items():
        for t in info["tags"]:
            tag_area[t] = (area, info["regulation"])

    FORMATS = ["Online module", "Video + Knowledge Check", "Interactive scenario", "Recorded webinar"]
    LEVELS = ["Foundational", "Intermediate", "Advanced"]

    out: list[dict] = []
    for tag in sorted(catalog_tags):
        meta = F_TAG_METADATA.get(tag, {})
        area, regulation = tag_area.get(tag, ("General Compliance", meta.get("regulation", "§483")))
        title = meta.get("title", "Regulatory Compliance")
        severity = meta.get("scope_severity", "")
        # Deterministic mock LMS metadata from the tag digits (stable per tag).
        digits = "".join(ch for ch in tag if ch.isdigit())
        seed = int(digits) if digits else 0
        out.append(
            {
                "f_tag": tag,
                "title": title,
                "category": area,
                "regulation": regulation,
                "severity": severity,
                "recommended": tag in cited_tags,
                "duration_min": 30 + (seed % 4) * 15,
                "format": FORMATS[seed % len(FORMATS)],
                "level": "Advanced" if severity.startswith(("G", "H", "I", "J")) else LEVELS[seed % 2],
                "modules": 3 + (seed % 4),
                "description": (
                    f"Best-practice training to prevent {tag} ({title}) deficiencies under {regulation}. "
                    "Covers root causes, surveyor expectations, documentation, and corrective actions."
                ),
            }
        )
    return out


@app.post("/api/cases/{case_id}/pathways/{slug}")
def attach_case_pathway(case_id: UUID, slug: str, db: Session = Depends(get_db)) -> dict:
    """Attach a pathway to a case if not already attached (idempotent).
    Used when a survey triggers another CEP that wasn't part of the original
    selection, so the triggered pathway can be opened and answered."""
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    pathway = get_pathway_by_slug(db, slug)
    existing = db.scalar(
        select(models.CasePathway)
        .where(models.CasePathway.case_id == case_id)
        .where(models.CasePathway.pathway_id == pathway.id)
    )
    if existing:
        return {"ok": True, "already_attached": True}
    max_order = db.scalar(
        select(func.max(models.CasePathway.display_order)).where(models.CasePathway.case_id == case_id)
    )
    start_node = db.scalar(
        select(models.Node)
        .join(models.Section, models.Section.id == models.Node.section_id)
        .where(models.Section.pathway_id == pathway.id)
        .where(models.Node.is_start.is_(True))
    )
    db.add(
        models.CasePathway(
            case_id=case_id,
            pathway_id=pathway.id,
            current_node_id=start_node.id if start_node else None,
            status="not_started",
            display_order=(max_order if max_order is not None else -1) + 1,
        )
    )
    db.add(models.CaseEvent(case_id=case_id, event_type="pathway_attached", payload={"pathway": slug}))
    db.commit()
    return {"ok": True, "already_attached": False}


@app.get("/api/cases/{case_id}/pathways")
def list_case_pathways(case_id: UUID, db: Session = Depends(get_db)) -> list[dict]:
    """The pathways attached to this survey, in order, with per-pathway status.
    Drives the dynamic milestone bar, sidebar nav, and summary cards."""
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    rows = db.execute(
        select(models.CasePathway.status, models.Pathway.slug, models.Pathway.title)
        .join(models.Pathway, models.Pathway.id == models.CasePathway.pathway_id)
        .where(models.CasePathway.case_id == case_id)
        .order_by(models.CasePathway.display_order.asc(), models.Pathway.id.asc())
    ).all()
    return [{"slug": slug, "title": title, "status": status} for status, slug, title in rows]


@app.get("/api/pathways/{slug}", response_model=schemas.PathwayDefinitionOut)
def get_pathway_definition(slug: str, db: Session = Depends(get_db)):
    pathway = get_pathway_by_slug(db, slug)

    sections = db.scalars(
        select(models.Section)
        .where(models.Section.pathway_id == pathway.id)
        .order_by(models.Section.display_order.asc())
    ).all()

    section_out = []
    for section in sections:
        nodes = db.scalars(
            select(models.Node)
            .where(models.Node.section_id == section.id)
            .order_by(models.Node.display_order.asc())
        ).all()
        node_out = []
        for node in nodes:
            choices = db.scalars(
                select(models.Choice)
                .where(models.Choice.node_id == node.id)
                .order_by(models.Choice.display_order.asc())
            ).all()
            transitions = db.scalars(
                select(models.Transition)
                .where(models.Transition.pathway_id == pathway.id)
                .where(models.Transition.from_node_id == node.id)
                .order_by(models.Transition.priority.asc())
            ).all()
            rules: list[schemas.NodeRuleOut] = []
            for transition in transitions:
                if not transition.choice_id:
                    continue
                choice = db.get(models.Choice, transition.choice_id)
                if not choice:
                    continue
                actions = db.scalars(
                    select(models.RuleAction).where(models.RuleAction.transition_id == transition.id)
                ).all()
                if not actions:
                    continue
                rules.append(
                    schemas.NodeRuleOut(
                        when_choice=choice.label,
                        actions=[
                            schemas.RuleActionOut(type=a.action_type, payload=a.payload or {})
                            for a in actions
                        ],
                    )
                )
            node_out.append(
                schemas.NodeOut(
                    id=node.id,
                    code=node.code,
                    prompt=node.prompt,
                    node_type=node.node_type,
                    is_terminal=node.is_terminal,
                    parent_node_code=node.parent_node_code,
                    choices=[
                        schemas.ChoiceOut(id=c.id, code=c.code, label=c.label, value=c.value)
                        for c in choices
                    ],
                    rules=rules,
                )
            )
        section_out.append(
            schemas.SectionOut(
                id=section.id,
                slug=section.slug,
                title=section.title,
                order=section.display_order,
                nodes=node_out,
            )
        )

    return schemas.PathwayDefinitionOut(
        id=pathway.id,
        slug=pathway.slug,
        title=pathway.title,
        sections=section_out,
    )


@app.post("/api/cases", response_model=schemas.CaseOut)
def create_case(payload: schemas.CaseCreateIn, db: Session = Depends(get_db)):
    duplicate = db.scalar(
        select(models.Case).where(models.Case.external_case_id == payload.external_case_id)
    )
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"A survey named '{payload.external_case_id}' already exists. Please choose a different name.",
        )

    case = models.Case(
        external_case_id=payload.external_case_id,
        resident_id=payload.resident_id,
        facility_name=payload.facility_name,
        status="new",
    )
    db.add(case)
    db.flush()

    active = db.scalars(
        select(models.Pathway).where(models.Pathway.is_active.is_(True)).order_by(models.Pathway.id.asc())
    ).all()
    if payload.pathway_slugs:
        # Honor the surveyor's selection ORDER, not the database id order.
        by_slug = {p.slug: p for p in active}
        pathways = [by_slug[s] for s in payload.pathway_slugs if s in by_slug]
    else:
        pathways = list(active)
    for order, pathway in enumerate(pathways):
        start_node = db.scalar(
            select(models.Node)
            .join(models.Section, models.Section.id == models.Node.section_id)
            .where(models.Section.pathway_id == pathway.id)
            .where(models.Node.is_start.is_(True))
        )
        db.add(
            models.CasePathway(
                case_id=case.id,
                pathway_id=pathway.id,
                current_node_id=start_node.id if start_node else None,
                status="not_started",
                display_order=order,
            )
        )

    db.add(
        models.CaseEvent(
            case_id=case.id,
            event_type="case_created",
            payload={"external_case_id": case.external_case_id},
        )
    )
    db.commit()
    db.refresh(case)
    return case


@app.get("/api/cases/{case_id}", response_model=schemas.CaseOut)
def get_case(case_id: UUID, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@app.get("/api/cases", response_model=list[schemas.CaseOut])
def list_cases(db: Session = Depends(get_db)):
    return db.scalars(
        select(models.Case).order_by(models.Case.created_at.desc())
    ).all()


@app.patch("/api/cases/{case_id}", response_model=schemas.CaseOut)
def update_case(case_id: UUID, payload: schemas.CaseUpdateIn, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    case.external_case_id = payload.external_case_id
    case.resident_id = payload.resident_id
    case.facility_name = payload.facility_name
    db.add(
        models.CaseEvent(
            case_id=case.id,
            event_type="case_updated",
            payload={
                "external_case_id": case.external_case_id,
                "resident_id": case.resident_id,
                "facility_name": case.facility_name,
            },
        )
    )
    db.commit()
    db.refresh(case)
    return case


@app.delete("/api/admin/pathways/{slug}", response_model=schemas.ActionResultOut)
def delete_pathway(slug: str, db: Session = Depends(get_db)):
    """Permanently delete a single pathway and everything under it.

    Definition children (section/node/choice/transition/rule_action) and any
    in-progress survey rows for this pathway (case_pathway/case_answer) are
    removed via DB ON DELETE CASCADE; citations/flags/events keep their history
    with pathway_id set to NULL.
    """
    pathway = db.scalar(select(models.Pathway).where(models.Pathway.slug == slug))
    if not pathway:
        raise HTTPException(status_code=404, detail=f"Pathway '{slug}' not found")
    db.execute(delete(models.Pathway).where(models.Pathway.id == pathway.id))
    db.commit()
    return schemas.ActionResultOut(ok=True, message=f"Pathway '{pathway.title}' deleted")


@app.delete("/api/cases/{case_id}")
def delete_case(case_id: UUID, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    db.execute(delete(models.CaseAnswer).where(models.CaseAnswer.case_id == case_id))
    db.execute(delete(models.CaseFlag).where(models.CaseFlag.case_id == case_id))
    db.execute(delete(models.CaseCitation).where(models.CaseCitation.case_id == case_id))
    db.execute(delete(models.CaseValidationIssue).where(models.CaseValidationIssue.case_id == case_id))
    db.execute(delete(models.EvidenceItem).where(models.EvidenceItem.case_id == case_id))
    db.execute(delete(models.CaseEvent).where(models.CaseEvent.case_id == case_id))
    db.execute(delete(models.CasePathway).where(models.CasePathway.case_id == case_id))
    db.delete(case)
    db.commit()
    return {"ok": True}


@app.delete("/api/cases")
def purge_all_cases(db: Session = Depends(get_db)):
    db.execute(delete(models.CaseAnswer))
    db.execute(delete(models.CaseFlag))
    db.execute(delete(models.CaseCitation))
    db.execute(delete(models.CaseValidationIssue))
    db.execute(delete(models.CaseEvent))
    db.execute(delete(models.EvidenceItem))
    db.execute(delete(models.CasePathway))
    db.execute(delete(models.Case))
    db.commit()
    return {"ok": True}


@app.get("/api/cases/{case_id}/state", response_model=schemas.CaseStateOut)
def get_case_state(case_id: UUID, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    cps = db.execute(
        select(models.CasePathway, models.Pathway.slug)
        .join(models.Pathway, models.Pathway.id == models.CasePathway.pathway_id)
        .where(models.CasePathway.case_id == case_id)
    ).all()

    general_status = "not_started"
    neglect_status = "not_started"
    infection_status = "not_started"
    for cp, slug in cps:
        if slug == "general-cep":
            general_status = cp.status
        elif slug == "neglect-cep":
            neglect_status = cp.status
        elif slug == "infection-control-cep":
            infection_status = cp.status

    flags = db.scalars(select(models.CaseFlag).where(models.CaseFlag.case_id == case_id)).all()
    citations = db.scalars(select(models.CaseCitation).where(models.CaseCitation.case_id == case_id)).all()

    return schemas.CaseStateOut(
        case_id=case_id,
        general_status=general_status,
        neglect_status=neglect_status,
        infection_status=infection_status,
        flags=[f"{f.code}: {f.message}" for f in flags],
        citations=[f"{c.tag}: {c.rationale}" for c in citations],
    )


@app.get("/api/cases/{case_id}/findings-summary", response_model=schemas.FindingsSummaryOut)
def get_findings_summary(case_id: UUID, db: Session = Depends(get_db)):
    return _build_findings_summary(case_id, db)


@app.get("/api/cases/{case_id}/pathways/{slug}/snapshot", response_model=schemas.CasePathwaySnapshotOut)
def get_case_pathway_snapshot(case_id: UUID, slug: str, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    pathway = get_pathway_by_slug(db, slug)

    cp = db.scalar(
        select(models.CasePathway)
        .where(models.CasePathway.case_id == case_id)
        .where(models.CasePathway.pathway_id == pathway.id)
    )
    if not cp:
        raise HTTPException(status_code=404, detail="Case pathway not found")

    answers = db.scalars(
        select(models.CaseAnswer)
        .where(models.CaseAnswer.case_id == case_id)
        .where(models.CaseAnswer.pathway_id == pathway.id)
        .order_by(models.CaseAnswer.answered_at.asc())
    ).all()
    latest_by_node: dict[UUID, models.CaseAnswer] = {}
    for ans in answers:
        latest_by_node[ans.node_id] = ans

    ordered_nodes = _get_ordered_nodes(db, pathway.id)

    answer_rows: list[schemas.NodeAnswerOut] = []
    for node in ordered_nodes:
        ans = latest_by_node.get(node.id)
        if not ans:
            continue
        choice_label = None
        if ans.choice_id:
            choice = db.get(models.Choice, ans.choice_id)
            if choice:
                choice_label = choice.label
        answer_rows.append(
            schemas.NodeAnswerOut(
                node_id=ans.node_id,
                choice_id=ans.choice_id,
                choice_label=choice_label,
                notes=ans.notes,
                evidence_refs=ans.evidence_refs,
                answered_at=ans.answered_at,
            )
        )

    return schemas.CasePathwaySnapshotOut(
        case_id=case_id,
        pathway_slug=slug,
        pathway_status=cp.status,
        current_node_id=cp.current_node_id,
        answers=answer_rows,
    )


@app.get("/api/cases/{case_id}/validation-issues", response_model=list[schemas.CaseValidationIssueOut])
def list_validation_issues(case_id: UUID, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return db.scalars(
        select(models.CaseValidationIssue)
        .where(models.CaseValidationIssue.case_id == case_id)
        .order_by(models.CaseValidationIssue.status.asc(), models.CaseValidationIssue.created_at.asc())
    ).all()


@app.get("/api/cases/{case_id}/pathways/{slug}/validation-issues", response_model=list[schemas.CaseValidationIssueOut])
def list_pathway_validation_issues(case_id: UUID, slug: str, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    pathway = get_pathway_by_slug(db, slug)
    return db.scalars(
        select(models.CaseValidationIssue)
        .where(models.CaseValidationIssue.case_id == case_id)
        .where(models.CaseValidationIssue.pathway_id == pathway.id)
        .order_by(models.CaseValidationIssue.status.asc(), models.CaseValidationIssue.created_at.asc())
    ).all()


@app.post("/api/cases/{case_id}/validation-issues/{issue_id}/resolve", response_model=schemas.ActionResultOut)
def resolve_validation_issue(case_id: UUID, issue_id: UUID, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    issue = db.get(models.CaseValidationIssue, issue_id)
    if not issue or issue.case_id != case_id:
        raise HTTPException(status_code=404, detail="Validation issue not found")
    issue.status = "resolved"
    issue.resolved_at = datetime.utcnow()
    db.add(models.CaseEvent(case_id=case_id, event_type="validation_issue_resolved", payload={"issue_id": str(issue_id), "code": issue.code}))
    _maybe_emit_survey_ready_for_review(case_id, db)
    db.commit()
    return schemas.ActionResultOut(ok=True, message="Validation issue resolved")


@app.patch("/api/cases/{case_id}/pathways/{slug}/status", response_model=schemas.CasePathwaySnapshotOut)
def update_pathway_status(
    case_id: UUID,
    slug: str,
    payload: schemas.PathwayStatusUpdateIn,
    db: Session = Depends(get_db),
):
    pathway = get_pathway_by_slug(db, slug)
    cp = db.scalar(
        select(models.CasePathway)
        .where(models.CasePathway.case_id == case_id)
        .where(models.CasePathway.pathway_id == pathway.id)
    )
    if not cp:
        raise HTTPException(status_code=404, detail="Case pathway not found")

    cp.status = payload.status
    if payload.status == "in_progress" and cp.started_at is None:
        cp.started_at = datetime.utcnow()
    if payload.status == "completed":
        ordered_nodes = _get_ordered_nodes(db, pathway.id)
        optional_node_ids: set[UUID] = set()
        if slug == "general-cep":
            harm_required = _general_harm_required(case_id, pathway.id, db)
            if not harm_required:
                optional_node_ids = set(
                    db.scalars(
                        select(models.Node.id)
                        .join(models.Section, models.Section.id == models.Node.section_id)
                        .where(models.Section.pathway_id == pathway.id)
                        .where(models.Section.slug == "harm")
                    ).all()
                )
        elif slug == "neglect-cep":
            care_failure_confirmed, reporting_failure = _neglect_visibility_state(case_id, pathway.id, db)
            optional_section_slugs: list[str] = []
            if not care_failure_confirmed:
                optional_section_slugs.append("records")
            if not (reporting_failure or care_failure_confirmed):
                optional_section_slugs.append("investigator")
            if optional_section_slugs:
                optional_node_ids = set(
                    db.scalars(
                        select(models.Node.id)
                        .join(models.Section, models.Section.id == models.Node.section_id)
                        .where(models.Section.pathway_id == pathway.id)
                        .where(models.Section.slug.in_(optional_section_slugs))
                    ).all()
                )
        elif slug == "infection-control-cep":
            harm_required = _infection_harm_required(case_id, pathway.id, db)
            if not harm_required:
                optional_node_ids = set(
                    db.scalars(
                        select(models.Node.id)
                        .join(models.Section, models.Section.id == models.Node.section_id)
                        .where(models.Section.pathway_id == pathway.id)
                        .where(models.Section.slug == "harm")
                    ).all()
                )
        # Latest answer label per node (used for sub-question and goto skips)
        all_answers = db.execute(
            select(models.CaseAnswer.node_id, models.Choice.label)
            .join(models.Choice, models.Choice.id == models.CaseAnswer.choice_id, isouter=True)
            .where(models.CaseAnswer.case_id == case_id)
            .where(models.CaseAnswer.pathway_id == pathway.id)
            .order_by(models.CaseAnswer.answered_at.asc())
        ).all()
        latest_label_by_node: dict[UUID, str | None] = {}
        for ans_nid, lbl in all_answers:
            latest_label_by_node[ans_nid] = str(lbl) if lbl else None

        # Also exclude sub-questions whose parent was not answered "No"
        all_sub_nodes = [n for n in ordered_nodes if n.parent_node_code is not None]
        if all_sub_nodes:
            parent_code_to_node: dict[str, models.Node] = {n.code: n for n in ordered_nodes if n.parent_node_code is None}
            for sub_node in all_sub_nodes:
                parent = parent_code_to_node.get(sub_node.parent_node_code)
                if not parent or latest_label_by_node.get(parent.id) != "No":
                    optional_node_ids.add(sub_node.id)

        # Also exclude questions skipped by "goto_question" rules: when an
        # answered choice carries a goto action, nodes between the answered
        # question and the target are not required.
        goto_rules = db.execute(
            select(models.Transition.from_node_id, models.Choice.label, models.RuleAction.payload)
            .join(models.RuleAction, models.RuleAction.transition_id == models.Transition.id)
            .join(models.Choice, models.Choice.id == models.Transition.choice_id)
            .where(models.Transition.pathway_id == pathway.id)
            .where(models.RuleAction.action_type == "goto_question")
        ).all()
        if goto_rules:
            index_by_node_id = {n.id: i for i, n in enumerate(ordered_nodes)}
            node_by_code = {n.code: n for n in ordered_nodes}
            for from_node_id, choice_label, action_payload in goto_rules:
                if latest_label_by_node.get(from_node_id) != str(choice_label):
                    continue
                target = node_by_code.get(str((action_payload or {}).get("target_node_code", "")))
                i = index_by_node_id.get(from_node_id)
                j = index_by_node_id.get(target.id) if target else None
                if i is None or j is None or j <= i + 1:
                    continue
                for skipped in ordered_nodes[i + 1 : j]:
                    optional_node_ids.add(skipped.id)

        required_node_ids = {n.id for n in ordered_nodes if n.id not in optional_node_ids}
        answered_node_ids = set(
            db.scalars(
                select(models.CaseAnswer.node_id)
                .where(models.CaseAnswer.case_id == case_id)
                .where(models.CaseAnswer.pathway_id == pathway.id)
            ).all()
        )
        missing = [n.code for n in ordered_nodes if n.id in required_node_ids and n.id not in answered_node_ids]
        if missing:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Cannot complete pathway until all nodes are answered",
                    "missing_count": len(missing),
                    "required_count": len(required_node_ids),
                    "answered_count": len(answered_node_ids & required_node_ids),
                    "missing_nodes": missing[:20],
                },
            )
        open_issues = db.scalars(
            select(models.CaseValidationIssue)
            .where(models.CaseValidationIssue.case_id == case_id)
            .where(models.CaseValidationIssue.pathway_id == pathway.id)
            .where(models.CaseValidationIssue.status == "open")
        ).all()
        if open_issues:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Cannot complete pathway while validation issues are open",
                    "open_issue_count": len(open_issues),
                    "open_issues": [f"{i.code}: {i.message}" for i in open_issues[:20]],
                },
            )
        cp.completed_at = datetime.utcnow()
    if payload.status == "not_started":
        cp.started_at = None
        cp.completed_at = None

    pathways = db.scalars(
        select(models.CasePathway).where(models.CasePathway.case_id == case_id)
    ).all()
    case = db.get(models.Case, case_id)
    if case and pathways:
        if all(p.status == "completed" for p in pathways):
            case.status = "completed"
        elif any(p.status in ("in_progress", "completed") for p in pathways):
            case.status = "in_progress"

    db.add(models.CaseEvent(case_id=case_id, event_type="pathway_status_updated", payload={"pathway": slug, "pathway_title": pathway.title, "status": payload.status}))
    if payload.status == "completed":
        _emit_case_event_once(case_id, "pathway_completed", {"pathway": slug, "pathway_title": pathway.title}, db)
    _maybe_emit_survey_ready_for_review(case_id, db)
    db.commit()

    return get_case_pathway_snapshot(case_id=case_id, slug=slug, db=db)


@app.get("/api/cases/{case_id}/evidence", response_model=list[schemas.EvidenceOut])
def list_evidence(case_id: UUID, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    items = db.scalars(
        select(models.EvidenceItem)
        .where(models.EvidenceItem.case_id == case_id)
        .order_by(models.EvidenceItem.created_at.asc())
    ).all()
    return [_serialize_evidence(item) for item in items]


@app.post("/api/cases/{case_id}/evidence", response_model=schemas.EvidenceOut)
def add_evidence(case_id: UUID, payload: schemas.EvidenceCreateIn, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    label = payload.label
    if not label:
        total = db.scalar(
            select(func.count())
            .select_from(models.EvidenceItem)
            .where(models.EvidenceItem.case_id == case_id)
        )
        label = f"EVID-{str(total + 1).zfill(2)}"

    item = models.EvidenceItem(
        case_id=case_id,
        label=label,
        description=payload.description,
        source_type=payload.source_type,
    )
    db.add(item)
    db.add(models.CaseEvent(case_id=case_id, event_type="evidence_added", payload={"label": label}))
    db.commit()
    db.refresh(item)
    return _serialize_evidence(item)


@app.post("/api/cases/{case_id}/evidence/upload", response_model=schemas.EvidenceOut)
async def upload_evidence(
    case_id: UUID,
    file: UploadFile = File(...),
    label: str | None = Form(default=None),
    description: str = Form(default=""),
    db: Session = Depends(get_db),
):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    safe_name = Path(file.filename or "evidence.bin").name
    case_dir = UPLOADS_DIR / str(case_id)
    case_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{safe_name}"
    stored_path = case_dir / stored_name

    with stored_path.open("wb") as f:
        content = await file.read()
        f.write(content)

    if not label:
        total = db.scalar(
            select(func.count())
            .select_from(models.EvidenceItem)
            .where(models.EvidenceItem.case_id == case_id)
        )
        label = f"EVID-{str(total + 1).zfill(2)}"

    metadata = {
        "filename": safe_name,
        "stored_name": stored_name,
        "stored_path": str(stored_path),
        "content_type": file.content_type or "application/octet-stream",
        "size": len(content),
        "description": description,
    }

    item = models.EvidenceItem(
        case_id=case_id,
        label=label,
        description=json.dumps(metadata),
        source_type="file",
    )
    db.add(item)
    db.add(
        models.CaseEvent(
            case_id=case_id,
            event_type="evidence_uploaded",
            payload={"label": label, "filename": safe_name, "size": len(content)},
        )
    )
    db.commit()
    db.refresh(item)
    return _serialize_evidence(item)


@app.get("/api/cases/{case_id}/evidence/{evidence_id}/download")
def download_evidence(case_id: UUID, evidence_id: UUID, db: Session = Depends(get_db)):
    item = db.get(models.EvidenceItem, evidence_id)
    if not item or item.case_id != case_id:
        raise HTTPException(status_code=404, detail="Evidence not found")
    if item.source_type != "file":
        raise HTTPException(status_code=400, detail="Evidence is not a file")

    try:
        meta = json.loads(item.description)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Invalid evidence metadata") from exc

    stored_path = Path(str(meta.get("stored_path", "")))
    filename = str(meta.get("filename") or "evidence.bin")
    media_type = str(meta.get("content_type") or "application/octet-stream")
    if not stored_path.exists():
        raise HTTPException(status_code=404, detail="Evidence file not found on disk")

    return FileResponse(path=stored_path, filename=filename, media_type=media_type)


@app.post("/api/cases/{case_id}/answers", response_model=schemas.NextStepOut)
def submit_answer(case_id: UUID, payload: schemas.AnswerSubmitIn, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    pathway = get_pathway_by_slug(db, payload.pathway_slug)

    node = db.get(models.Node, payload.node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    node_pathway = db.scalar(
        select(models.Pathway.id)
        .join(models.Section, models.Section.pathway_id == models.Pathway.id)
        .join(models.Node, models.Node.section_id == models.Section.id)
        .where(models.Node.id == payload.node_id)
    )
    if node_pathway != pathway.id:
        raise HTTPException(status_code=400, detail="Node does not belong to pathway")

    if payload.choice_id:
        choice = db.get(models.Choice, payload.choice_id)
        if not choice:
            raise HTTPException(status_code=404, detail="Choice not found")
        if choice.node_id != payload.node_id:
            raise HTTPException(status_code=400, detail="Choice does not belong to node")

    section = db.scalar(
        select(models.Section)
        .join(models.Node, models.Node.section_id == models.Section.id)
        .where(models.Node.id == payload.node_id)
    )

    answer = models.CaseAnswer(
        case_id=case_id,
        pathway_id=pathway.id,
        node_id=payload.node_id,
        choice_id=payload.choice_id,
        notes=payload.notes,
        evidence_refs=payload.evidence_refs,
    )
    db.add(answer)

    result = evaluate_answer(
        db=db,
        case_id=case_id,
        pathway_id=pathway.id,
        node_id=payload.node_id,
        choice_id=payload.choice_id,
    )
    # Build rich payload for audit trail
    answer_payload: dict[str, str] = {
        "pathway": payload.pathway_slug,
        "node_id": str(payload.node_id),
        "question": node.prompt[:120] if node.prompt else "",
    }
    if section:
        answer_payload["section"] = section.title or section.slug
    if payload.choice_id:
        choice_obj = db.get(models.Choice, payload.choice_id)
        if choice_obj:
            answer_payload["choice"] = choice_obj.label or choice_obj.value or ""
    if payload.notes:
        answer_payload["notes"] = str(payload.notes)[:100]
    db.add(
        models.CaseEvent(
            case_id=case_id,
            event_type="answer_submitted",
            payload=answer_payload,
        )
    )
    if result.get("recommendation"):
        db.add(
            models.CaseEvent(
                case_id=case_id,
                event_type="recommendation_generated",
                payload={
                    "pathway": payload.pathway_slug,
                    "message": result["recommendation"],
                    "target_slug": result.get("recommendation_slug"),
                },
            )
        )

    if section and _section_is_complete(case_id, pathway.id, section.id, db):
        _emit_case_event_once(
            case_id,
            "section_completed",
            {"pathway": payload.pathway_slug, "section": section.slug, "section_title": section.title or section.slug},
            db,
        )

    cp = db.scalar(
        select(models.CasePathway)
        .where(models.CasePathway.case_id == case_id)
        .where(models.CasePathway.pathway_id == pathway.id)
    )
    if cp and cp.status == "completed":
        _emit_case_event_once(case_id, "pathway_completed", {"pathway": payload.pathway_slug}, db)
    _maybe_emit_survey_ready_for_review(case_id, db)
    db.commit()

    return schemas.NextStepOut(**result)


@app.get("/api/cases/{case_id}/events", response_model=list[schemas.CaseEventOut])
def list_case_events(case_id: UUID, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    events = db.scalars(
        select(models.CaseEvent)
        .where(models.CaseEvent.case_id == case_id)
        .order_by(models.CaseEvent.created_at.desc())
        .limit(100)
    ).all()
    return events


@app.post("/api/cases/{case_id}/save", response_model=schemas.ActionResultOut)
def save_case(case_id: UUID, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    db.add(
        models.CaseEvent(
            case_id=case_id,
            event_type="manual_save",
            payload={"status": case.status},
        )
    )
    db.commit()
    return schemas.ActionResultOut(ok=True, message="Case saved")


@app.post("/api/cases/{case_id}/reset", response_model=schemas.ActionResultOut)
def reset_case(case_id: UUID, db: Session = Depends(get_db)):
    case = db.get(models.Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    db.execute(delete(models.CaseAnswer).where(models.CaseAnswer.case_id == case_id))
    db.execute(delete(models.CaseFlag).where(models.CaseFlag.case_id == case_id))
    db.execute(delete(models.CaseCitation).where(models.CaseCitation.case_id == case_id))
    db.execute(delete(models.CaseValidationIssue).where(models.CaseValidationIssue.case_id == case_id))
    db.execute(delete(models.EvidenceItem).where(models.EvidenceItem.case_id == case_id))
    db.execute(
        delete(models.CaseEvent)
        .where(models.CaseEvent.case_id == case_id)
        .where(models.CaseEvent.event_type != "case_created")
    )

    pathways = db.scalars(select(models.CasePathway).where(models.CasePathway.case_id == case_id)).all()
    for cp in pathways:
        start_node = db.scalar(
            select(models.Node)
            .join(models.Section, models.Section.id == models.Node.section_id)
            .where(models.Section.pathway_id == cp.pathway_id)
            .where(models.Node.is_start.is_(True))
        )
        cp.current_node_id = start_node.id if start_node else None
        cp.status = "not_started"
        cp.started_at = None
        cp.completed_at = None

    case.status = "in_progress"
    case_upload_dir = UPLOADS_DIR / str(case_id)
    if case_upload_dir.exists():
        shutil.rmtree(case_upload_dir, ignore_errors=True)
    db.add(models.CaseEvent(case_id=case_id, event_type="case_reset", payload={}))
    db.commit()
    return schemas.ActionResultOut(ok=True, message="Case reset")


@app.get("/api/cases/{case_id}/report.pdf")
def get_case_report_pdf(case_id: UUID, db: Session = Depends(get_db)):
    summary = _build_findings_summary(case_id, db)
    state = get_case_state(case_id, db)
    generated_at_iso = datetime.utcnow().isoformat()

    _emit_case_event_once(case_id, "report_exported", {"format": "pdf"}, db)
    db.commit()

    pdf = _build_cms_2567_pdf(summary=summary, state=state, generated_at_iso=generated_at_iso)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename=\"cms-2567-{str(case_id)[:8]}.pdf\"'},
    )


@app.get("/api/admin/workflows/runtime-status")
def runtime_status(db: Session = Depends(get_db)):
    """Return counts of runtime data that would be wiped on import with reset_runtime=true."""
    case_count = db.scalar(select(func.count()).select_from(models.Case)) or 0
    answer_count = db.scalar(select(func.count()).select_from(models.CaseAnswer)) or 0
    return {"case_count": case_count, "answer_count": answer_count}


# ── Dashboard endpoints ───────────────────────────────────────────


def _build_dashboard_stats(db: Session, facility_filter: str | None = None):
    """Shared logic for overview and facility dashboard endpoints."""
    now = datetime.utcnow()
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 1:
        prev_month_start = current_month_start.replace(year=now.year - 1, month=12)
    else:
        prev_month_start = current_month_start.replace(month=now.month - 1)

    def _case_filter(stmt):
        if facility_filter:
            return stmt.where(models.Case.facility_name == facility_filter)
        return stmt

    def _citation_filter_via_case(stmt):
        if facility_filter:
            return stmt.join(models.Case, models.CaseCitation.case_id == models.Case.id).where(
                models.Case.facility_name == facility_filter
            )
        return stmt

    def _issue_filter_via_case(stmt):
        if facility_filter:
            return stmt.join(models.Case, models.CaseValidationIssue.case_id == models.Case.id).where(
                models.Case.facility_name == facility_filter
            )
        return stmt

    # Facility count
    total_facilities = db.scalar(_case_filter(
        select(func.count(func.distinct(models.Case.facility_name)))
    )) or 0

    # Case counts
    total_cases = db.scalar(_case_filter(select(func.count(models.Case.id)))) or 0
    in_progress = db.scalar(_case_filter(
        select(func.count(models.Case.id)).where(models.Case.status == "in_progress")
    )) or 0
    completed = db.scalar(_case_filter(
        select(func.count(models.Case.id)).where(models.Case.status == "completed")
    )) or 0

    # Monthly survey completions
    completed_this = db.scalar(_case_filter(
        select(func.count(models.Case.id))
        .where(models.Case.status == "completed")
        .where(models.Case.created_at >= current_month_start)
    )) or 0
    completed_prev = db.scalar(_case_filter(
        select(func.count(models.Case.id))
        .where(models.Case.status == "completed")
        .where(models.Case.created_at >= prev_month_start)
        .where(models.Case.created_at < current_month_start)
    )) or 0

    # Monthly citations (deficiencies)
    cit_this = db.scalar(_citation_filter_via_case(
        select(func.count(models.CaseCitation.id))
        .where(models.CaseCitation.created_at >= current_month_start)
    )) or 0
    cit_prev = db.scalar(_citation_filter_via_case(
        select(func.count(models.CaseCitation.id))
        .where(models.CaseCitation.created_at >= prev_month_start)
        .where(models.CaseCitation.created_at < current_month_start)
    )) or 0

    # Action items from validation issues
    issue_stmt = _issue_filter_via_case(
        select(models.CaseValidationIssue)
        .where(models.CaseValidationIssue.status == "open")
    )
    open_issues = db.scalars(issue_stmt).all()
    past_due = sum(1 for i in open_issues if (now - i.created_at).days > 7)
    due_soon = sum(1 for i in open_issues if 3 <= (now - i.created_at).days <= 7)
    pending = sum(1 for i in open_issues if (now - i.created_at).days < 3)

    # Citations by F-Tag
    ftag_stmt = (
        select(models.CaseCitation.tag, func.count(models.CaseCitation.id).label("cnt"))
        .group_by(models.CaseCitation.tag)
        .order_by(func.count(models.CaseCitation.id).desc())
    )
    if facility_filter:
        ftag_stmt = ftag_stmt.join(models.Case, models.CaseCitation.case_id == models.Case.id).where(
            models.Case.facility_name == facility_filter
        )
    ftag_rows = db.execute(ftag_stmt).all()
    ftag_map = {row.tag: row.cnt for row in ftag_rows}

    ftag_citations = []
    for tag, cnt in ftag_map.items():
        meta = F_TAG_METADATA.get(tag, {})
        ftag_citations.append(schemas.FTagCitationOut(
            tag=tag,
            title=meta.get("title", tag),
            regulation=meta.get("regulation", ""),
            scope_severity=meta.get("scope_severity", ""),
            count=cnt,
        ))

    # Compliance area scores + heat map
    area_scores = []
    heat_map = []
    for area_name, area_info in COMPLIANCE_AREAS.items():
        area_count = sum(ftag_map.get(t, 0) for t in area_info["tags"])
        score = max(0, 100 - area_count * 15)
        area_scores.append(schemas.ComplianceAreaScoreOut(
            area_name=area_name,
            regulation=area_info["regulation"],
            tags=area_info["tags"],
            citation_count=area_count,
            score=score,
        ))
        for tag in area_info["tags"]:
            heat_map.append(schemas.HeatMapCellOut(
                area_name=area_name,
                tag=tag,
                count=ftag_map.get(tag, 0),
            ))

    # Action plans for top cited tags
    action_plans = []
    for ftag in sorted(ftag_citations, key=lambda x: x.count, reverse=True)[:5]:
        rec = ACTION_PLAN_TEMPLATES.get(ftag.tag, "Review and address cited deficiency areas.")
        action_plans.append(schemas.ActionPlanItemOut(
            tag=ftag.tag,
            title=ftag.title,
            regulation=ftag.regulation,
            citation_count=ftag.count,
            recommendation=rec,
        ))

    # Pathway coverage: per-facility, per-pathway status breakdown
    pw_stmt = (
        select(
            models.Case.facility_name,
            models.Pathway.title.label("pathway_title"),
            models.Pathway.slug.label("pathway_slug"),
            func.sum(case((models.CasePathway.status == "not_started", 1), else_=0)).label("not_started"),
            func.sum(case((models.CasePathway.status == "in_progress", 1), else_=0)).label("in_progress"),
            func.sum(case((models.CasePathway.status == "completed", 1), else_=0)).label("completed"),
        )
        .join(models.Case, models.CasePathway.case_id == models.Case.id)
        .join(models.Pathway, models.CasePathway.pathway_id == models.Pathway.id)
        .group_by(models.Case.facility_name, models.Pathway.title, models.Pathway.slug)
        .order_by(models.Case.facility_name, models.Pathway.title)
    )
    if facility_filter:
        pw_stmt = pw_stmt.where(models.Case.facility_name == facility_filter)
    pw_rows = db.execute(pw_stmt).all()
    pathway_coverage = [
        schemas.PathwayCoverageItemOut(
            facility_name=r.facility_name,
            pathway_title=r.pathway_title,
            pathway_slug=r.pathway_slug,
            not_started=r.not_started or 0,
            in_progress=r.in_progress or 0,
            completed=r.completed or 0,
        )
        for r in pw_rows
    ]

    # ── Activity Trend: cases grouped by month + status ──────────
    from datetime import timedelta
    from sqlalchemy import literal_column
    ninety_days_ago = now - timedelta(days=90)
    period_expr = func.to_char(models.Case.created_at, 'YYYY-MM')
    trend_stmt = _case_filter(
        select(
            period_expr.label("period"),
            func.sum(case((models.Case.status == "in_progress", 1), else_=0)).label("in_progress_cnt"),
            func.sum(case((models.Case.status == "completed", 1), else_=0)).label("completed_cnt"),
            func.sum(case((models.Case.status.notin_(["in_progress", "completed"]), 1), else_=0)).label("new_cnt"),
        )
        .group_by(literal_column("period"))
        .order_by(literal_column("period"))
    )
    trend_rows = db.execute(trend_stmt).all()
    activity_trend = [
        schemas.ActivityTrendPointOut(
            period=r.period,
            new=r.new_cnt or 0,
            in_progress=r.in_progress_cnt or 0,
            completed=r.completed_cnt or 0,
        )
        for r in trend_rows
    ]

    # ── Daily Activity: case count per day (last 90 days) ──────
    day_expr = func.to_char(models.Case.created_at, 'YYYY-MM-DD')
    daily_stmt = _case_filter(
        select(
            day_expr.label("day"),
            func.count(models.Case.id).label("cnt"),
        )
        .where(models.Case.created_at >= ninety_days_ago)
        .group_by(literal_column("day"))
        .order_by(literal_column("day"))
    )
    daily_rows = db.execute(daily_stmt).all()
    daily_activity = [
        schemas.DailyActivityOut(date=r.day, count=r.cnt or 0) for r in daily_rows
    ]

    # ── Funnel: Created → In-Progress → Completed → With Citations ──
    cases_with_cit = db.scalar(_case_filter(
        select(func.count(func.distinct(models.CaseCitation.case_id)))
        .join(models.Case, models.CaseCitation.case_id == models.Case.id)
    )) or 0
    funnel_data = [
        schemas.FunnelStepOut(name="Created", value=total_cases),
        schemas.FunnelStepOut(name="In Progress", value=in_progress + completed),
        schemas.FunnelStepOut(name="Completed", value=completed),
        schemas.FunnelStepOut(name="With Citations", value=cases_with_cit),
    ]

    # ── Facility Leaderboard: top 5 by survey count ────────────
    lb_stmt = (
        select(
            models.Case.facility_name,
            func.count(models.Case.id).label("survey_count"),
            func.sum(case((models.Case.status == "completed", 1), else_=0)).label("completed_cnt"),
            func.count(func.distinct(models.CaseCitation.case_id)).label("citation_count"),
        )
        .outerjoin(models.CaseCitation, models.CaseCitation.case_id == models.Case.id)
        .group_by(models.Case.facility_name)
        .order_by(func.count(models.Case.id).desc())
        .limit(5)
    )
    lb_rows = db.execute(lb_stmt).all()
    facility_leaderboard = [
        schemas.FacilityLeaderboardItemOut(
            facility_name=r.facility_name,
            survey_count=r.survey_count,
            completion_rate=round((r.completed_cnt / r.survey_count) * 100, 1) if r.survey_count else 0.0,
            citation_count=r.citation_count or 0,
        )
        for r in lb_rows
    ]

    # ── Pathway Popularity: usage + completion rate ────────────
    pp_stmt = (
        select(
            models.Pathway.title.label("pathway_title"),
            models.Pathway.slug.label("pathway_slug"),
            func.count(models.CasePathway.id).label("usage_count"),
            func.sum(case((models.CasePathway.status == "completed", 1), else_=0)).label("completed_cnt"),
        )
        .join(models.Pathway, models.CasePathway.pathway_id == models.Pathway.id)
        .group_by(models.Pathway.title, models.Pathway.slug)
        .order_by(func.count(models.CasePathway.id).desc())
    )
    pp_rows = db.execute(pp_stmt).all()
    pathway_popularity = [
        schemas.PathwayPopularityItemOut(
            pathway_title=r.pathway_title,
            pathway_slug=r.pathway_slug,
            usage_count=r.usage_count,
            completion_rate=round((r.completed_cnt / r.usage_count) * 100, 1) if r.usage_count else 0.0,
        )
        for r in pp_rows
    ]

    return {
        "total_facilities": total_facilities,
        "total_cases": total_cases,
        "in_progress_cases": in_progress,
        "completed_cases": completed,
        "surveys_completed": schemas.MonthlyStatOut(current_month=completed_this, previous_month=completed_prev),
        "deficiencies": schemas.MonthlyStatOut(current_month=cit_this, previous_month=cit_prev),
        "action_items": schemas.ActionItemsOut(past_due=past_due, due_soon=due_soon, pending=pending, total=past_due + due_soon + pending),
        "ftag_citations": ftag_citations,
        "compliance_area_scores": area_scores,
        "heat_map_data": heat_map,
        "action_plans": action_plans,
        "pathway_coverage": pathway_coverage,
        "activity_trend": activity_trend,
        "daily_activity": daily_activity,
        "funnel_data": funnel_data,
        "facility_leaderboard": facility_leaderboard,
        "pathway_popularity": pathway_popularity,
    }


@app.get("/api/dashboard/facilities", response_model=list[schemas.FacilityListItemOut])
def list_dashboard_facilities(db: Session = Depends(get_db)):
    rows = db.execute(
        select(models.Case.facility_name, func.count(models.Case.id).label("case_count"))
        .group_by(models.Case.facility_name)
        .order_by(models.Case.facility_name)
    ).all()
    return [schemas.FacilityListItemOut(facility_name=r.facility_name, case_count=r.case_count) for r in rows]


@app.get("/api/dashboard/overview", response_model=schemas.DashboardOverviewOut)
def get_dashboard_overview(db: Session = Depends(get_db)):
    stats = _build_dashboard_stats(db)

    # Facility rankings
    rank_rows = db.execute(
        select(
            models.Case.facility_name,
            func.count(models.CaseCitation.id).label("citation_count"),
            func.count(func.distinct(models.Case.id)).label("case_count"),
        )
        .outerjoin(models.CaseCitation, models.CaseCitation.case_id == models.Case.id)
        .group_by(models.Case.facility_name)
        .order_by(func.count(models.CaseCitation.id).desc())
    ).all()
    facility_rankings = [
        schemas.FacilityCitationRankOut(
            facility_name=r.facility_name,
            citation_count=r.citation_count,
            case_count=r.case_count,
        )
        for r in rank_rows
    ]

    return schemas.DashboardOverviewOut(**stats, facility_rankings=facility_rankings)


@app.get("/api/dashboard/survey-frequency", response_model=list[schemas.FacilitySurveyFrequencyOut])
def get_survey_frequency(db: Session = Depends(get_db)):
    """Per-facility survey counts with monthly breakdown for trends."""
    now = datetime.utcnow()
    current_month = now.strftime("%Y-%m")

    # Per-facility totals + status breakdown
    rows = db.execute(
        select(
            models.Case.facility_name,
            func.count(models.Case.id).label("total"),
            func.sum(case(
                (models.Case.status == "completed", 1), else_=0
            )).label("completed"),
            func.sum(case(
                (models.Case.status == "in_progress", 1), else_=0
            )).label("in_progress"),
        )
        .group_by(models.Case.facility_name)
        .order_by(models.Case.facility_name)
    ).all()

    # Monthly counts per facility (current month)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_rows = db.execute(
        select(
            models.Case.facility_name,
            func.count(models.Case.id).label("monthly_count"),
        )
        .where(models.Case.created_at >= current_month_start)
        .group_by(models.Case.facility_name)
    ).all()
    monthly_map = {r.facility_name: r.monthly_count for r in monthly_rows}

    return [
        schemas.FacilitySurveyFrequencyOut(
            facility_name=r.facility_name,
            total_surveys=r.total,
            completed=r.completed or 0,
            in_progress=r.in_progress or 0,
            month=current_month,
            monthly_count=monthly_map.get(r.facility_name, 0),
        )
        for r in rows
    ]


@app.get("/api/dashboard/facility/{facility_name}", response_model=schemas.FacilityDashboardOut)
def get_facility_dashboard(facility_name: str, db: Session = Depends(get_db)):
    # Verify facility exists
    exists = db.scalar(
        select(func.count(models.Case.id)).where(models.Case.facility_name == facility_name)
    )
    if not exists:
        raise HTTPException(status_code=404, detail=f"No cases found for facility: {facility_name}")

    stats = _build_dashboard_stats(db, facility_filter=facility_name)

    # Cases for this facility with citation counts
    case_rows = db.execute(
        select(
            models.Case,
            func.count(models.CaseCitation.id).label("citation_count"),
        )
        .outerjoin(models.CaseCitation, models.CaseCitation.case_id == models.Case.id)
        .where(models.Case.facility_name == facility_name)
        .group_by(models.Case.id)
        .order_by(models.Case.created_at.desc())
    ).all()
    cases = [
        schemas.CaseSummaryOut(
            id=row.Case.id,
            external_case_id=row.Case.external_case_id,
            resident_id=row.Case.resident_id,
            status=row.Case.status,
            created_at=row.Case.created_at,
            citation_count=row.citation_count,
        )
        for row in case_rows
    ]

    return schemas.FacilityDashboardOut(**stats, facility_name=facility_name, cases=cases)


@app.get("/api/admin/workflows/export", response_model=schemas.AdminWorkflowPayloadOut)
def export_workflows(db: Session = Depends(get_db)):
    pathways = db.scalars(
        select(models.Pathway).order_by(models.Pathway.slug.asc())
    ).all()

    out: list[dict] = []
    for pathway in pathways:
        sections = db.scalars(
            select(models.Section)
            .where(models.Section.pathway_id == pathway.id)
            .order_by(models.Section.display_order.asc())
        ).all()

        section_out: list[dict] = []
        for section in sections:
            nodes = db.scalars(
                select(models.Node)
                .where(models.Node.section_id == section.id)
                .order_by(models.Node.display_order.asc())
            ).all()
            node_out: list[dict] = []

            for node in nodes:
                choices = db.scalars(
                    select(models.Choice)
                    .where(models.Choice.node_id == node.id)
                    .order_by(models.Choice.display_order.asc())
                ).all()

                transitions = db.scalars(
                    select(models.Transition)
                    .where(models.Transition.pathway_id == pathway.id)
                    .where(models.Transition.from_node_id == node.id)
                    .order_by(models.Transition.priority.asc())
                ).all()

                rules: list[dict] = []
                for transition in transitions:
                    if not transition.choice_id:
                        continue
                    choice = db.get(models.Choice, transition.choice_id)
                    if not choice:
                        continue
                    actions = db.scalars(
                        select(models.RuleAction).where(models.RuleAction.transition_id == transition.id)
                    ).all()
                    if not actions:
                        continue
                    rules.append(
                        {
                            "when_choice": choice.label,
                            "actions": [{"type": a.action_type, "payload": a.payload} for a in actions],
                        }
                    )

                node_out.append(
                    {
                        "code": node.code,
                        "prompt": node.prompt,
                        "node_type": node.node_type,
                        "parent_node_code": node.parent_node_code,
                        "choices": [c.label for c in choices],
                        "rules": rules,
                    }
                )

            section_out.append(
                {
                    "slug": section.slug,
                    "title": section.title,
                    "nodes": node_out,
                }
            )

        out.append(
            {
                "slug": pathway.slug,
                "title": pathway.title,
                "is_active": pathway.is_active,
                "sections": section_out,
            }
        )
    return schemas.AdminWorkflowPayloadOut(pathways=out)


@app.post("/api/admin/workflows/import", response_model=schemas.ActionResultOut)
def import_workflows(payload: schemas.AdminWorkflowPayloadIn, db: Session = Depends(get_db)):
    if not payload.pathways:
        raise HTTPException(status_code=400, detail="No pathways provided")

    existing_cases = db.scalar(select(func.count()).select_from(models.Case))
    if existing_cases and not payload.reset_runtime:
        raise HTTPException(
            status_code=400,
            detail="Runtime data exists. Set reset_runtime=true to replace questionnaire definitions.",
        )

    if payload.reset_runtime:
        _clear_runtime_tables(db)
    _clear_definition_tables(db)
    db.flush()

    seen_node_codes: set[str] = set()
    for pathway_in in payload.pathways:
        pathway = models.Pathway(slug=pathway_in.slug, title=pathway_in.title, is_active=pathway_in.is_active)
        db.add(pathway)
        db.flush()

        pathway_nodes: list[tuple[models.Node, schemas.AdminNodeIn, dict[str, models.Choice]]] = []
        for sec_idx, section_in in enumerate(pathway_in.sections, start=1):
            section = models.Section(
                pathway_id=pathway.id,
                slug=section_in.slug,
                title=section_in.title,
                display_order=sec_idx,
            )
            db.add(section)
            db.flush()

            for node_idx, node_in in enumerate(section_in.nodes, start=1):
                if node_in.code in seen_node_codes:
                    raise HTTPException(status_code=400, detail=f"Duplicate node code: {node_in.code}")
                seen_node_codes.add(node_in.code)

                node = models.Node(
                    section_id=section.id,
                    code=node_in.code,
                    prompt=node_in.prompt,
                    node_type=node_in.node_type,
                    display_order=node_idx,
                    is_start=(sec_idx == 1 and node_idx == 1),
                    is_terminal=False,
                    parent_node_code=node_in.parent_node_code,
                )
                db.add(node)
                db.flush()

                choice_map: dict[str, models.Choice] = {}
                for ch_idx, label in enumerate(node_in.choices, start=1):
                    choice = models.Choice(
                        node_id=node.id,
                        code=label.lower().replace(" ", "_"),
                        label=label,
                        value=label,
                        display_order=ch_idx,
                    )
                    db.add(choice)
                    db.flush()
                    choice_map[label] = choice

                pathway_nodes.append((node, node_in, choice_map))

        for idx, (node, node_in, choice_map) in enumerate(pathway_nodes):
            next_node = pathway_nodes[idx + 1][0] if idx + 1 < len(pathway_nodes) else None
            if next_node is None:
                node.is_terminal = True

            for prio, choice in enumerate(choice_map.values(), start=1):
                transition = models.Transition(
                    pathway_id=pathway.id,
                    from_node_id=node.id,
                    choice_id=choice.id,
                    to_node_id=next_node.id if next_node else None,
                    priority=prio,
                )
                db.add(transition)
                db.flush()

                for rule in node_in.rules:
                    if rule.when_choice != choice.label:
                        continue
                    for action in rule.actions:
                        db.add(
                            models.RuleAction(
                                transition_id=transition.id,
                                action_type=action.type,
                                payload=action.payload,
                            )
                        )

    db.commit()
    return schemas.ActionResultOut(ok=True, message="Workflow definitions imported")


@app.post("/api/admin/workflows/import-pack", response_model=schemas.ActionResultOut)
def import_pack(payload: schemas.AdminWorkflowPayloadIn, db: Session = Depends(get_db)):
    """Import one or more pathways as an additive pack — does NOT
    clear existing definition or runtime tables."""
    if not payload.pathways:
        raise HTTPException(status_code=400, detail="No pathways provided")

    # Pre-flight: check for slug conflicts
    existing_slugs = set(db.scalars(select(models.Pathway.slug)).all())
    for pw_in in payload.pathways:
        if pw_in.slug in existing_slugs:
            raise HTTPException(
                status_code=409,
                detail=f"Pathway slug '{pw_in.slug}' already exists. Remove it first or choose a different slug.",
            )

    # Pre-flight: check for node-code conflicts
    existing_codes = set(db.scalars(select(models.Node.code)).all())
    for pw_in in payload.pathways:
        for sec_in in pw_in.sections:
            for node_in in sec_in.nodes:
                if node_in.code in existing_codes:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Node code '{node_in.code}' already exists. Use a unique prefix for the imported pack.",
                    )

    # Create pathways, sections, nodes, choices, transitions, rule actions
    seen_node_codes: set[str] = set()
    for pathway_in in payload.pathways:
        pathway = models.Pathway(slug=pathway_in.slug, title=pathway_in.title, is_active=pathway_in.is_active)
        db.add(pathway)
        db.flush()

        pathway_nodes: list[tuple[models.Node, schemas.AdminNodeIn, dict[str, models.Choice]]] = []
        for sec_idx, section_in in enumerate(pathway_in.sections, start=1):
            section = models.Section(
                pathway_id=pathway.id,
                slug=section_in.slug,
                title=section_in.title,
                display_order=sec_idx,
            )
            db.add(section)
            db.flush()

            for node_idx, node_in in enumerate(section_in.nodes, start=1):
                if node_in.code in seen_node_codes:
                    raise HTTPException(status_code=400, detail=f"Duplicate node code in payload: {node_in.code}")
                seen_node_codes.add(node_in.code)

                node = models.Node(
                    section_id=section.id,
                    code=node_in.code,
                    prompt=node_in.prompt,
                    node_type=node_in.node_type,
                    display_order=node_idx,
                    is_start=(sec_idx == 1 and node_idx == 1),
                    is_terminal=False,
                    parent_node_code=node_in.parent_node_code,
                )
                db.add(node)
                db.flush()

                choice_map: dict[str, models.Choice] = {}
                for ch_idx, label in enumerate(node_in.choices, start=1):
                    choice = models.Choice(
                        node_id=node.id,
                        code=label.lower().replace(" ", "_"),
                        label=label,
                        value=label,
                        display_order=ch_idx,
                    )
                    db.add(choice)
                    db.flush()
                    choice_map[label] = choice

                pathway_nodes.append((node, node_in, choice_map))

        for idx, (node, node_in, choice_map) in enumerate(pathway_nodes):
            next_node = pathway_nodes[idx + 1][0] if idx + 1 < len(pathway_nodes) else None
            if next_node is None:
                node.is_terminal = True

            for prio, choice in enumerate(choice_map.values(), start=1):
                transition = models.Transition(
                    pathway_id=pathway.id,
                    from_node_id=node.id,
                    choice_id=choice.id,
                    to_node_id=next_node.id if next_node else None,
                    priority=prio,
                )
                db.add(transition)
                db.flush()

                for rule in node_in.rules:
                    if rule.when_choice != choice.label:
                        continue
                    for action in rule.actions:
                        db.add(
                            models.RuleAction(
                                transition_id=transition.id,
                                action_type=action.type,
                                payload=action.payload,
                            )
                        )

    db.commit()
    return schemas.ActionResultOut(ok=True, message=f"Imported {len(payload.pathways)} pathway(s) as pack")


@app.post("/api/admin/workflows/extract-pdf", response_model=schemas.PdfExtractResultOut)
async def extract_workflow_from_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a CEP PDF and get back an editable survey definition.

    Uses OpenAI when OPENAI_API_KEY is configured; falls back to heuristic
    text parsing otherwise. Nothing is imported — the caller reviews the
    payload and submits it to /api/admin/workflows/import-pack.
    """
    from app.services import pdf_extract

    filename = file.filename or "document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        text, pages = pdf_extract.extract_pdf_text(data)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read this file as a PDF")

    existing_slugs = set(db.scalars(select(models.Pathway.slug)).all())
    existing_codes = set(db.scalars(select(models.Node.code)).all())

    warning: str | None = None
    source = "heuristic"
    raw: dict | None = None

    if settings.openai_api_key:
        try:
            raw = pdf_extract.extract_with_openai(text, filename)
            source = "openai"
        except Exception as exc:  # network/key/parse failure — keep the demo alive
            warning = f"AI extraction unavailable ({type(exc).__name__}); used built-in text parser instead."
    else:
        warning = "OPENAI_API_KEY not configured; used built-in text parser instead."

    if raw is None:
        raw = pdf_extract.extract_heuristic(text, filename)

    pathway = pdf_extract.normalize_pathway(raw, filename, existing_slugs, existing_codes)
    if not pathway["sections"]:
        raise HTTPException(status_code=422, detail="No questions could be extracted from this PDF")

    question_count = sum(len(s["nodes"]) for s in pathway["sections"])
    return schemas.PdfExtractResultOut(
        source=source,
        filename=filename,
        pages=pages,
        section_count=len(pathway["sections"]),
        question_count=question_count,
        warning=warning,
        payload=schemas.AdminWorkflowPayloadIn(pathways=[pathway], reset_runtime=False),
    )


@app.post("/api/demo/reset", response_model=schemas.ActionResultOut)
def reset_demo_data(db: Session = Depends(get_db)):
    """Purge all cases and re-seed with demo data by running demo_seed.py."""
    import subprocess

    # Purge all runtime data
    _clear_runtime_tables(db)
    db.commit()

    # Run the seed script
    seed_script = Path(__file__).resolve().parent.parent / "demo_seed.py"
    if not seed_script.exists():
        raise HTTPException(status_code=500, detail=f"Seed script not found at {seed_script}")

    result = subprocess.run(
        [sys.executable, str(seed_script)],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Seed script failed:\n{result.stderr[:500]}",
        )
    return schemas.ActionResultOut(ok=True, message="Demo data reset: 6 surveys seeded")
