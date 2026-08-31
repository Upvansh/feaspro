import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserRead"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    org_id: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    organization_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=2)
    role: str = "developer"


class OrganizationRead(BaseModel):
    id: str
    name: str
    slug: str
    model_config = ConfigDict(from_attributes=True)

class UserRead(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    organization_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    organization: Optional[OrganizationRead] = None

    model_config = ConfigDict(from_attributes=True)

Token.model_rebuild()
