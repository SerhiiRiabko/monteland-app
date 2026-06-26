"""add session_token and telegram_chat_id to phone_otps

Revision ID: f7a3c8b12e90
Revises: 29ee4c86db58
Create Date: 2026-06-25 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'f7a3c8b12e90'
down_revision = '29ee4c86db58'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'phone_otps',
        sa.Column('session_token', sa.String(length=64), nullable=True),
    )
    op.add_column(
        'phone_otps',
        sa.Column('telegram_chat_id', sa.String(length=30), nullable=True),
    )
    op.create_index(
        op.f('ix_phone_otps_session_token'),
        'phone_otps',
        ['session_token'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_phone_otps_session_token'), table_name='phone_otps')
    op.drop_column('phone_otps', 'telegram_chat_id')
    op.drop_column('phone_otps', 'session_token')
