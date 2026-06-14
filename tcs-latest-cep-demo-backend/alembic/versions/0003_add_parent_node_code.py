"""add parent_node_code to node table

Revision ID: 0003_add_parent_node_code
Revises: 0002_phase1_branching_validation
Create Date: 2026-03-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_add_parent_node_code"
down_revision: Union[str, Sequence[str], None] = "0002_phase1_branching_validation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("node", sa.Column("parent_node_code", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("node", "parent_node_code")
