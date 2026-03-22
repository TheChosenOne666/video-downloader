export interface VideoInfo {
  url: string;
  title: string;
  thumbnail?: string;
  duration?: string;
  formats: Format[];
}

export interface Format {
  quality: string;
  format: string;
  fileSize?: string;
}

export interface DownloadTask {
  taskId: string;
  url: string;
  title?: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  speed?: string;
  eta?: string;
  error?: string;
}

export interface DownloadResponse {
  taskId: string;
  videos: VideoInfo[];
  message: string;
}

export interface StatusResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  videos: VideoStatus[];
  totalSize?: string;
  error?: string;
}

export interface VideoStatus {
  url: string;
  title?: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  speed?: string;
  eta?: string;
  filename?: string;
  error?: string;
}

export type PageType = 'home' | 'progress' | 'complete';
