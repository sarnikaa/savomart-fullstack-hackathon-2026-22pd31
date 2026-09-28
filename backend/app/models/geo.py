import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime
from backend.app.database import Base

class Pincode(Base):
    __tablename__ = "pincodes"

    pincode = Column(String(10), primary_key=True)
    locality_name = Column(String(100), nullable=False, index=True)
    district = Column(String(50), default="Chennai")
    state = Column(String(50), default="Tamil Nadu")
    centroid_lat = Column(Float, nullable=False)
    centroid_lon = Column(Float, nullable=False)
    polygon_geojson = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class H3Cell(Base):
    __tablename__ = "h3_cells"

    h3_index = Column(String(20), primary_key=True)
    resolution = Column(Integer, default=9)
    centroid_lat = Column(Float, nullable=False)
    centroid_lon = Column(Float, nullable=False)
    pincode = Column(String(10), index=True, nullable=True)
    residential_count = Column(Integer, default=0)
    commercial_count = Column(Integer, default=0)
    transit_count = Column(Integer, default=0)
    competitor_count = Column(Integer, default=0)
    score_percentiles_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class OsmFeature(Base):
    __tablename__ = "osm_features"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    osm_id = Column(String(50), nullable=True)
    feature_type = Column(String(50), nullable=False, index=True) # supermarket, kirana, metro_station, bus_stop, mall, bank, etc.
    name = Column(String(150), nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    h3_index = Column(String(20), index=True, nullable=True)
    tags_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class OsmLane(Base):
    __tablename__ = "osm_lanes"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=True)
    highway_type = Column(String(50), nullable=True)
    width_meters = Column(Float, nullable=True)
    length_meters = Column(Float, nullable=True)
    h3_index = Column(String(20), index=True, nullable=True)
    midpoint_lat = Column(Float, nullable=False)
    midpoint_lon = Column(Float, nullable=False)
    geometry_geojson = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SavomartStore(Base):
    __tablename__ = "savomart_stores"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    store_code = Column(String(30), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    address = Column(Text, nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    is_operational = Column(Boolean, default=True)
    opened_at = Column(String(30), nullable=True)
    source = Column(String(30), default="live_api") # live_api or sample_fallback
    created_at = Column(DateTime, default=datetime.utcnow)
