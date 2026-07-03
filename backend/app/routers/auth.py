from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, TokenUser
from app.services.auth_service import create_access_token, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])


async def _authenticate_and_issue_token(
    email: str, password: str, db: AsyncSession
) -> LoginResponse:
    """Shared logic: look up user, verify password, issue JWT."""
    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )

    user.last_active_at = datetime.now(timezone.utc)
    await db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return LoginResponse(
        token=token,
        user=TokenUser(email=user.email, name=user.name, role=user.role),
    )


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate via JSON body. Used by the React frontend.

    Body: { "email": "...", "password": "..." }
    """
    return await _authenticate_and_issue_token(payload.email, payload.password, db)


@router.post("/token", response_model=LoginResponse, include_in_schema=False)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Authenticate via form data. Used internally by Swagger UI's Authorize button.

    OAuth2PasswordRequestForm gives us `form_data.username` and `form_data.password`.
    We treat `username` as the email.
    """
    return await _authenticate_and_issue_token(form_data.username, form_data.password, db)