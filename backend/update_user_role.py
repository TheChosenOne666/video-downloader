import sys
sys.path.insert(0, 'D:/AI-Generated-Files/video-downloader/backend')
import asyncio
from datetime import datetime, timezone
from app.database.connection import get_connection, close_connection

async def update_user():
    conn = await get_connection()
    try:
        # Get user id
        cursor = await conn.execute(
            "SELECT id FROM users WHERE username = ?",
            ("xiaolou",)
        )
        row = await cursor.fetchone()
        if not row:
            print("[WARN] User xiaolou not found")
            return
        
        user_id = row['id']
        
        # Update user role to admin
        cursor = await conn.execute(
            "UPDATE users SET role = ? WHERE id = ?",
            ("admin", user_id)
        )
        
        # Add lifetime VIP subscription
        import uuid
        now = datetime.now(timezone.utc).isoformat()
        subscription_id = str(uuid.uuid4())
        order_id = str(uuid.uuid4())
        
        # First create a mock order
        cursor = await conn.execute(
            """
            INSERT INTO orders (id, user_id, plan_id, amount_cents, status, pay_method, paid_at, idempotency_key, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (order_id, user_id, "lifetime", 49900, "paid", "manual", now, str(uuid.uuid4()), now)
        )
        
        # Then create subscription
        cursor = await conn.execute(
            """
            INSERT INTO user_subscriptions (id, user_id, order_id, plan_id, expires_at, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                order_id = excluded.order_id,
                plan_id = excluded.plan_id,
                expires_at = excluded.expires_at,
                is_active = excluded.is_active,
                updated_at = excluded.updated_at
            """,
            (subscription_id, user_id, order_id, "lifetime", None, 1, now, now)
        )
        
        await conn.commit()
        
        print("[OK] User xiaolou upgraded to admin + lifetime VIP")
        print(f"   User ID: {user_id}")
        
        # Verify
        cursor = await conn.execute(
            "SELECT role FROM users WHERE id = ?",
            (user_id,)
        )
        user_row = await cursor.fetchone()
        
        cursor = await conn.execute(
            "SELECT plan_id, is_active FROM user_subscriptions WHERE user_id = ?",
            (user_id,)
        )
        sub_row = await cursor.fetchone()
        
        print(f"   Role: {user_row['role']}")
        print(f"   Subscription: {sub_row['plan_id']} (active={sub_row['is_active']})")
        
    finally:
        await close_connection(conn)

asyncio.run(update_user())
