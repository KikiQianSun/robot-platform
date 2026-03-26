from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.task import TaskStatus


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    robot_id: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    robot_id: Optional[int] = None
    result: Optional[str] = None


class TaskOut(TaskBase):
    id: int
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[str] = None

    class Config:
        from_attributes = True
