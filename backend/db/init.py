from pathlib import Path

from .database import db_cursor, ensure_runtime_dirs


def initialize_database() -> None:
    ensure_runtime_dirs()
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    schema_sql = schema_path.read_text(encoding="utf-8")
    with db_cursor() as conn:
        conn.executescript(schema_sql)


if __name__ == "__main__":
    initialize_database()
    print("Database initialized.")
