import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from backend.app.models.organization import Organization
from backend.app.models.user import User
from backend.app.schemas.auth import Token, UserRead, LoginRequest, RegisterRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

def _generate_org_slug(name: str, db: Session) -> str:
    base_slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not base_slug:
        base_slug = "org"
    slug = base_slug
    existing = db.query(Organization).filter(Organization.slug == slug).first()
    if existing:
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
    return slug

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user_and_organization(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Validate password confirmation if provided
    if payload.confirm_password is not None and payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirmation do not match",
        )

    # Check for duplicate email
    email = str(payload.email).lower().strip()
    existing_user = db.query(User).filter(func.lower(User.email) == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    # Create new Organization
    org_name = payload.organization_name.strip()
    if not org_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Organization name cannot be empty",
        )

    org_slug = _generate_org_slug(org_name, db)
    organization = Organization(
        name=org_name,
        slug=org_slug,
        is_active=True,
    )
    db.add(organization)
    db.flush()

    # Create Admin User
    hashed_pwd = get_password_hash(payload.password)
    user = User(
        email=email,
        hashed_password=hashed_pwd,
        full_name=payload.full_name.strip(),
        role="admin",
        organization_id=organization.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        data={"sub": user.id, "org_id": user.organization_id, "role": user.role}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email_clean = form_data.username.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    
    access_token = create_access_token(
        data={"sub": user.id, "org_id": user.organization_id, "role": user.role}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login/json", response_model=Token)
def login_json(payload: LoginRequest, db: Session = Depends(get_db)):
    email_clean = str(payload.email).strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    
    access_token = create_access_token(
        data={"sub": user.id, "org_id": user.organization_id, "role": user.role}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
