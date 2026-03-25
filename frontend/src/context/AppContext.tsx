import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { PageType, VideoInfo, DownloadTask } from '../types';
import { getVideoInfo, startDownload, getTaskStatus, subscribeToProgress } from '../services/api';

interface AppState {
  page: PageType;
  urls: string[];
  videoInfos: VideoInfo[];
  selectedFormat: string;
  taskId: string | null;
  tasks: DownloadTask[];
  completedFiles: { filename: string; title?: string }[];
  error: string | null;
  loading: boolean;
  checkingUrls: boolean;
}

interface AppContextType extends AppState {
  setPage: (page: PageType) => void;
  setUrls: (urls: string[]) => void;
  setSelectedFormat: (format: string) => void;
  checkUrls: () => Promise<void>;
  startDownloading: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  reset: () => void;
}

const initialState: AppState = {
  page: 'home',
  urls: [],
  videoInfos: [],
  selectedFormat: 'best',
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
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // 清理 WebSocket 订阅
  useEffect(() => {
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [unsubscribe]);

  const setPage = useCallback((page: PageType) => {
    setState(prev => ({ ...prev, page, error: null }));
  }, []);

  const setUrls = useCallback((urls: string[]) => {
    setState(prev => ({ ...prev, urls, videoInfos: [] }));
  }, []);

  const setSelectedFormat = useCallback((format: string) => {
    setState(prev => ({ ...prev, selectedFormat: format }));
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

    // 清理之前的订阅
    if (unsubscribe) {
      unsubscribe();
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      tasks: state.urls.map(url => ({
        taskId: '',
        url,
        status: 'pending' as const,
        progress: 0,
      })),
      page: 'progress',
    }));

    try {
      const response = await startDownload(state.urls, state.selectedFormat);
      
      // 订阅 WebSocket 进度更新
      const unsubscribeFn = subscribeToProgress(response.taskId, (data) => {
        if (data.type === 'progress') {
          // 更新单个任务进度
          setState(prev => {
            const newTasks = [...prev.tasks];
            if (data.index < newTasks.length) {
              newTasks[data.index] = {
                ...newTasks[data.index],
                ...data.status,
              };
            }
            return { ...prev, tasks: newTasks };
          });
        } else if (data.type === 'completed') {
          // 任务完成
          setState(prev => ({
            ...prev,
            page: 'complete',
            completedFiles: prev.tasks
              .filter(t => t.status === 'completed' && t.filename)
              .map(t => ({ filename: t.filename!, title: t.title })),
          }));
        }
      });

      setUnsubscribe(() => unsubscribeFn);
      
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
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Failed to start download',
        loading: false,
      }));
    }
  }, [state.urls, state.selectedFormat, state.videoInfos, unsubscribe]);

  const fetchStatus = useCallback(async () => {
    if (!state.taskId) return;

    try {
      const status = await getTaskStatus(state.taskId);
      
      // 提取完成文件的列表
      const completedFiles = status.videos
        .filter(v => v.status === 'completed' && v.filename)
        .map(v => ({ filename: v.filename!, title: v.title }));

      setState(prev => ({
        ...prev,
        tasks: state.urls.map((url, i) => {
          const video = status.videos[i];
          return {
            taskId: state.taskId!,
            url,
            title: video?.title || prev.tasks[i]?.title || '',
            status: (video?.status || 'pending') as DownloadTask['status'],
            progress: video?.progress || 0,
            speed: video?.speed,
            eta: video?.eta,
            error: video?.error,
          };
        }),
        completedFiles,
        page: status.status === 'completed' || status.completed >= state.urls.length ? 'complete' : prev.page,
      }));
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  }, [state.taskId, state.urls]);

  const reset = useCallback(() => {
    // 清除订阅
    if (unsubscribe) {
      unsubscribe();
      setUnsubscribe(null);
    }
    setState(initialState);
  }, [unsubscribe]);

  return (
    <AppContext.Provider value={{
      ...state,
      setPage,
      setUrls,
      setSelectedFormat,
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
