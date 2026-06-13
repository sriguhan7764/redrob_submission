from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "recruiter"
    department: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    department: Optional[str]
    avatar_initials: Optional[str]
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class ShortlistCreate(BaseModel):
    job_id: str
    candidate_id: str


class ShortlistUpdate(BaseModel):
    stage: str


class ShortlistOut(BaseModel):
    id: str
    job_id: str
    candidate_id: str
    stage: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
