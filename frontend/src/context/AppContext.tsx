import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { PageType, VideoInfo, DownloadTask } from '../types';
import { getVideoInfo, startDownload, getTaskStatus } from '../services/api';

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

  // 轮询定时器清理
  useEffect(() => {
    return () => {
      if (window['downloadInterval']) {
        clearInterval(window['downloadInterval']);
      }
    };
  }, []);

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

    // 清理之前的定时器
    if (window['downloadInterval']) {
      clearInterval(window['downloadInterval']);
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
      
      // 启动状态轮询（每 2 秒检查一次）
      const interval = setInterval(() => {
        fetchStatus();
      }, 2000);
      
      window['downloadInterval'] = interval;
      
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
  }, [state.urls, state.selectedFormat, state.videoInfos]);

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
      
      // 如果任务完成，清除定时器
      if (status.status === 'completed' || status.completed >= state.urls.length) {
        clearInterval(window['downloadInterval']);
        delete window['downloadInterval'];
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  }, [state.taskId, state.urls]);

  const reset = useCallback(() => {
    // 清除定时器
    if (window['downloadInterval']) {
      clearInterval(window['downloadInterval']);
      delete window['downloadInterval'];
    }
    setState(initialState);
  }, []);

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
