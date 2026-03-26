from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.robot import RobotStatus


class RobotBase(BaseModel):
    name: str
    model: str
    serial_number: str
    status: RobotStatus = RobotStatus.OFFLINE
    location: Optional[str] = None
    battery_level: Optional[float] = 100.0
    ip_address: Optional[str] = None
    firmware_version: Optional[str] = None


class RobotCreate(RobotBase):
    pass


class RobotUpdate(BaseModel):
    name: Optional[str] = None
    model: Optional[str] = None
    status: Optional[RobotStatus] = None
    location: Optional[str] = None
    battery_level: Optional[float] = None
    ip_address: Optional[str] = None
    firmware_version: Optional[str] = None


class RobotOut(RobotBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
