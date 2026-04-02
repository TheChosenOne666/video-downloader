"""Authentication API endpoints with security features."""

from fastapi import APIRouter, HTTPException, Response, Request, status
from pydantic import BaseModel, EmailStr
from app.services.auth_service import auth_service, Permission

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
    role: str
    expires_in: int


class UserInfo(BaseModel):
    id: str
    username: str
    email: str
    role: str
    created_at: str


def get_client_ip(request: Request) -> str:
    """Get client IP address."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_token_from_request(request: Request) -> str | None:
    """Extract token from query param or header."""
    # Try query parameter first
    token = request.query_params.get("token")
    if token:
        return token
    # Try Authorization header
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        return auth[7:]
    return None


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: Request, req: RegisterRequest):
    """Register a new user."""
    # Create user with validation
    user, error = auth_service.create_user(
        username=req.username.strip(),
        email=req.email.strip(),
        password=req.password
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Create session
    session = auth_service.create_session(user.id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建会话失败"
        )
    
    return AuthResponse(
        token=session.token,
        username=user.username,
        email=user.email,
        role=user.role,
        expires_in=30 * 24 * 60 * 60
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: Request, req: LoginRequest):
    """Login user with rate limiting."""
    client_ip = get_client_ip(request)
    
    session, error = auth_service.login(
        username=req.username.strip(),
        password=req.password,
        ip=client_ip
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error
        )
    
    # Get user info
    user = auth_service.get_user_by_id(session.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="用户不存在"
        )
    
    return AuthResponse(
        token=session.token,
        username=user.username,
        email=user.email,
        role=user.role,
        expires_in=30 * 24 * 60 * 60
    )


@router.post("/logout")
async def logout(response: Response):
    """Logout user."""
    response.delete_cookie(key="token", path="/")
    return {"message": "已退出登录"}


@router.get("/me", response_model=UserInfo)
async def get_current_user(request: Request):
    """Get current user info. Requires valid token."""
    token = get_token_from_request(request)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录"
        )
    
    user = auth_service.get_current_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已过期，请重新登录"
        )
    
    return UserInfo(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        created_at=user.created_at
    )


@router.post("/check")
async def check_auth(request: Request):
    """Check if token is valid."""
    token = get_token_from_request(request)
    
    if not token:
        return {"authenticated": False}
    
    user = auth_service.get_current_user(token)
    if not user:
        return {"authenticated": False}
    
    return {
        "authenticated": True,
        "username": user.username,
        "email": user.email,
        "role": user.role
    }


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    """Refresh session token (extend expiry)."""
    token = get_token_from_request(request)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录"
        )
    
    user = auth_service.get_current_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已过期"
        )
    
    # Delete old session
    auth_service.delete_session(token)
    
    # Create new session
    new_session = auth_service.create_session(user.id)
    
    return AuthResponse(
        token=new_session.token,
        username=user.username,
        email=user.email,
        role=user.role,
        expires_in=30 * 24 * 60 * 60
    )


# ========== Permission-based Route Protection ==========

def require_permission(permission: Permission):
    """Dependency for routes that require specific permission."""
    def check_permission(request: Request):
        token = get_token_from_request(request)
        
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="请先登录"
            )
        
        has_perm, error = auth_service.verify_permission(token, permission)
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error
            )
        
        return token
    
    return check_permission


# Example of protected route:
# @router.post("/admin-only")
# async def admin_route(token: str = Depends(require_permission(Permission.ADMIN))):
#     """Admin-only endpoint."""
#     return {"message": "Admin access granted"}
