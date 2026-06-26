import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Load app models so Alembic detects them
from app.core.database import Base
from app.core.config import settings
import app.models  # noqa: F401 — registers all models

config = context.config
fileConfig(config.config_file_name)

# Use SYNC_DATABASE_URL (postgresql://) — NOT asyncpg
sync_url = (
    settings.SYNC_DATABASE_URL
    or settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
)
config.set_main_option("sqlalchemy.url", sync_url)

target_metadata = Base.metadata


def run_migrations_offline():
    context.configure(
        url=sync_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()