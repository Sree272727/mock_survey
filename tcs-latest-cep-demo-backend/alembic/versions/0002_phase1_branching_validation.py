"""phase1 branching and validation issues

Revision ID: 0002_phase1_branching_validation
Revises: 0001_init_schema
Create Date: 2026-02-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002_phase1_branching_validation"
down_revision: Union[str, Sequence[str], None] = "0001_init_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("transition", sa.Column("condition_type", sa.String(length=30), nullable=False, server_default="choice_match"))
    op.add_column("transition", sa.Column("condition_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))

    op.create_table(
        "case_validation_issue",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("case.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pathway_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pathway.id", ondelete="CASCADE"), nullable=False),
        sa.Column("node_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("node.id", ondelete="SET NULL"), nullable=True),
        sa.Column("code", sa.String(length=120), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(length=30), nullable=False, server_default="warn"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_case_validation_issue_case_status", "case_validation_issue", ["case_id", "status"])
    op.create_index("ix_case_validation_issue_pathway_status", "case_validation_issue", ["pathway_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_case_validation_issue_pathway_status", table_name="case_validation_issue")
    op.drop_index("ix_case_validation_issue_case_status", table_name="case_validation_issue")
    op.drop_table("case_validation_issue")
    op.drop_column("transition", "condition_payload")
    op.drop_column("transition", "condition_type")

