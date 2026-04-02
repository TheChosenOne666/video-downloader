"""Authentication API endpoints."""

import re
from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, EmailStr
from app.services.auth_service import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    username: str
    email: str
    expires_in: int  # seconds


class UserInfo(BaseModel):
    id: str
    username: str
    email: str
    created_at: str


def validate_username(username: str) -> str:
    """Validate username format."""
    if len(username) < 3:
        raise ValueError("Username must be at least 3 characters")
    if len(username) > 20:
        raise ValueError("Username must be at most 20 characters")
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise ValueError("Username can only contain letters, numbers, and underscores")
    return username


def validate_password(password: str) -> str:
    """Validate password strength."""
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters")
    if len(password) > 50:
        raise ValueError("Password must be at most 50 characters")
    return password


def get_token_from_cookie(request) -> str | None:
    """Extract token from cookie."""
    if hasattr(request, 'cookies'):
        return request.cookies.get('token')
    return None


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """Register a new user."""
    try:
        username = validate_username(request.username)
        password = validate_password(request.password)
        email = request.email.strip().lower()
        
        if not email or '@' not in email:
            raise ValueError("Invalid email format")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Check if username is taken
    existing = auth_service.get_user_by_username(username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create user
    user = auth_service.create_user(username, email, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
    # Create session
    session = auth_service.create_session(user.id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session"
        )
    
    return AuthResponse(
        token=session.token,
        username=user.username,
        email=user.email,
        expires_in=30 * 24 * 60 * 60  # 30 days in seconds
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, response: Response):
    """Login user."""
    try:
        username = request.username.strip()
        password = request.password
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request"
        )
    
    # Verify credentials
    session = auth_service.login(username, password)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Get user info
    user = auth_service.get_user_by_id(session.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User not found"
        )
    
    return AuthResponse(
        token=session.token,
        username=user.username,
        email=user.email,
        expires_in=30 * 24 * 60 * 60  # 30 days in seconds
    )


@router.post("/logout")
async def logout(response: Response):
    """Logout user."""
    # Clear cookie regardless of token validity
    response.delete_cookie(key="token", path="/")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserInfo)
async def get_current_user(token: str = None):
    """Get current user info."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    user = auth_service.get_current_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return UserInfo(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=user.created_at
    )


@router.post("/check")
async def check_auth(token: str = None):
    """Check if token is valid."""
    if not token:
        return {"authenticated": False}
    
    user = auth_service.get_current_user(token)
    if not user:
        return {"authenticated": False}
    
    return {
        "authenticated": True,
        "username": user.username,
        "email": user.email
    }
