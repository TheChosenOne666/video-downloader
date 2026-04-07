"""User authentication service with permissions."""

import uuid
import hashlib
import re
import time
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field
from enum import Enum

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "video_downloader.db"

# Rate limiting: max attempts per window
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 5  # max attempts per window


class Permission(Enum):
    """User permissions."""
    USER = "user"           # Basic user
    VIP = "vip"            # VIP user with higher limits
    ADMIN = "admin"        # Admin user


@dataclass
class User:
    """User record."""
    id: str
    username: str
    email: str
    password_hash: str
    role: str
    created_at: str
    last_login: Optional[str]


@dataclass
class Session:
    """Session record."""
    id: str
    user_id: str
    token: str
    expires_at: str
    created_at: str


@dataclass
class LoginAttempt:
    """Rate limit tracking."""
    identifier: str  # username or IP
    attempts: int
    window_start: float
    locked_until: float = 0


class RateLimiter:
    """Simple in-memory rate limiter."""
    _attempts: dict[str, LoginAttempt] = {}
    
    @classmethod
    def check(cls, identifier: str) -> tuple[bool, int]:
        """Check if login is allowed.
        Returns (is_allowed, remaining_attempts)
        """
        now = time.time()
        attempt = cls._attempts.get(identifier)
        
        # Clean up expired entry
        if attempt and now > attempt.window_start + RATE_LIMIT_WINDOW:
            del cls._attempts[identifier]
            attempt = None
        
        if not attempt:
            cls._attempts[identifier] = LoginAttempt(
                identifier=identifier,
                attempts=0,
                window_start=now
            )
            return True, RATE_LIMIT_MAX
        
        # Check if locked
        if now < attempt.locked_until:
            return False, 0
        
        remaining = RATE_LIMIT_MAX - attempt.attempts
        return remaining > 0, max(0, remaining)
    
    @classmethod
    def record_failure(cls, identifier: str):
        """Record a failed login attempt."""
        now = time.time()
        attempt = cls._attempts.get(identifier)
        
        if not attempt or now > attempt.window_start + RATE_LIMIT_WINDOW:
            attempt = LoginAttempt(
                identifier=identifier,
                attempts=1,
                window_start=now,
                locked_until=0
            )
        else:
            attempt.attempts += 1
            # Lock after max failures
            if attempt.attempts >= RATE_LIMIT_MAX:
                attempt.locked_until = now + 300  # 5 min lockout
        
        cls._attempts[identifier] = attempt
    
    @classmethod
    def record_success(cls, identifier: str):
        """Clear attempts on successful login."""
        if identifier in cls._attempts:
            del cls._attempts[identifier]


