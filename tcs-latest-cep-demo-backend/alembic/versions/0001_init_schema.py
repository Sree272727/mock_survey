"""init schema

Revision ID: 0001_init_schema
Revises:
Create Date: 2026-02-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_init_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pathway",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False, unique=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "case",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("external_case_id", sa.String(length=100), nullable=False, unique=True),
        sa.Column("resident_id", sa.String(length=100), nullable=False),
        sa.Column("facility_name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "section",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("pathway_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pathway.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
    )

    op.create_table(
        "node",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("section_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("section.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False, unique=True),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("node_type", sa.String(length=30), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("is_start", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_terminal", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    op.create_table(
        "choice",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("node.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(length=60), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("value", sa.String(length=100), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
    )

    op.create_table(
        "transition",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("pathway_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pathway.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("node.id", ondelete="CASCADE"), nullable=False),
        sa.Column("choice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("choice.id", ondelete="SET NULL"), nullable=True),
        sa.Column("to_node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("node.id", ondelete="SET NULL"), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=False),
    )

    op.create_table(
        "rule_action",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("transition_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("transition.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action_type", sa.String(length=50), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    )

    op.create_table(
        "case_pathway",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("case.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pathway_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pathway.id", ondelete="CASCADE"), nullable=False),
        sa.Column("current_node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("node.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "case_answer",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("case.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pathway_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pathway.id", ondelete="CASCADE"), nullable=False),
        sa.Column("node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("node.id", ondelete="CASCADE"), nullable=False),
        sa.Column("choice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("choice.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("evidence_refs", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("answered_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "case_flag",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("case.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pathway_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pathway.id", ondelete="SET NULL"), nullable=True),
        sa.Column("severity", sa.String(length=30), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "case_citation",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("case.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pathway_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pathway.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tag", sa.String(length=50), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "case_event",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("case.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "evidence_item",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("case.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("evidence_item")
    op.drop_table("case_event")
    op.drop_table("case_citation")
    op.drop_table("case_flag")
    op.drop_table("case_answer")
    op.drop_table("case_pathway")
    op.drop_table("rule_action")
    op.drop_table("transition")
    op.drop_table("choice")
    op.drop_table("node")
    op.drop_table("section")
    op.drop_table("case")
    op.drop_table("pathway")
