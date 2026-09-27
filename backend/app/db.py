from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

import os

# Default to Postgres since we are doing the PostgreSQL migration!
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg2://postgres:first@localhost:5432/stockapp")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    # connect_args={"check_same_thread": False} # needed only for sqlite
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

