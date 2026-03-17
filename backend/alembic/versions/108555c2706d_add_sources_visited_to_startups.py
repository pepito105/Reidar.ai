"""add sources_visited to startups
Revision ID: 108555c2706d
Revises: 89995af3b6ee
Create Date: 2026-03-16 23:40:51.232423
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '108555c2706d'
down_revision: Union[str, None] = '89995af3b6ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('startups', sa.Column('sources_visited', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

def downgrade() -> None:
    op.drop_column('startups', 'sources_visited')
