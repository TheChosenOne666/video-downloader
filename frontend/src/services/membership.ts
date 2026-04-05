// Membership and Payment API

import { API_BASE, handleResponse } from './api';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export { API_BASE, handleResponse };

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  price_yuan: number;
  duration_days: number | null;
  duration_text: string;
  daily_download_limit: number;
  features: string[];
  is_active: boolean;
}

export interface Order {
  id: string;
  plan_id: string;
  amount_cents: number;
  amount_yuan: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  pay_method: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Subscription {
  plan_id: string;
  plan_name: string;
  expires_at: string | null;
  is_active: boolean;
  is_lifetime: boolean;
}

export interface DownloadLimit {
  can_download: boolean;
  message: string;
  daily_used: number;
  daily_limit: number;
  is_vip: boolean;
}

// Get all membership plans
export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  const response = await fetch(`${API_BASE}/membership/plans`);
  return handleResponse<MembershipPlan[]>(response);
}

// Get a single membership plan by ID
export async function getMembershipPlan(planId: string): Promise<MembershipPlan | null> {
  const plans = await getMembershipPlans();
  return plans.find(p => p.id === planId) || null;
}

// Create a new order
export async function createOrder(planId: string, idempotencyKey?: string): Promise<Order> {
  const response = await fetch(`${API_BASE}/membership/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      plan_id: planId,
      idempotency_key: idempotencyKey,
    }),
  });
  return handleResponse<Order>(response);
}

// Get order details
export async function getOrder(orderId: string): Promise<Order> {
  const response = await fetch(`${API_BASE}/membership/orders/${orderId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<Order>(response);
}

// Mock pay an order (for testing)
export async function mockPayOrder(orderId: string, payMethod: 'wechat' | 'alipay' = 'wechat'): Promise<Order> {
  const response = await fetch(`${API_BASE}/membership/orders/${orderId}/mock-pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ pay_method: payMethod }),
  });
  return handleResponse<Order>(response);
}

// Get current user's subscription
export async function getMySubscription(): Promise<Subscription> {
  const response = await fetch(`${API_BASE}/membership/subscription`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<Subscription>(response);
}

// Get user's order history
export async function getMyOrders(limit: number = 10): Promise<Order[]> {
  const response = await fetch(`${API_BASE}/membership/orders?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<Order[]>(response);
}

// Check download limit
export async function checkDownloadLimit(): Promise<DownloadLimit> {
  const response = await fetch(`${API_BASE}/membership/download-limit`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<DownloadLimit>(response);
}
