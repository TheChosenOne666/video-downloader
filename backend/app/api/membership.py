"""Membership and payment API endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field

from app.services.membership_service import membership_service, MembershipPlan, Order
from app.services.auth_service import auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/membership", tags=["membership"])


# ============== Request/Response Models ==============

class PlanResponse(BaseModel):
    id: str
    name: str
    description: str
    price_cents: int
    price_yuan: float
    duration_days: Optional[int]
    duration_text: str
    daily_download_limit: int
    features: list[str]
    is_active: bool


class CreateOrderRequest(BaseModel):
    plan_id: str = Field(..., description="套餐ID")
    idempotency_key: Optional[str] = Field(None, description="幂等性Key，防止重复下单")


class OrderResponse(BaseModel):
    id: str
    plan_id: str
    amount_cents: int
    amount_yuan: float
    status: str
    pay_method: Optional[str]
    paid_at: Optional[str]
    created_at: str


class MockPayRequest(BaseModel):
    order_id: str = Field(..., description="订单ID")


class SubscriptionResponse(BaseModel):
    plan_id: str
    plan_name: str
    expires_at: Optional[str]
    is_active: bool
    is_lifetime: bool


class DownloadLimitResponse(BaseModel):
    can_download: bool
    message: str
    daily_used: int
    daily_limit: int
    is_vip: bool


# ============== Helper Functions ==============

def plan_to_response(plan: MembershipPlan) -> PlanResponse:
    """Convert MembershipPlan to response model."""
    duration_text = "永久" if plan.duration_days is None else f"{plan.duration_days}天"
    return PlanResponse(
        id=plan.id,
        name=plan.name,
        description=plan.description,
        price_cents=plan.price_cents,
        price_yuan=plan.price_cents / 100,
        duration_days=plan.duration_days,
        duration_text=duration_text,
        daily_download_limit=plan.daily_download_limit,
        features=plan.features,
        is_active=plan.is_active,
    )


def order_to_response(order: Order) -> OrderResponse:
    """Convert Order to response model."""
    return OrderResponse(
        id=order.id,
        plan_id=order.plan_id,
        amount_cents=order.amount_cents,
        amount_yuan=order.amount_cents / 100,
        status=order.status,
        pay_method=order.pay_method,
        paid_at=order.paid_at,
        created_at=order.created_at,
    )


async def get_current_user(authorization: Optional[str] = Header(None)):
    """Get current user from authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="缺少认证信息")
    
    # Extract token from "Bearer <token>"
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    else:
        token = authorization
    
    user = auth_service.get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="认证已过期或无效")
    
    return user


# ============== API Endpoints ==============

@router.get("/plans", response_model=list[PlanResponse])
async def get_membership_plans():
    """Get all available membership plans."""
    plans = await membership_service.get_all_plans(include_inactive=False)
    return [plan_to_response(p) for p in plans]


@router.post("/orders", response_model=OrderResponse)
async def create_order(
    request: CreateOrderRequest,
    user = Depends(get_current_user)
):
    """Create a new payment order."""
    try:
        order = await membership_service.create_order(
            user_id=user.id,
            plan_id=request.plan_id,
            idempotency_key=request.idempotency_key
        )
        return order_to_response(order)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Create order failed: {e}")
        raise HTTPException(status_code=500, detail="创建订单失败")


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    user = Depends(get_current_user)
):
    """Get order details."""
    order = await membership_service.get_order_by_id(order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    # Check ownership
    if order.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权查看此订单")
    
    return order_to_response(order)


class MockPayRequest(BaseModel):
    pay_method: str = "wechat"  # wechat or alipay


@router.post("/orders/{order_id}/mock-pay", response_model=OrderResponse)
async def mock_pay_order(
    order_id: str,
    request: MockPayRequest = MockPayRequest(),
    user = Depends(get_current_user)
):
    """
    Mock payment for an order (for testing).
    In production, this would be replaced with real payment callback.
    """
    order = await membership_service.get_order_by_id(order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    # Check ownership
    if order.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权支付此订单")
    
    try:
        paid_order = await membership_service.mock_pay_order(order_id, request.pay_method)
        return order_to_response(paid_order)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Mock pay failed: {e}")
        raise HTTPException(status_code=500, detail="支付处理失败")


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_my_subscription(user = Depends(get_current_user)):
    """Get current user's subscription status."""
    subscription = await membership_service.get_user_subscription(user.id)
    
    if not subscription:
        # Return free plan info
        plan = await membership_service.get_plan_by_id("free")
        return SubscriptionResponse(
            plan_id="free",
            plan_name="免费版",
            expires_at=None,
            is_active=True,
            is_lifetime=False,
        )
    
    plan = await membership_service.get_plan_by_id(subscription.plan_id)
    return SubscriptionResponse(
        plan_id=subscription.plan_id,
        plan_name=plan.name if plan else "未知套餐",
        expires_at=subscription.expires_at,
        is_active=subscription.is_active,
        is_lifetime=subscription.expires_at is None,
    )


@router.get("/orders", response_model=list[OrderResponse])
async def get_my_orders(
    limit: int = 10,
    user = Depends(get_current_user)
):
    """Get current user's order history."""
    orders = await membership_service.get_user_orders(user.id, limit=limit)
    return [order_to_response(o) for o in orders]


@router.get("/download-limit", response_model=DownloadLimitResponse)
async def check_download_limit(user = Depends(get_current_user)):
    """Check user's download limit status."""
    can_download, message = await membership_service.can_user_download(user.id)
    
    # Get subscription to determine limits
    subscription = await membership_service.get_user_subscription(user.id)
    is_vip = subscription is not None
    
    if is_vip:
        daily_used = 0
        daily_limit = -1  # Unlimited
    else:
        daily_used = await membership_service.get_daily_download_count(user.id)
        plan = await membership_service.get_plan_by_id("free")
        daily_limit = plan.daily_download_limit
    
    return DownloadLimitResponse(
        can_download=can_download,
        message=message,
        daily_used=daily_used,
        daily_limit=daily_limit,
        is_vip=is_vip,
    )


@router.post("/init-plans")
async def init_membership_plans(user: dict = Depends(get_current_user)):
    """Initialize default membership plans (admin only)."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    await membership_service.init_default_plans()
    return {"message": "套餐初始化成功"}
