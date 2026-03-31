import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { PageType, VideoInfo, DownloadTask } from '../types';
import { getVideoInfo, startDownload, getTaskStatus } from '../services/api';

interface AppState {
  page: PageType;
  urls: string[];
  videoUrl: string | null;
  videoInfos: VideoInfo[];
  selectedFormat: string;
  downloadMode: 'original' | 'subtitled';  // NEW: 下载模式
  taskId: string | null;
  tasks: DownloadTask[];
  completedFiles: { filename: string; title?: string }[];
  error: string | null;
  loading: boolean;
  checkingUrls: boolean;
}

interface AppContextType extends AppState {
  setPage: (page: PageType) => void;
  goToSummarize: () => void;
  setUrls: (urls: string[]) => void;
  setVideoUrl: (url: string | null) => void;
  setSelectedFormat: (format: string) => void;
  setDownloadMode: (mode: 'original' | 'subtitled') => void;  // NEW
  checkUrls: () => Promise<void>;
  startDownloading: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  reset: () => void;
}

const initialState: AppState = {
  page: 'home',
  urls: [],
  videoUrl: null,
  videoInfos: [],
  selectedFormat: 'best',
  downloadMode: 'original',  // NEW
  taskId: null,
  tasks: [],
  completedFiles: [],
  error: null,
  loading: false,
  checkingUrls: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  const setPage = useCallback((page: PageType) => {
    setState(prev => ({ ...prev, page, error: null }));
  }, []);

  const goToSummarize = useCallback(() => {
    // Use the first URL as the video URL for summarization
    const videoUrl = state.urls[0] || null;
    setState(prev => ({ ...prev, page: 'summarize', videoUrl, error: null }));
  }, [state.urls]);

  const setUrls = useCallback((urls: string[]) => {
    setState(prev => ({ ...prev, urls, videoInfos: [] }));
  }, []);

  const setVideoUrl = useCallback((url: string | null) => {
    setState(prev => ({ ...prev, videoUrl: url }));
  }, []);

  const setSelectedFormat = useCallback((format: string) => {
    setState(prev => ({ ...prev, selectedFormat: format }));
  }, []);

  const setDownloadMode = useCallback((mode: 'original' | 'subtitled') => {
    setState(prev => ({ ...prev, downloadMode: mode }));
  }, []);

  const checkUrls = useCallback(async () => {
    if (state.urls.length === 0) {
      setState(prev => ({ ...prev, error: 'Please enter at least one URL' }));
      return;
    }

    setState(prev => ({ ...prev, checkingUrls: true, error: null }));
    try {
      const infos = await getVideoInfo(state.urls);
      setState(prev => ({ ...prev, videoInfos: infos, checkingUrls: false }));
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Failed to fetch video info',
        checkingUrls: false 
      }));
    }
  }, [state.urls]);

  const startDownloading = useCallback(async () => {
    if (state.urls.length === 0) return;

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      page: 'progress',
    }));

    try {
      const response = await startDownload(state.urls, state.selectedFormat, state.downloadMode === 'subtitled');
      
      setState(prev => ({ 
        ...prev, 
        taskId: response.taskId, 
        loading: false,
        tasks: state.urls.map((url, i) => ({
          taskId: response.taskId,
          url,
          title: state.videoInfos[i]?.title || '',
          status: 'downloading' as const,
          progress: 0,
        })),
      }));

      // 启动轮询 - 使用 response.taskId 和 state.urls.length 避免闭包问题
      const currentTaskId = response.taskId;
      const expectedCount = state.urls.length;
      
      const pollInterval = setInterval(async () => {
        try {
          const status = await getTaskStatus(currentTaskId);
          
          setState(prev => ({
            ...prev,
            tasks: prev.tasks.map((task, i) => {
              const video = status.videos[i];
              if (!video) return task;
              return {
                ...task,
                title: video.title || task.title,
                status: video.status as DownloadTask['status'],
                progress: video.progress || 0,
                filename: video.filename,
                error: video.error,
              };
            }),
          }));

          // 检查完成
          if (status.status === 'completed' || status.status === 'failed' || status.completed >= expectedCount) {
            clearInterval(pollInterval);
            
            setState(prev => ({
              ...prev,
              page: 'complete',
              completedFiles: status.videos
                .filter(v => v.status === 'completed' && v.filename)
                .map(v => ({ filename: v.filename!, title: v.title })),
            }));
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 500);

      (window as any).downloadInterval = pollInterval;
      
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Failed to start download',
        loading: false,
      }));
    }
  }, [state.urls, state.selectedFormat, state.videoInfos]);

  const fetchStatus = useCallback(async () => {
    if (!state.taskId) return;

    try {
      const status = await getTaskStatus(state.taskId);
      
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map((task, i) => {
          const video = status.videos[i];
          if (!video) return task;
          return {
            ...task,
            title: video.title || task.title,
            status: video.status as DownloadTask['status'],
            progress: video.progress || 0,
            filename: video.filename,
            error: video.error,
          };
        }),
        completedFiles: status.videos
          .filter(v => v.status === 'completed' && v.filename)
          .map(v => ({ filename: v.filename!, title: v.title })),
      }));
    } catch (err) {
      console.error('Fetch status error:', err);
    }
  }, [state.taskId]);

  const reset = useCallback(() => {
    if ((window as any).downloadInterval) {
      clearInterval((window as any).downloadInterval);
      delete (window as any).downloadInterval;
    }
    setState(initialState);
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      setPage,
      goToSummarize,
      setUrls,
      setVideoUrl,
      setSelectedFormat,
      setDownloadMode,
      checkUrls,
      startDownloading,
      fetchStatus,
      reset,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
