from app.db import SessionLocal
from sqlalchemy import text
session = SessionLocal()
session.execute(text('TRUNCATE TABLE transactions CASCADE'))
session.commit()
