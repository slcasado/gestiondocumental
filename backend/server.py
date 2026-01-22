from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Header, Request
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import shutil

from models import (
    User, UserCreate, UserUpdate, LoginRequest, ChangePasswordRequest, TokenResponse,
    Team, TeamCreate, TeamUpdate,
    MetadataDefinition, MetadataDefinitionCreate, MetadataDefinitionUpdate,
    Workspace, WorkspaceCreate, WorkspaceUpdate,
    Document, DocumentCreate, DocumentUpdate, UserRole
)
from auth import verify_password, get_password_hash, create_access_token, decode_access_token
from security import (
    SECURITY_HEADERS, RATE_LIMIT_LOGIN, RATE_LIMIT_API,
    sanitize_string, sanitize_metadata, validate_file_path,
    MAX_METADATA_SIZE
)
from audit import (
    log_auth_attempt, log_document_access, log_admin_action, log_security_event
)

from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response

# Auth dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

# Initialize default admin user
async def init_default_admin():
    existing_admin = await db.users.find_one({"email": "admin"})
    if not existing_admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin",
            "password_hash": get_password_hash("admin"),
            "role": "admin",
            "first_login": True,
            "team_ids": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info("Default admin user created")

@app.on_event("startup")
async def startup_event():
    await init_default_admin()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# AUTH ENDPOINTS
