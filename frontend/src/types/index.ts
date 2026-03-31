export interface VideoInfo {
  title: string;
  duration?: number;
  thumbnail?: string;
  uploader?: string;
  view_count?: number;
  description?: string;
  formats?: FormatInfo[];
}

export interface FormatInfo {
  format_id: string;
  ext: string;
  resolution?: string;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesize_approx?: number;
}

export interface DownloadTask {
  taskId: string;
  url: string;
  title?: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  speed?: string;
  eta?: string;
  filename?: string;
  error?: string;
}

export interface DownloadResponse {
  taskId: string;
  videos: VideoInfo[];
  message: string;
}

export interface StatusResponse {
  taskId: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  total: number;
  completed: number;
  failed: number;
  videos: VideoStatus[];
  error?: string;
}

export interface VideoStatus {
  url: string;
  title?: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  speed?: string;
  eta?: string;
  filename?: string;
  error?: string;
}

export type PageType = 'home' | 'progress' | 'complete' | 'summarize' | 'subtitle';

// Download options
export type DownloadMode = 'original' | 'subtitled';
