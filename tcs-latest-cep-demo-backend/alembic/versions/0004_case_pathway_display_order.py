"""add display_order to case_pathway (preserve survey pathway sequence)

Revision ID: 0004_case_pathway_display_order
Revises: 0003_add_parent_node_code
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_case_pathway_display_order"
down_revision: Union[str, Sequence[str], None] = "0003_add_parent_node_code"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "case_pathway",
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("case_pathway", "display_order")
