import type { VideoInfo, DownloadResponse, StatusResponse } from '../types';

const API_BASE = 'http://localhost:8000/api';

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
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
  return handleResponse<VideoInfo[]>(response);
}

export async function startDownload(urls: string[], format?: string): Promise<DownloadResponse> {
  const response = await fetch(`${API_BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, format }),
  });
  return handleResponse<DownloadResponse>(response);
}

export async function getTaskStatus(taskId: string): Promise<StatusResponse> {
  const response = await fetch(`${API_BASE}/status/${taskId}`);
  return handleResponse<StatusResponse>(response);
}

export function getDownloadUrl(taskId: string, filename: string): string {
  return `${API_BASE}/download/${taskId}/${filename}`;
}

export { ApiError };
