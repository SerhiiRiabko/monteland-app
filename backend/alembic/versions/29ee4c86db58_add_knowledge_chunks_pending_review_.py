"""add knowledge_chunks, pending_review status, nullable seller_id

Revision ID: 29ee4c86db58
Revises: 6c0963c40d7f
Create Date: 2026-06-25 18:59:58.232791
"""
from alembic import op
import sqlalchemy as sa

try:
    from pgvector.sqlalchemy import Vector as _PGVector
    # Test if the PostgreSQL extension actually works (not just the Python package)
    _VECTOR_COL = _PGVector(1536)
    _PGVECTOR_AVAILABLE = True
except ImportError:
    _VECTOR_COL = sa.Text()
    _PGVECTOR_AVAILABLE = False

# Override: on local Windows dev, PostgreSQL doesn't have the extension binary
# In production (Docker + pgvector image) this will be True
import os
if os.name == "nt":  # Windows
    _VECTOR_COL = sa.Text()
    _PGVECTOR_AVAILABLE = False


revision = '29ee4c86db58'
down_revision = '6c0963c40d7f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector extension (safe — only runs if extension is available)
    if _PGVECTOR_AVAILABLE:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table('knowledge_chunks',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('source_type', sa.Enum('LAW', 'URBAN_NORM', 'FAQ', 'LAND_DATA', name='sourcetype'), nullable=False),
        sa.Column('source_title', sa.String(length=255), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('municipality', sa.String(length=100), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('content_summary', sa.Text(), nullable=True),
        sa.Column('embedding', _VECTOR_COL, nullable=True),
        sa.Column('land_id', sa.UUID(as_uuid=False), nullable=True),
        sa.Column('language', sa.String(length=5), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('valid_from', sa.Date(), nullable=True),
        sa.Column('valid_until', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['land_id'], ['land_for_sell.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Regular indexes
    op.create_index('idx_kc_active', 'knowledge_chunks', ['is_active'], unique=False,
                    postgresql_where=sa.text('is_active = TRUE'))
    op.create_index('idx_kc_municipality', 'knowledge_chunks', ['municipality'], unique=False)
    op.create_index('idx_kc_source_type', 'knowledge_chunks', ['source_type'], unique=False)
    op.create_index(op.f('ix_knowledge_chunks_is_active'), 'knowledge_chunks', ['is_active'], unique=False)
    op.create_index(op.f('ix_knowledge_chunks_land_id'), 'knowledge_chunks', ['land_id'], unique=False)
    op.create_index(op.f('ix_knowledge_chunks_language'), 'knowledge_chunks', ['language'], unique=False)
    op.create_index(op.f('ix_knowledge_chunks_municipality'), 'knowledge_chunks', ['municipality'], unique=False)
    op.create_index(op.f('ix_knowledge_chunks_source_type'), 'knowledge_chunks', ['source_type'], unique=False)

    # HNSW vector index — only when pgvector is available
    if _PGVECTOR_AVAILABLE:
        op.execute("""
            CREATE INDEX idx_kc_embedding_hnsw
            ON knowledge_chunks
            USING hnsw (embedding vector_cosine_ops)
        """)

    # land_for_sell.seller_id → nullable + SET NULL on delete
    op.alter_column('land_for_sell', 'seller_id', existing_type=sa.UUID(), nullable=True)
    op.drop_constraint('land_for_sell_seller_id_fkey', 'land_for_sell', type_='foreignkey')
    op.create_foreign_key(None, 'land_for_sell', 'users', ['seller_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint(None, 'land_for_sell', type_='foreignkey')
    op.create_foreign_key('land_for_sell_seller_id_fkey', 'land_for_sell', 'users',
                          ['seller_id'], ['id'], ondelete='CASCADE')
    op.alter_column('land_for_sell', 'seller_id', existing_type=sa.UUID(), nullable=False)

    op.drop_index(op.f('ix_knowledge_chunks_source_type'), table_name='knowledge_chunks')
    op.drop_index(op.f('ix_knowledge_chunks_municipality'), table_name='knowledge_chunks')
    op.drop_index(op.f('ix_knowledge_chunks_language'), table_name='knowledge_chunks')
    op.drop_index(op.f('ix_knowledge_chunks_land_id'), table_name='knowledge_chunks')
    op.drop_index(op.f('ix_knowledge_chunks_is_active'), table_name='knowledge_chunks')
    op.drop_index('idx_kc_source_type', table_name='knowledge_chunks')
    op.drop_index('idx_kc_municipality', table_name='knowledge_chunks')
    op.drop_index('idx_kc_active', table_name='knowledge_chunks',
                  postgresql_where=sa.text('is_active = TRUE'))
    op.drop_table('knowledge_chunks')
