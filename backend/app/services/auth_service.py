"""User authentication service."""

import uuid
import hashlib
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "video_downloader.db"


@dataclass
class User:
    """User record."""
    id: str
    username: str
    email: str
    password_hash: str
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


class AuthService:
    """Authentication service using SQLite."""
    
    # Session expiry: 30 days
    SESSION_EXPIRY_DAYS = 30
    
    def _hash_password(self, password: str) -> str:
        """Hash password with salt using SHA256."""
        salt = "video_downloader_salt_2024"
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    
    def _generate_token(self) -> str:
        """Generate a unique session token."""
        return str(uuid.uuid4()) + "-" + str(uuid.uuid4())
    
    def create_user(self, username: str, email: str, password: str) -> Optional[User]:
        """Create a new user."""
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        password_hash = self._hash_password(password)
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id FROM users WHERE username = ? OR email = ?",
                (username, email)
            )
            if cursor.fetchone():
                return None
            
            cursor.execute("""
                INSERT INTO users (id, username, email, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, username, email, password_hash, now))
            conn.commit()
            
            return User(
                id=user_id, username=username, email=email,
                password_hash=password_hash, created_at=now, last_login=None
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
                password_hash=row["password_hash"], created_at=row["created_at"],
                last_login=row["last_login"]
            )
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
                password_hash=row["password_hash"], created_at=row["created_at"],
                last_login=row["last_login"]
            )
        finally:
            conn.close()
    
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
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash."""
        return self._hash_password(password) == password_hash
    
    def login(self, username: str, password: str) -> Optional[Session]:
        """Login user and create session."""
        user = self.get_user_by_username(username)
        if not user:
            return None
        if not self.verify_password(password, user.password_hash):
            return None
        
        # Update last login
        now = datetime.now(timezone.utc).isoformat()
        conn = sqlite3.connect(DB_PATH)
        try:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user.id))
            conn.commit()
        finally:
            conn.close()
        
        return self.create_session(user.id)
    
    def logout(self, token: str) -> bool:
        """Logout user by deleting session."""
        return self.delete_session(token)
    
    def get_current_user(self, token: str) -> Optional[User]:
        """Get current user from session token."""
        session = self.get_session_by_token(token)
        if not session:
            return None
        return self.get_user_by_id(session.user_id)


auth_service = AuthService()