@api_router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user_doc or not verify_password(request.password, user_doc["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**user_doc)
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/change-password")
async def change_password(request: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": current_user.id})
    if not user_doc or not verify_password(request.old_password, user_doc["password_hash"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid old password")
    
    new_hash = get_password_hash(request.new_password)
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password_hash": new_hash, "first_login": False}}
    )
    
    return {"message": "Password changed successfully"}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# USER ENDPOINTS (Admin only)
@api_router.get("/users", response_model=List[User])
async def list_users(current_user: User = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_admin_user)):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    
    new_user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "role": user_data.role.value,
        "first_login": True,
        "team_ids": user_data.team_ids,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    new_user.pop('password_hash')
    new_user['created_at'] = datetime.fromisoformat(new_user['created_at'])
    return User(**new_user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate, current_user: User = Depends(get_admin_user)):
    update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if "role" in update_dict:
        update_dict["role"] = update_dict["role"].value
    
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if isinstance(updated_user.get('created_at'), str):
        updated_user['created_at'] = datetime.fromisoformat(updated_user['created_at'])
    return User(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_admin_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return {"message": "User deleted successfully"}

# TEAM ENDPOINTS
@api_router.get("/teams", response_model=List[Team])
async def list_teams(current_user: User = Depends(get_current_user)):
    teams = await db.teams.find({}, {"_id": 0}).to_list(1000)
    for team in teams:
        if isinstance(team.get('created_at'), str):
            team['created_at'] = datetime.fromisoformat(team['created_at'])
    return teams

@api_router.post("/teams", response_model=Team)
async def create_team(team_data: TeamCreate, current_user: User = Depends(get_admin_user)):
    new_team = {
        "id": str(uuid.uuid4()),
        "name": team_data.name,
        "description": team_data.description,
        "user_ids": team_data.user_ids,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.teams.insert_one(new_team)
    
    # Update users to add this team
    if team_data.user_ids:
        await db.users.update_many(
            {"id": {"$in": team_data.user_ids}},
            {"$addToSet": {"team_ids": new_team["id"]}}
        )
    
    new_team['created_at'] = datetime.fromisoformat(new_team['created_at'])
    return Team(**new_team)

@api_router.put("/teams/{team_id}", response_model=Team)
async def update_team(team_id: str, team_data: TeamUpdate, current_user: User = Depends(get_admin_user)):
    existing_team = await db.teams.find_one({"id": team_id})
    if not existing_team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    
    update_dict = {k: v for k, v in team_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    # Handle user_ids update
    if "user_ids" in update_dict:
        old_user_ids = set(existing_team.get("user_ids", []))
        new_user_ids = set(update_dict["user_ids"])
        
        # Remove team from users who are no longer in the team
        removed_users = old_user_ids - new_user_ids
        if removed_users:
            await db.users.update_many(
                {"id": {"$in": list(removed_users)}},
                {"$pull": {"team_ids": team_id}}
            )
        
        # Add team to new users
        added_users = new_user_ids - old_user_ids
        if added_users:
            await db.users.update_many(
                {"id": {"$in": list(added_users)}},
                {"$addToSet": {"team_ids": team_id}}
            )
    
    await db.teams.update_one({"id": team_id}, {"$set": update_dict})
    
    updated_team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if isinstance(updated_team.get('created_at'), str):
        updated_team['created_at'] = datetime.fromisoformat(updated_team['created_at'])
    return Team(**updated_team)

@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, current_user: User = Depends(get_admin_user)):
    result = await db.teams.delete_one({"id": team_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    
    # Remove team from users
    await db.users.update_many({}, {"$pull": {"team_ids": team_id}})
    
    # Remove team from workspaces
    await db.workspaces.update_many({}, {"$pull": {"team_ids": team_id}})
    
    return {"message": "Team deleted successfully"}

# METADATA ENDPOINTS
@api_router.get("/metadata", response_model=List[MetadataDefinition])
async def list_metadata(current_user: User = Depends(get_current_user)):
    metadata = await db.metadata_definitions.find({}, {"_id": 0}).to_list(1000)
    for meta in metadata:
        if isinstance(meta.get('created_at'), str):
            meta['created_at'] = datetime.fromisoformat(meta['created_at'])
    return metadata

@api_router.post("/metadata", response_model=MetadataDefinition)
async def create_metadata(meta_data: MetadataDefinitionCreate, current_user: User = Depends(get_admin_user)):
    new_meta = {
        "id": str(uuid.uuid4()),
        "name": meta_data.name,
        "field_type": meta_data.field_type,
        "visible": meta_data.visible,
        "options": meta_data.options,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.metadata_definitions.insert_one(new_meta)
    new_meta['created_at'] = datetime.fromisoformat(new_meta['created_at'])
    return MetadataDefinition(**new_meta)

@api_router.put("/metadata/{meta_id}", response_model=MetadataDefinition)
async def update_metadata(meta_id: str, meta_data: MetadataDefinitionUpdate, current_user: User = Depends(get_admin_user)):
    update_dict = {k: v for k, v in meta_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    result = await db.metadata_definitions.update_one({"id": meta_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metadata not found")
    
    updated_meta = await db.metadata_definitions.find_one({"id": meta_id}, {"_id": 0})
    if isinstance(updated_meta.get('created_at'), str):
        updated_meta['created_at'] = datetime.fromisoformat(updated_meta['created_at'])
    return MetadataDefinition(**updated_meta)

@api_router.delete("/metadata/{meta_id}")
async def delete_metadata(meta_id: str, current_user: User = Depends(get_admin_user)):
    result = await db.metadata_definitions.delete_one({"id": meta_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metadata not found")
    
    # Remove metadata from workspaces
    await db.workspaces.update_many({}, {"$pull": {"metadata_ids": meta_id}})
    
    return {"message": "Metadata deleted successfully"}

# WORKSPACE ENDPOINTS
@api_router.get("/workspaces", response_model=List[Workspace])
async def list_workspaces(current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.ADMIN:
        workspaces = await db.workspaces.find({}, {"_id": 0}).to_list(1000)
    else:
        # Filter by user's teams
        workspaces = await db.workspaces.find(
            {"team_ids": {"$in": current_user.team_ids}},
            {"_id": 0}
        ).to_list(1000)
    
    for workspace in workspaces:
        if isinstance(workspace.get('created_at'), str):
            workspace['created_at'] = datetime.fromisoformat(workspace['created_at'])
    return workspaces

@api_router.post("/workspaces", response_model=Workspace)
async def create_workspace(workspace_data: WorkspaceCreate, current_user: User = Depends(get_admin_user)):
    new_workspace = {
        "id": str(uuid.uuid4()),
        "name": workspace_data.name,
        "description": workspace_data.description,
        "metadata_ids": workspace_data.metadata_ids,
        "team_ids": workspace_data.team_ids,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.workspaces.insert_one(new_workspace)
    new_workspace['created_at'] = datetime.fromisoformat(new_workspace['created_at'])
    return Workspace(**new_workspace)

@api_router.put("/workspaces/{workspace_id}", response_model=Workspace)
async def update_workspace(workspace_id: str, workspace_data: WorkspaceUpdate, current_user: User = Depends(get_admin_user)):
    update_dict = {k: v for k, v in workspace_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    result = await db.workspaces.update_one({"id": workspace_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    
    updated_workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if isinstance(updated_workspace.get('created_at'), str):
        updated_workspace['created_at'] = datetime.fromisoformat(updated_workspace['created_at'])
    return Workspace(**updated_workspace)

@api_router.delete("/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, current_user: User = Depends(get_admin_user)):
    result = await db.workspaces.delete_one({"id": workspace_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    
    # Delete all documents in this workspace
    await db.documents.delete_many({"workspace_id": workspace_id})
    
    return {"message": "Workspace deleted successfully"}

# DOCUMENT ENDPOINTS
@api_router.get("/workspaces/{workspace_id}/documents", response_model=List[Document])
async def list_documents(workspace_id: str, current_user: User = Depends(get_current_user)):
    # Check access
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    
    if current_user.role != UserRole.ADMIN:
        if not any(team_id in current_user.team_ids for team_id in workspace.get("team_ids", [])):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    documents = await db.documents.find(
        {"workspace_id": workspace_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    for doc in documents:
        if isinstance(doc.get('created_at'), str):
            doc['created_at'] = datetime.fromisoformat(doc['created_at'])
        if isinstance(doc.get('updated_at'), str):
            doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
    
    return documents

@api_router.post("/workspaces/{workspace_id}/documents", response_model=Document)
async def create_document(workspace_id: str, doc_data: DocumentCreate, current_user: User = Depends(get_current_user)):
    # Check workspace exists
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    
    public_url = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    new_doc = {
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "file_path": doc_data.file_path,
        "file_name": doc_data.file_name,
        "public_url": public_url,
        "metadata": doc_data.metadata,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.documents.insert_one(new_doc)
    new_doc['created_at'] = now
    new_doc['updated_at'] = now
    return Document(**new_doc)

@api_router.put("/documents/{doc_id}", response_model=Document)
async def update_document(doc_id: str, doc_data: DocumentUpdate, current_user: User = Depends(get_current_user)):
    update_dict = {k: v for k, v in doc_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.documents.update_one({"id": doc_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    updated_doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if isinstance(updated_doc.get('created_at'), str):
        updated_doc['created_at'] = datetime.fromisoformat(updated_doc['created_at'])
    if isinstance(updated_doc.get('updated_at'), str):
        updated_doc['updated_at'] = datetime.fromisoformat(updated_doc['updated_at'])
    return Document(**updated_doc)

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: User = Depends(get_current_user)):
    result = await db.documents.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    return {"message": "Document deleted successfully"}

@api_router.get("/documents/search", response_model=List[Document])
async def search_documents(q: str, current_user: User = Depends(get_current_user)):
    # Get accessible workspaces
    if current_user.role == UserRole.ADMIN:
        workspaces = await db.workspaces.find({}, {"_id": 0, "id": 1}).to_list(1000)
    else:
        workspaces = await db.workspaces.find(
            {"team_ids": {"$in": current_user.team_ids}},
            {"_id": 0, "id": 1}
        ).to_list(1000)
    
    workspace_ids = [ws["id"] for ws in workspaces]
    
    # Search in file_name and metadata
    documents = await db.documents.find(
        {
            "workspace_id": {"$in": workspace_ids},
            "$or": [
                {"file_name": {"$regex": q, "$options": "i"}},
                {"file_path": {"$regex": q, "$options": "i"}},
                {"metadata": {"$regex": q, "$options": "i"}}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for doc in documents:
        if isinstance(doc.get('created_at'), str):
            doc['created_at'] = datetime.fromisoformat(doc['created_at'])
        if isinstance(doc.get('updated_at'), str):
            doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
    
    return documents

@api_router.get("/documents/{doc_id}/view")
async def view_document(doc_id: str, current_user: User = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    file_path_str = doc["file_path"]
    
    # Check if it's an external URL
    if file_path_str.startswith(('http://', 'https://')):
        # Return a redirect response for external URLs
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=file_path_str)
    
    # Local file handling
    file_path = Path(file_path_str)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    return FileResponse(file_path, media_type="application/pdf", filename=doc["file_name"])

@api_router.get("/public/documents/{public_url}")
async def view_public_document(public_url: str):
    doc = await db.documents.find_one({"public_url": public_url}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    file_path_str = doc["file_path"]
    
    # Check if it's an external URL
    if file_path_str.startswith(('http://', 'https://')):
        # Return a redirect response for external URLs
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=file_path_str)
    
    # Local file handling
    file_path = Path(file_path_str)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    return FileResponse(file_path, media_type="application/pdf", filename=doc["file_name"])

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
