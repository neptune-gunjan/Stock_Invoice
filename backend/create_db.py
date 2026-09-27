from app.db import SQLALCHEMY_DATABASE_URL
from sqlalchemy import create_engine
from sqlalchemy import text

db_url = SQLALCHEMY_DATABASE_URL
# Ensure it uses psycopg2 if not specified
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://")

base_url = db_url.rsplit('/', 1)[0]
db_name = db_url.rsplit('/', 1)[1]

try:
    # Connect to the default 'postgres' database to create the new one
    engine = create_engine(base_url + "/postgres", isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        conn.execute(text(f"CREATE DATABASE {db_name}"))
    print(f"Successfully created database '{db_name}'!")
except Exception as e:
    if "already exists" in str(e).lower():
        print(f"Database '{db_name}' already exists.")
    else:
        print(f"Error creating database: {e}")
