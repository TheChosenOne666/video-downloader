import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
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
      setState(prev => ({ 
        ...prev, 
        taskId: response.taskId, 
        loading: false,
        tasks: state.urls.map((url, i) => ({
          taskId: response.taskId,
          url,
          title: response.videos[i]?.title,
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
  }, [state.urls, state.selectedFormat]);

  const fetchStatus = useCallback(async () => {
    if (!state.taskId) return;

    try {
      const status = await getTaskStatus(state.taskId);
      const completedFiles = status.videos
        .filter(v => v.status === 'completed' && v.filename)
        .map(v => ({ filename: v.filename!, title: v.title }));

      setState(prev => ({
        ...prev,
        tasks: state.urls.map((url, i) => ({
          taskId: state.taskId!,
          url,
          title: status.videos[i]?.title,
          status: status.videos[i]?.status || 'pending',
          progress: status.videos[i]?.progress || 0,
          speed: status.videos[i]?.speed,
          eta: status.videos[i]?.eta,
          error: status.videos[i]?.error,
        })),
        completedFiles,
        page: status.status === 'completed' ? 'complete' : prev.page,
      }));
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  }, [state.taskId, state.urls]);

  const reset = useCallback(() => {
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
