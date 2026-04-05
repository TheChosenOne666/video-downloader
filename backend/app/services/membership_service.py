"""Membership and payment service for VIP subscriptions."""

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

import aiosqlite

from app.database.connection import get_connection, close_connection, DB_PATH

logger = logging.getLogger(__name__)


@dataclass
class MembershipPlan:
    """Membership plan data class."""
    id: str
    name: str
    description: str
    price_cents: int
    duration_days: Optional[int]
    daily_download_limit: int
    features: List[str]
    is_active: bool
    sort_order: int


@dataclass
class Order:
    """Order data class."""
    id: str
    user_id: str
    plan_id: str
    amount_cents: int
    status: str  # pending/paid/failed/cancelled
    pay_method: Optional[str]
    idempotency_key: Optional[str]
    paid_at: Optional[str]
    created_at: str


@dataclass
class UserSubscription:
    """User subscription data class."""
    id: str
    user_id: str
    order_id: str
    plan_id: str
    expires_at: Optional[str]
    is_active: bool


class MembershipService:
    """Service for managing memberships, orders, and subscriptions."""
    
    # Default membership plans
    DEFAULT_PLANS = [
        {
            "id": "free",
            "name": "免费版",
            "description": "基础功能，每日限量下载",
            "price_cents": 0,
            "duration_days": None,
            "daily_download_limit": 3,
            "features": ["每日3次下载", "基础视频解析", "480P下载"],
            "sort_order": 0,
        },
        {
            "id": "monthly",
            "name": "月度VIP",
            "description": "无限下载，AI总结功能",
            "price_cents": 2900,  # 29元
            "duration_days": 30,
            "daily_download_limit": -1,  # -1 means unlimited
            "features": ["无限次下载", "AI视频总结", "1080P高清", "优先处理", "字幕生成"],
            "sort_order": 1,
        },
        {
            "id": "yearly",
            "name": "年度VIP",
            "description": "年度会员，超值优惠",
            "price_cents": 19900,  # 199元
            "duration_days": 365,
            "daily_download_limit": -1,
            "features": ["无限次下载", "AI视频总结", "4K超清", "优先处理", "字幕生成", "专属客服"],
            "sort_order": 2,
        },
        {
            "id": "lifetime",
            "name": "终身VIP",
            "description": "一次购买，终身使用",
            "price_cents": 49900,  # 499元
            "duration_days": None,  # None means lifetime
            "daily_download_limit": -1,
            "features": ["永久无限下载", "全部AI功能", "4K超清", "最高优先级", "全部功能", "终身更新"],
            "sort_order": 3,
        },
    ]
    
    async def init_default_plans(self) -> None:
        """Initialize default membership plans if not exists."""
        conn = await get_connection()
        try:
            for plan in self.DEFAULT_PLANS:
                # Check if plan exists
                cursor = await conn.execute(
                    "SELECT id FROM membership_plans WHERE id = ?",
                    (plan["id"],)
                )
                existing = await cursor.fetchone()
                
                if not existing:
                    await conn.execute(
                        """
                        INSERT INTO membership_plans 
                        (id, name, description, price_cents, duration_days, 
                         daily_download_limit, features, is_active, sort_order, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            plan["id"],
                            plan["name"],
                            plan["description"],
                            plan["price_cents"],
                            plan["duration_days"],
                            plan["daily_download_limit"],
                            str(plan["features"]),
                            1,
                            plan["sort_order"],
                            datetime.now(timezone.utc).isoformat(),
                        )
                    )
                    logger.info(f"Created default plan: {plan['id']}")
            
            await conn.commit()
        finally:
            await close_connection(conn)
    
    async def get_all_plans(self, include_inactive: bool = False) -> List[MembershipPlan]:
        """Get all membership plans."""
        conn = await get_connection()
        try:
            if include_inactive:
                cursor = await conn.execute(
                    "SELECT * FROM membership_plans ORDER BY sort_order"
                )
            else:
                cursor = await conn.execute(
                    "SELECT * FROM membership_plans WHERE is_active = 1 ORDER BY sort_order"
                )
            
            rows = await cursor.fetchall()
            plans = []
            for row in rows:
                features = eval(row["features"]) if row["features"] else []
                plans.append(MembershipPlan(
                    id=row["id"],
                    name=row["name"],
                    description=row["description"] or "",
                    price_cents=row["price_cents"],
                    duration_days=row["duration_days"],
                    daily_download_limit=row["daily_download_limit"],
                    features=features,
                    is_active=bool(row["is_active"]),
                    sort_order=row["sort_order"],
                ))
            return plans
        finally:
            await close_connection(conn)
    
    async def get_plan_by_id(self, plan_id: str) -> Optional[MembershipPlan]:
        """Get a plan by ID."""
        conn = await get_connection()
        try:
            cursor = await conn.execute(
                "SELECT * FROM membership_plans WHERE id = ?",
                (plan_id,)
            )
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            features = eval(row["features"]) if row["features"] else []
            return MembershipPlan(
                id=row["id"],
                name=row["name"],
                description=row["description"] or "",
                price_cents=row["price_cents"],
                duration_days=row["duration_days"],
                daily_download_limit=row["daily_download_limit"],
                features=features,
                is_active=bool(row["is_active"]),
                sort_order=row["sort_order"],
            )
        finally:
            await close_connection(conn)
    
    async def create_order(
        self, 
        user_id: str, 
        plan_id: str,
        idempotency_key: Optional[str] = None
    ) -> Order:
        """Create a new order."""
        # Get plan details
        plan = await self.get_plan_by_id(plan_id)
        if not plan:
            raise ValueError(f"Plan not found: {plan_id}")
        
        # Generate idempotency key if not provided
        if not idempotency_key:
            idempotency_key = str(uuid.uuid4())
        
        # Check for existing order with same idempotency key
        conn = await get_connection()
        try:
            cursor = await conn.execute(
                "SELECT * FROM orders WHERE idempotency_key = ?",
                (idempotency_key,)
            )
            existing = await cursor.fetchone()
            
            if existing:
                # Return existing order
                return Order(
                    id=existing["id"],
                    user_id=existing["user_id"],
                    plan_id=existing["plan_id"],
                    amount_cents=existing["amount_cents"],
                    status=existing["status"],
                    pay_method=existing["pay_method"],
                    idempotency_key=existing["idempotency_key"],
                    paid_at=existing["paid_at"],
                    created_at=existing["created_at"],
                )
            
            # Create new order
            order_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            await conn.execute(
                """
                INSERT INTO orders 
                (id, user_id, plan_id, amount_cents, status, idempotency_key, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (order_id, user_id, plan_id, plan.price_cents, "pending", idempotency_key, now)
            )
            await conn.commit()
            
            return Order(
                id=order_id,
                user_id=user_id,
                plan_id=plan_id,
                amount_cents=plan.price_cents,
                status="pending",
                pay_method=None,
                idempotency_key=idempotency_key,
                paid_at=None,
                created_at=now,
            )
        finally:
            await close_connection(conn)
    
    async def get_order_by_id(self, order_id: str) -> Optional[Order]:
        """Get order by ID."""
        conn = await get_connection()
        try:
            cursor = await conn.execute(
                "SELECT * FROM orders WHERE id = ?",
                (order_id,)
            )
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            return Order(
                id=row["id"],
                user_id=row["user_id"],
                plan_id=row["plan_id"],
                amount_cents=row["amount_cents"],
                status=row["status"],
                pay_method=row["pay_method"],
                idempotency_key=row["idempotency_key"],
                paid_at=row["paid_at"],
                created_at=row["created_at"],
            )
        finally:
            await close_connection(conn)
    
    async def mock_pay_order(self, order_id: str, pay_method: str = "wechat") -> Order:
        """
        Mock payment for an order.
        In production, this would verify real payment from WeChat/Alipay.
        pay_method: 'wechat' or 'alipay'
        """
        conn = await get_connection()
        try:
            # Get order
            order = await self.get_order_by_id(order_id)
            if not order:
                raise ValueError(f"Order not found: {order_id}")
            
            if order.status == "paid":
                # Already paid, return existing order (idempotency)
                return order
            
            if order.status != "pending":
                raise ValueError(f"Order cannot be paid, status: {order.status}")
            
            now = datetime.now(timezone.utc)
            now_str = now.isoformat()
            
            # Update order status with pay_method
            await conn.execute(
                """
                UPDATE orders 
                SET status = ?, pay_method = ?, paid_at = ?
                WHERE id = ?
                """,
                ("paid", pay_method, now_str, order_id)
            )
            
            # Get plan details for subscription
            plan = await self.get_plan_by_id(order.plan_id)
            
            # Calculate expiration
            if plan.duration_days:
                expires_at = (now + timedelta(days=plan.duration_days)).isoformat()
            else:
                expires_at = None  # Lifetime
            
            # Create or update subscription
            subscription_id = str(uuid.uuid4())
            
            # Check existing subscription
            cursor = await conn.execute(
                "SELECT * FROM user_subscriptions WHERE user_id = ?",
                (order.user_id,)
            )
            existing = await cursor.fetchone()
            
            if existing:
                # Update existing subscription
                await conn.execute(
                    """
                    UPDATE user_subscriptions
                    SET order_id = ?, plan_id = ?, expires_at = ?, 
                        is_active = 1, updated_at = ?
                    WHERE user_id = ?
                    """,
                    (order_id, order.plan_id, expires_at, now_str, order.user_id)
                )
            else:
                # Create new subscription
                await conn.execute(
                    """
                    INSERT INTO user_subscriptions
                    (id, user_id, order_id, plan_id, expires_at, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (subscription_id, order.user_id, order_id, order.plan_id, 
                     expires_at, 1, now_str, now_str)
                )
            
            # Update user role to vip
            await conn.execute(
                "UPDATE users SET role = ? WHERE id = ?",
                ("vip", order.user_id)
            )
            
            await conn.commit()
            
            logger.info(f"Order {order_id} paid successfully, user {order.user_id} upgraded to VIP")
            
            return Order(
                id=order.id,
                user_id=order.user_id,
                plan_id=order.plan_id,
                amount_cents=order.amount_cents,
                status="paid",
                pay_method="mock",
                idempotency_key=order.idempotency_key,
                paid_at=now_str,
                created_at=order.created_at,
            )
        finally:
            await close_connection(conn)
    
    async def get_user_subscription(self, user_id: str) -> Optional[UserSubscription]:
        """Get user's active subscription."""
        conn = await get_connection()
        try:
            cursor = await conn.execute(
                """
                SELECT * FROM user_subscriptions 
                WHERE user_id = ? AND is_active = 1
                """,
                (user_id,)
            )
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            # Check if expired
            if row["expires_at"]:
                expires = datetime.fromisoformat(row["expires_at"])
                if expires < datetime.now(timezone.utc):
                    # Subscription expired
                    await conn.execute(
                        "UPDATE user_subscriptions SET is_active = 0 WHERE id = ?",
                        (row["id"],)
                    )
                    await conn.execute(
                        "UPDATE users SET role = ? WHERE id = ?",
                        ("user", user_id)
                    )
                    await conn.commit()
                    return None
            
            return UserSubscription(
                id=row["id"],
                user_id=row["user_id"],
                order_id=row["order_id"],
                plan_id=row["plan_id"],
                expires_at=row["expires_at"],
                is_active=bool(row["is_active"]),
            )
        finally:
            await close_connection(conn)
    
    async def get_user_orders(self, user_id: str, limit: int = 10) -> List[Order]:
        """Get user's order history."""
        conn = await get_connection()
        try:
            cursor = await conn.execute(
                """
                SELECT * FROM orders 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
                """,
                (user_id, limit)
            )
            rows = await cursor.fetchall()
            
            orders = []
            for row in rows:
                orders.append(Order(
                    id=row["id"],
                    user_id=row["user_id"],
                    plan_id=row["plan_id"],
                    amount_cents=row["amount_cents"],
                    status=row["status"],
                    pay_method=row["pay_method"],
                    idempotency_key=row["idempotency_key"],
                    paid_at=row["paid_at"],
                    created_at=row["created_at"],
                ))
            return orders
        finally:
            await close_connection(conn)
    
    async def get_daily_download_count(self, user_id: str) -> int:
        """Get user's download count for today."""
        conn = await get_connection()
        try:
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            
            cursor = await conn.execute(
                """
                SELECT download_count FROM user_daily_stats 
                WHERE user_id = ? AND date = ?
                """,
                (user_id, today)
            )
            row = await cursor.fetchone()
            
            return row["download_count"] if row else 0
        finally:
            await close_connection(conn)
    
    async def increment_download_count(self, user_id: str) -> int:
        """Increment user's daily download count. Returns new count."""
        conn = await get_connection()
        try:
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            now = datetime.now(timezone.utc).isoformat()
            
            cursor = await conn.execute(
                """
                INSERT INTO user_daily_stats (user_id, date, download_count, created_at, updated_at)
                VALUES (?, ?, 1, ?, ?)
                ON CONFLICT(user_id, date) DO UPDATE SET
                download_count = download_count + 1,
                updated_at = ?
                RETURNING download_count
                """,
                (user_id, today, now, now, now)
            )
            row = await cursor.fetchone()
            await conn.commit()
            
            return row["download_count"] if row else 1
        finally:
            await close_connection(conn)
    
    async def can_user_download(self, user_id: str) -> tuple[bool, str]:
        """
        Check if user can download.
        Returns (can_download, reason)
        """
        # Get user's subscription
        subscription = await self.get_user_subscription(user_id)
        
        if subscription:
            # VIP user - unlimited downloads
            return True, "VIP用户，无限下载"
        
        # Free user - check daily limit
        plan = await self.get_plan_by_id("free")
        daily_count = await self.get_daily_download_count(user_id)
        
        if daily_count >= plan.daily_download_limit:
            return False, f"今日下载次数已用完（{plan.daily_download_limit}次），请升级VIP"
        
        remaining = plan.daily_download_limit - daily_count
        return True, f"今日剩余下载次数：{remaining}次"


# Global service instance
membership_service = MembershipService()
