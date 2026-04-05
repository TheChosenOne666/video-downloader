import type { VideoInfo, StatusResponse } from '../types';

export const API_BASE = 'http://localhost:8000/api';

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '请求失败' }));
    throw new Error(error.detail?.message || error.detail || '请求失败');
  }
  return response.json();
}

export async function getVideoInfo(urls: string[]): Promise<VideoInfo[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
  
  try {
    const response = await fetch(`${API_BASE}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await handleResponse<{ infos: VideoInfo[] }>(response);
    console.log('[API] getVideoInfo response:', data.infos);
    return data.infos;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[API] getVideoInfo error:', err);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('请求超时（60秒），请检查网络或稍后重试');
    }
    throw err;
  }
}

export async function startDownload(urls: string[], options: {
  formatId?: string;
  audioOnly?: boolean;
  withSubtitle?: boolean;
} = {}): Promise<{ task_id: string }> {
  const response = await fetch(`${API_BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, ...options }),
  });
  return handleResponse<{ task_id: string }>(response);
}

export async function getTaskStatus(taskId: string): Promise<StatusResponse> {
  const response = await fetch(`${API_BASE}/status/${taskId}`);
  return handleResponse<StatusResponse>(response);
}

export function getDownloadUrl(taskId: string, filename: string): string {
  return `${API_BASE}/download/${taskId}/${encodeURIComponent(filename)}`;
}

export function getProxiedImageUrl(url: string): string {
  return `${API_BASE}/proxy/image?url=${encodeURIComponent(url)}`;
}

// Auth API
export async function register(username: string, email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  return handleResponse<{ message: string; user_id: string }>(response);
}

export async function login(usernameOrEmail: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: usernameOrEmail, password }),
  });
  return handleResponse<{ token: string; username: string; email: string; role: string; expires_in: number }>(response);
}

export async function getProfile() {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });
  return handleResponse<{ id: string; username: string; email: string; role: string }>(response);
}

export async function updateProfile(data: { username?: string; email?: string }) {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  return handleResponse<{ message: string }>(response);
}
