from pathlib import Path

from alembic import command
from alembic.config import Config

from source.core.config import settings


def run_migrations() -> None:
    project_root = Path(__file__).resolve().parents[2]
    alembic_cfg = Config(str(project_root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(project_root / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)

    command.upgrade(alembic_cfg, "head")
    print("Database migrations applied successfully.", flush=True)
