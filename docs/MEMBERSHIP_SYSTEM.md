# 会员系统技术文档

**版本**: v1.0  
**最后更新**: 2026-04-05

---

## 概述

VideoGrab 会员系统提供用户订阅管理、套餐购买、模拟支付等功能。支持多种会员套餐，实现完整的支付流程。

---

## 数据库设计

### membership_plans 表（会员套餐）

```sql
CREATE TABLE membership_plans (
    id TEXT PRIMARY KEY,           -- UUID
    name TEXT NOT NULL,            -- 套餐名称
    description TEXT,              -- 套餐描述
    price REAL NOT NULL,           -- 价格
    duration_days INTEGER,         -- 有效期（天），NULL 表示永久
    features TEXT,                 -- 特权列表（JSON 数组）
    is_active INTEGER DEFAULT 1,   -- 是否启用
    created_at TEXT,               -- 创建时间
    updated_at TEXT                -- 更新时间
);
```

### user_subscriptions 表（用户订阅）

```sql
CREATE TABLE user_subscriptions (
    id TEXT PRIMARY KEY,           -- UUID
    user_id TEXT NOT NULL,         -- 用户 ID
    plan_id TEXT NOT NULL,         -- 套餐 ID
    status TEXT NOT NULL,          -- 状态：active/expired/cancelled
    started_at TEXT NOT NULL,      -- 开始时间
    expires_at TEXT,               -- 过期时间（NULL 表示永久）
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES membership_plans(id)
);
```

### orders 表（订单）

```sql
CREATE TABLE orders (
    id TEXT PRIMARY KEY,           -- UUID
    user_id TEXT NOT NULL,         -- 用户 ID
    plan_id TEXT NOT NULL,         -- 套餐 ID
    amount REAL NOT NULL,          -- 金额
    status TEXT NOT NULL,          -- 状态：pending/paid/cancelled/refunded
    pay_method TEXT,               -- 支付方式：wechat/alipay
    created_at TEXT,
    paid_at TEXT,                  -- 支付时间
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES membership_plans(id)
);
```

---

## API 接口

### 获取所有套餐

```
GET /api/membership/plans
```

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "plans": [
      {
        "id": "plan_monthly",
        "name": "月度VIP",
        "price": 19.9,
        "duration_days": 30,
        "features": ["高清下载", "AI总结"]
      }
    ]
  }
}
```

### 获取当前订阅

```
GET /api/membership/subscription
Authorization: Bearer <token>
```

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "subscription": {
      "id": "sub_xxx",
      "plan_name": "年度VIP",
      "status": "active",
      "expires_at": "2027-04-05T00:00:00Z"
    }
  }
}
```

### 创建订单

```
POST /api/membership/orders
Authorization: Bearer <token>

{
  "plan_id": "plan_yearly"
}
```

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "order": {
      "id": "order_xxx",
      "amount": 99.9,
      "status": "pending"
    }
  }
}
```

### 模拟支付

```
POST /api/membership/orders/{order_id}/mock-pay
Authorization: Bearer <token>

{
  "pay_method": "wechat"
}
```

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "order": {
      "id": "order_xxx",
      "status": "paid",
      "pay_method": "wechat",
      "paid_at": "2026-04-05T12:00:00Z"
    }
  }
}
```

---

## 前端实现

### 页面结构

```
/pricing     → PricingPage.tsx    # 套餐选择
/payment     → PaymentPage.tsx    # 支付确认
/profile     → ProfilePage.tsx    # 个人中心（会员状态）
```

### 状态管理

会员状态存储在 `AppContext` 中：

```typescript
interface UserInfo {
  username: string;
  email: string;
  role: 'user' | 'vip' | 'admin';
}
```

### 支付流程

1. 用户在 PricingPage 选择套餐
2. 点击「立即购买」跳转 `/payment?planId=xxx`
3. PaymentPage 加载套餐详情，显示订单确认
4. 用户选择支付方式（微信/支付宝）
5. 点击「确认支付」调用 `createOrder` + `mockPayOrder`
6. 支付成功跳转 `/profile`

---

## 后端实现

### 服务层

```python
# membership_service.py

class MembershipService:
    async def get_all_plans(self) -> List[Plan]
    async def get_user_subscription(self, user_id: str) -> Optional[Subscription]
    async def create_order(self, user_id: str, plan_id: str) -> Order
    async def mock_pay_order(self, order_id: str, pay_method: str) -> Order
```

### 支付逻辑

```python
async def mock_pay_order(self, order_id: str, pay_method: str) -> Order:
    # 1. 验证订单状态
    # 2. 更新订单状态为 paid
    # 3. 创建或更新用户订阅
    # 4. 返回更新后的订单
```

---

## 权限控制

### 角色定义

| 角色 | 说明 |
|------|------|
| user | 普通用户，基础功能 |
| vip | VIP 用户，解锁全部功能 |
| admin | 管理员，全部权限 |

### 权限检查

```python
async def get_current_user(token: str = Depends(oauth2_scheme)):
    user = await auth_service.get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user
```

---

## 支付图标

使用 `simple-icons` 库提供的官方品牌图标：

```typescript
// 微信支付图标
<svg viewBox="0 0 24 24">
  <path fill="#07C160" d="M8.691 2.188C3.891..." />
</svg>

// 支付宝图标
<svg viewBox="0 0 24 24">
  <path fill="#1677FF" d="M19.695 15.07c3.426..." />
</svg>
```

---

## 测试

### 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| xiaolou | 123456 | admin |
| test | test123 | user |

### 测试流程

1. 登录测试账号
2. 访问 `/pricing` 页面
3. 选择套餐，点击购买
4. 在 `/payment` 页面完成模拟支付
5. 检查 `/profile` 页面会员状态

---

## 后续开发

### 接入真实支付

1. 申请微信支付/支付宝商户号
2. 配置支付回调 URL
3. 实现支付签名验证
4. 处理支付结果通知

### 会员权益细化

1. 定义权益项（下载次数、画质限制等）
2. 在下载/总结等功能中检查权益
3. 实现权益消耗逻辑

---

**文档维护**: 小楼的龙虾 🦞
