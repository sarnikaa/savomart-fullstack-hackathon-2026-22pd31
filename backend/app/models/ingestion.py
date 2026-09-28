import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime
from backend.app.database import Base

class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source = Column(String(50), nullable=False) # osm, ogd_pincodes, savomart_stores, mock_benchmarks
    version = Column(String(20), nullable=False)
    records_count = Column(Integer, default=0)
    status = Column(String(20), default="success")
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
