from sqlalchemy import Column, Integer, String, Float, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class RobotStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"
    MAINTENANCE = "maintenance"


class Robot(Base):
    __tablename__ = "robots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    serial_number = Column(String(100), unique=True, nullable=False)
    status = Column(Enum(RobotStatus), default=RobotStatus.OFFLINE)
    location = Column(String(200))
    battery_level = Column(Float, default=100.0)
    ip_address = Column(String(50))
    firmware_version = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tasks = relationship("Task", back_populates="robot")