class AuthService:
    """Authentication service with permissions."""
    
    # Session expiry: 30 days
    SESSION_EXPIRY_DAYS = 30
    
    # Password salt (in production, use env variable)
    _salt = "video_downloader_salt_2024"
    
    @classmethod
    def _hash_password(cls, password: str) -> str:
        """Hash password with salt using SHA256."""
        return hashlib.sha256(f"{cls._salt}{password}".encode()).hexdigest()
    
    @classmethod
    def _generate_token(cls) -> str:
        """Generate a cryptographically secure token."""
        return str(uuid.uuid4()) + "-" + str(uuid.uuid4()) + "-" + str(uuid.uuid4())
    
    @classmethod
    def validate_username(cls, username: str) -> tuple[bool, str]:
        """Validate username format and content."""
        if not username:
            return False, "用户名不能为空"
        if len(username) < 3:
            return False, "用户名至少需要3个字符"
        if len(username) > 20:
            return False, "用户名最多20个字符"
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return False, "用户名只能包含字母、数字和下划线"
        return True, ""
    
    @classmethod
    def validate_email(cls, email: str) -> tuple[bool, str]:
        """Validate email format."""
        if not email:
            return False, "邮箱不能为空"
        email = email.strip().lower()
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            return False, "邮箱格式不正确"
        return True, ""
    
    @classmethod
    def validate_password(cls, password: str) -> tuple[bool, str]:
        """Validate password strength."""
        if not password:
            return False, "密码不能为空"
        if len(password) < 6:
            return False, "密码至少需要6个字符"
        if len(password) > 128:
            return False, "密码过长"
        return True, ""
    
    # ========== User Operations ==========
    
    def create_user(self, username: str, email: str, password: str, role: str = Permission.USER.value) -> tuple[Optional[User], str]:
        """Create a new user. Returns (user, error)."""
        # Validate inputs
        valid, error = self.validate_username(username)
        if not valid:
            return None, error
        
        valid, error = self.validate_email(email)
        if not valid:
            return None, error
        
        valid, error = self.validate_password(password)
        if not valid:
            return None, error
        
        # Sanitize
        email = email.strip().lower()
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            
            # Check if username exists
            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            if cursor.fetchone():
                return None, "用户名已被注册"
            
            # Check if email exists
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            if cursor.fetchone():
                return None, "邮箱已被注册"
            
            # Create user
            user_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            password_hash = self._hash_password(password)
            
            cursor.execute("""
                INSERT INTO users (id, username, email, password_hash, role, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, username, email, password_hash, role, now))
            conn.commit()
            
            return User(
                id=user_id, username=username, email=email,
                password_hash=password_hash, role=role,
                created_at=now, last_login=None
            ), ""
        finally:
            conn.close()
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return User(
                id=row["id"], username=row["username"], email=row["email"],
                password_hash=row["password_hash"], role=row["role"],
                created_at=row["created_at"], last_login=row["last_login"]
            )
        finally:
            conn.close()
    
    def get_user_by_token(self, token: str) -> Optional[User]:
        """Get user by session token."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            # Join with users table to get user info
            cursor.execute("""
                SELECT u.* FROM users u
                INNER JOIN sessions s ON u.id = s.user_id
                WHERE s.token = ? AND s.expires_at > datetime('now')
            """, (token,))
            row = cursor.fetchone()
            if not row:
                return None
            return User(
                id=row["id"], username=row["username"], email=row["email"],
                password_hash=row["password_hash"], role=row["role"],
                created_at=row["created_at"], last_login=row["last_login"]
            )
        finally:
            conn.close()
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()
            if not row:
                return None
            return User(
                id=row["id"], username=row["username"], email=row["email"],
                password_hash=row["password_hash"], role=row["role"],
                created_at=row["created_at"], last_login=row["last_login"]
            )
        finally:
            conn.close()
    
    def update_last_login(self, user_id: str) -> None:
        """Update user's last login time."""
        now = datetime.now(timezone.utc).isoformat()
        conn = sqlite3.connect(DB_PATH)
        try:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user_id))
            conn.commit()
        finally:
            conn.close()
    
    # ========== Session Operations ==========
    
    def create_session(self, user_id: str) -> Optional[Session]:
        """Create a new session for user (30 days expiry)."""
        session_id = str(uuid.uuid4())
        token = self._generate_token()
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=self.SESSION_EXPIRY_DAYS)
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sessions (id, user_id, token, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (session_id, user_id, token, expires_at.isoformat(), now.isoformat()))
            conn.commit()
            
            return Session(
                id=session_id, user_id=user_id, token=token,
                expires_at=expires_at.isoformat(), created_at=now.isoformat()
            )
        finally:
            conn.close()
    
    def get_session_by_token(self, token: str) -> Optional[Session]:
        """Get session by token (if not expired)."""
        now = datetime.now(timezone.utc).isoformat()
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM sessions WHERE token = ? AND expires_at > ?
            """, (token, now))
            row = cursor.fetchone()
            if not row:
                return None
            return Session(
                id=row["id"], user_id=row["user_id"], token=row["token"],
                expires_at=row["expires_at"], created_at=row["created_at"]
            )
        finally:
            conn.close()
    
    def delete_session(self, token: str) -> bool:
        """Delete session by token."""
        conn = sqlite3.connect(DB_PATH)
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
            deleted = cursor.rowcount > 0
            conn.commit()
            return deleted
        finally:
            conn.close()
    
    def delete_all_user_sessions(self, user_id: str) -> int:
        """Delete all sessions for a user."""
        conn = sqlite3.connect(DB_PATH)
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
            deleted = cursor.rowcount
            conn.commit()
            return deleted
        finally:
            conn.close()
    
    def cleanup_expired_sessions(self) -> int:
        """Delete expired sessions."""
        now = datetime.now(timezone.utc).isoformat()
        conn = sqlite3.connect(DB_PATH)
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE expires_at < ?", (now,))
            deleted = cursor.rowcount
            conn.commit()
            return deleted
        finally:
            conn.close()
    
    # ========== Permission Checks ==========
    
    def has_permission(self, user: User, required_permission: Permission) -> bool:
        """Check if user has the required permission level."""
        permission_levels = {
            Permission.USER: 1,
            Permission.VIP: 2,
            Permission.ADMIN: 3,
        }
        
        user_level = permission_levels.get(Permission(user.role), 0)
        required_level = permission_levels.get(required_permission, 0)
        
        return user_level >= required_level
    
    def is_admin(self, user: User) -> bool:
        """Check if user is admin."""
        return user.role == Permission.ADMIN.value
    
    # ========== Authentication ==========
    
    def login(self, username: str, password: str, ip: str = "unknown") -> tuple[Optional[Session], str]:
        """Login user and create session. Returns (session, error)."""
        # Rate limit check
        allowed, remaining = RateLimiter.check(username)
        if not allowed:
            return None, "登录失败次数过多，请5分钟后再试"
        
        if not username or not password:
            RateLimiter.record_failure(username)
            return None, "用户名或密码不能为空"
        
        user = self.get_user_by_username(username)
        if not user:
            RateLimiter.record_failure(username)
            return None, "用户名或密码错误"
        
        if not self._hash_password(password) == user.password_hash:
            RateLimiter.record_failure(username)
            return None, "用户名或密码错误"
        
        # Success - clear rate limit
        RateLimiter.record_success(username)
        
        # Update last login
        self.update_last_login(user.id)
        
        # Create session
        session = self.create_session(user.id)
        return session, ""
    
    def logout(self, token: str) -> bool:
        """Logout user by deleting session."""
        return self.delete_session(token)
    
    def get_current_user(self, token: str) -> Optional[User]:
        """Get current user from session token."""
        session = self.get_session_by_token(token)
        if not session:
            return None
        return self.get_user_by_id(session.user_id)
    
    def verify_permission(self, token: str, required: Permission) -> tuple[bool, str]:
        """Verify token has required permission. Returns (has_permission, error)."""
        user = self.get_current_user(token)
        if not user:
            return False, "未登录或登录已过期"
        
        if not self.has_permission(user, required):
            return False, "权限不足"
        
        return True, ""

    def update_email(self, user_id: str, new_email: str) -> tuple[bool, str]:
        """Update user email. Returns (success, error)."""
        if not new_email or not self._validate_email(new_email):
            return False, "邮箱格式不正确"
        if self._email_exists(new_email):
            return False, "该邮箱已被使用"
        conn = sqlite3.connect(DB_PATH)
        try:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET email = ? WHERE id = ?", (new_email, user_id))
            conn.commit()
            return True, ""
        finally:
            conn.close()

    def update_password(self, user_id: str, current_password: str, new_password: str) -> tuple[bool, str]:
        """Update user password. Returns (success, error)."""
        user = self.get_user_by_id(user_id)
        if not user:
            return False, "用户不存在"
        # Verify current password
        if self._hash_password(current_password) != user.password_hash:
            return False, "当前密码错误"
        if len(new_password) < 6:
            return False, "新密码至少6个字符"
        new_hash = self._hash_password(new_password)
        conn = sqlite3.connect(DB_PATH)
        try:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user_id))
            conn.commit()
            return True, ""
        finally:
            conn.close()

    def _validate_email(self, email: str) -> bool:
        """Check email format."""
        import re
        return bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email))

    def _email_exists(self, email: str) -> bool:
        """Check if email is already used by another user."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            return cursor.fetchone() is not None
        finally:
            conn.close()

    def delete_user(self, user_id: str, password: str) -> tuple[bool, str]:
        """Delete user account. Returns (success, error)."""
        user = self.get_user_by_id(user_id)
        if not user:
            return False, "用户不存在"
        if self._hash_password(password) != user.password_hash:
            return False, "密码错误"
        conn = sqlite3.connect(DB_PATH)
        try:
            cursor = conn.cursor()
            # Delete sessions first
            cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
            # Delete user
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
            return True, ""
        finally:
            conn.close()


# Global auth service instance
auth_service = AuthService()
