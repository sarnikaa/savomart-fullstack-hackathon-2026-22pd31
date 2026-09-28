import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    role = Column(String(30), nullable=False) # bd_manager, bd_executive, survey_manager, survey_executive
    phone = Column(String(20), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
