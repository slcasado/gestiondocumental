from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    role: UserRole
    first_login: bool
    team_ids: List[str] = []
    created_at: datetime

class UserCreate(BaseModel):
    email: str
    password: str
    role: UserRole
    team_ids: List[str] = []

class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None
    team_ids: Optional[List[str]] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class Team(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    user_ids: List[str] = []
    created_at: datetime

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    user_ids: List[str] = []

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    user_ids: Optional[List[str]] = None

class MetadataDefinition(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    field_type: str  # text, number, date, select
    visible: bool = True
    options: Optional[List[str]] = None  # For select type
    created_at: datetime

class MetadataDefinitionCreate(BaseModel):
    name: str
    field_type: str
    visible: bool = True
    options: Optional[List[str]] = None

class MetadataDefinitionUpdate(BaseModel):
    name: Optional[str] = None
    field_type: Optional[str] = None
    visible: Optional[bool] = None
    options: Optional[List[str]] = None

class Workspace(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    metadata_ids: List[str] = []
    team_ids: List[str] = []
    created_at: datetime

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    metadata_ids: List[str] = []
    team_ids: List[str] = []

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    metadata_ids: Optional[List[str]] = None
    team_ids: Optional[List[str]] = None

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    workspace_id: str
    file_path: str
    file_name: str
    public_url: str
    metadata: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

class DocumentCreate(BaseModel):
    file_path: str
    file_name: str
    metadata: Dict[str, Any] = {}

class DocumentUpdate(BaseModel):
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User