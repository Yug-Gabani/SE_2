import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

logger = logging.getLogger("database")

def get_engine():
    try:
        eng = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            connect_args={"connect_timeout": 3} if "postgres" in settings.DATABASE_URL else {}
        )
        with eng.connect() as conn:
            pass
        return eng
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL on port 5433 ({e}). Using local fallback SQLite database.")
        return create_engine(
            "sqlite:///./telemeet.db",
            connect_args={"check_same_thread": False}
        )

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

