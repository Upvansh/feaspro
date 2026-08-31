import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectRead,
    ProjectListResponse,
    ProjectListItem,
    DevelopmentType,
    ProjectStatus,
)

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new development project within the user's organization.
    Automatically creates the initial baseline scenario.
    """
    project = Project(
        organization_id=current_user.organization_id,
        created_by_id=current_user.id,
        name=project_in.name.strip(),
        description=project_in.description.strip() if project_in.description else None,
        location=project_in.location.strip() if project_in.location else None,
        development_type=project_in.development_type.value,
        status=project_in.status.value,
        start_date=project_in.start_date,
        target_completion_date=project_in.target_completion_date,
        is_archived=False
    )
    db.add(project)
    db.flush()  # Generate project ID

    # Create initial baseline scenario
    initial_scenario_name = project_in.initial_scenario_name or "Baseline Feasibility"
    baseline_scenario = Scenario(
        project_id=project.id,
        name=initial_scenario_name,
        description="Initial baseline feasibility scenario",
        is_baseline=True,
        status="active"
    )
    db.add(baseline_scenario)
    db.commit()
    db.refresh(project)
    return project

@router.get("", response_model=ProjectListResponse)
def list_projects(
    search: Optional[str] = Query(None, description="Search by name or location"),
    development_type: Optional[DevelopmentType] = Query(None, description="Filter by development type"),
    status: Optional[ProjectStatus] = Query(None, description="Filter by status"),
    include_archived: bool = Query(False, description="Include archived projects"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all projects belonging to the current user's organization.
    Supports filtering, searching, and soft-delete/archival toggles.
    """
    query = db.query(Project).filter(Project.organization_id == current_user.organization_id)

    if not include_archived:
        query = query.filter(Project.is_archived == False)
    
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Project.name.ilike(search_term),
                Project.location.ilike(search_term),
                Project.description.ilike(search_term)
            )
        )

    if development_type:
        query = query.filter(Project.development_type == development_type.value)

    if status:
        query = query.filter(Project.status == status.value)

    total = query.count()
    projects = query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()

    items: List[ProjectListItem] = []
    for proj in projects:
        items.append(ProjectListItem(
            id=proj.id,
            organization_id=proj.organization_id,
            name=proj.name,
            description=proj.description,
            location=proj.location,
            development_type=DevelopmentType(proj.development_type),
            status=ProjectStatus(proj.status),
            start_date=proj.start_date,
            target_completion_date=proj.target_completion_date,
            is_archived=proj.is_archived,
            archived_at=proj.archived_at,
            scenario_count=len(proj.scenarios),
            created_at=proj.created_at,
            updated_at=proj.updated_at
        ))

    return ProjectListResponse(items=items, total=total)

@router.get("/{project_id}", response_model=ProjectRead)
def get_project_by_id(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve project details along with its scenarios.
    Enforces organization-level tenant authorization.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found in your organization."
        )

    return project

@router.patch("/{project_id}", response_model=ProjectRead)
@router.put("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update project attributes with validation.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found."
        )

    update_data = project_update.model_dump(exclude_unset=True)
    if "development_type" in update_data and update_data["development_type"] is not None:
        update_data["development_type"] = update_data["development_type"].value
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value

    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(project, field, value)

    project.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}", response_model=ProjectRead)
def archive_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Soft-delete/Archive project as required for data preservation.
    Does not permanently purge records.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found."
        )

    project.is_archived = True
    project.archived_at = datetime.datetime.now(datetime.timezone.utc)
    project.status = ProjectStatus.ARCHIVED.value
    project.updated_at = datetime.datetime.now(datetime.timezone.utc)

    db.commit()
    db.refresh(project)
    return project

@router.post("/{project_id}/restore", response_model=ProjectRead)
def restore_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Restore an archived project back to active status.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found."
        )

    project.is_archived = False
    project.archived_at = None
    project.status = ProjectStatus.ACTIVE.value
    project.updated_at = datetime.datetime.now(datetime.timezone.utc)

    db.commit()
    db.refresh(project)
    return project
