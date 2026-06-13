from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobCreate(BaseModel):
    title: str
    description: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    work_mode: str = "hybrid"
    experience_min: int = 0
    experience_max: int = 10
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    status: str = "active"


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    status: Optional[str] = None


class JobOut(BaseModel):
    id: str
    req_id: str
    title: str
    description: Optional[str]
    department: Optional[str]
    location: Optional[str]
    work_mode: str
    experience_min: int
    experience_max: int
    salary_min: Optional[int]
    salary_max: Optional[int]
    status: str
    created_at: datetime
    shortlist_count: Optional[int] = 0

    class Config:
        from_attributes = True
