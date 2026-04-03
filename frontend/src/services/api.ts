import type { VideoInfo, DownloadResponse, StatusResponse } from '../types';

const API_BASE = 'http://localhost:8000/api';
const WS_BASE = 'ws://localhost:8000';

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// WebSocket progress listener
type ProgressListener = (data: any) => void;
const progressListeners = new Map<string, Set<ProgressListener>>();
const wsConnections = new Map<string, WebSocket>();

export function subscribeToProgress(taskId: string, listener: ProgressListener): () => void {
  // Add listener
  if (!progressListeners.has(taskId)) {
    progressListeners.set(taskId, new Set());
  }
  progressListeners.get(taskId)!.add(listener);

  // Connect WebSocket if not already connected
  if (!wsConnections.has(taskId)) {
    connectWebSocket(taskId);
  }

  // Return unsubscribe function
  return () => {
    const listeners = progressListeners.get(taskId);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        progressListeners.delete(taskId);
        disconnectWebSocket(taskId);
      }
    }
  };
}

function connectWebSocket(taskId: string) {
  try {
    const ws = new WebSocket(`${WS_BASE}/ws/${taskId}`);

    ws.onopen = () => {
      console.log(`WebSocket connected for task: ${taskId}`);
      // Send ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const listeners = progressListeners.get(taskId);
        if (listeners) {
          listeners.forEach(listener => listener(data));
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for task ${taskId}:`, error);
    };

    ws.onclose = () => {
      console.log(`WebSocket closed for task: ${taskId}`);
      wsConnections.delete(taskId);
    };

    wsConnections.set(taskId, ws);
  } catch (e) {
    console.error('Failed to connect WebSocket:', e);
  }
}

function disconnectWebSocket(taskId: string) {
  const ws = wsConnections.get(taskId);
  if (ws) {
    ws.close();
    wsConnections.delete(taskId);
  }
}

// Proxy image URL to bypass referer restrictions
export function getProxiedImageUrl(originalUrl: string): string {
  if (!originalUrl) return '';
  // Use backend proxy to load images
  return `${API_BASE}/proxy/image?url=${encodeURIComponent(originalUrl)}`;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || 'Request failed');
  }
  return response.json();
}

export async function getVideoInfo(urls: string[]): Promise<VideoInfo[]> {
  const response = await fetch(`${API_BASE}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });
  const data = await handleResponse<{ infos: VideoInfo[] }>(response);
  return data.infos;
}

export async function startDownload(urls: string[], format?: string, withSubtitle?: boolean, audioOnly?: boolean): Promise<DownloadResponse> {
  const response = await fetch(`${API_BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, format_id: format, with_subtitle: withSubtitle, audio_only: audioOnly }),
  });
  const data = await handleResponse<any>(response);
  
  // 将后端的 task_id 映射为 taskId
  return {
    taskId: data.task_id,
    videos: data.videos || [],
    message: data.message || '',
  };
}

export async function getTaskStatus(taskId: string): Promise<StatusResponse> {
  const response = await fetch(`${API_BASE}/status/${taskId}`);
  const data = await handleResponse<any>(response);
  
  // 将后端的 items 字段映射为 videos
  return {
    ...data,
    videos: data.items || [],
  };
}

export function getDownloadUrl(taskId: string, filename: string): string {
  return `${API_BASE}/download/${taskId}/${filename}`;
}

// ========== Auth API ==========

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
  role: string;
  expires_in: number;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export async function register(username: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  return handleResponse<AuthResponse>(response);
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse<AuthResponse>(response);
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
  });
}

export async function getCurrentUser(token: string): Promise<UserInfo> {
  const response = await fetch(`${API_BASE}/auth/me?token=${encodeURIComponent(token)}`);
  return handleResponse<UserInfo>(response);
}

export async function checkAuth(token: string): Promise<{ authenticated: boolean; username?: string; email?: string }> {
  const response = await fetch(`${API_BASE}/auth/check?token=${encodeURIComponent(token)}`, {
    method: 'POST',
  });
  return handleResponse<{ authenticated: boolean; username?: string; email?: string }>(response);
}

// ========== Profile API ==========

export interface UpdateProfileData {
  email?: string;
  password?: string;
  new_password?: string;
}

export async function updateProfile(token: string, data: UpdateProfileData): Promise<UserInfo> {
  const response = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ token, ...data }),
  });
  return handleResponse<UserInfo>(response);
}

export async function getProfile(token: string): Promise<UserInfo> {
  const response = await fetch(`${API_BASE}/auth/profile?token=${encodeURIComponent(token)}`, {
    method: 'GET',
  });
  return handleResponse<UserInfo>(response);
}

export { ApiError };
