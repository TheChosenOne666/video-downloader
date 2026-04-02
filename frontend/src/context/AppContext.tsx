import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PageType, VideoInfo, DownloadTask } from '../types';
import { getVideoInfo, startDownload, getDownloadUrl } from '../services/api';

interface UserInfo {
  username: string;
  email: string;
  role: string;
}

interface AppState {
  page: PageType;
  inputValue: string;
  urls: string[];
  videoUrl: string | null;
  videoInfos: VideoInfo[];
  selectedFormat: string;
  downloadMode: 'original' | 'subtitled';
  taskId: string | null;
  tasks: DownloadTask[];
  completedFiles: { filename: string; title?: string }[];
  error: string | null;
  loading: boolean;
  checkingUrls: boolean;
  isLoggedIn: boolean;
  userInfo: UserInfo | null;
}

interface AppContextType extends AppState {
  setPage: (page: PageType) => void;
  goToSummarize: () => void;
  setUrls: (urls: string[]) => void;
  setInputValue: (value: string) => void;
  setVideoUrl: (url: string | null) => void;
  setSelectedFormat: (format: string) => void;
  setDownloadMode: (mode: 'original' | 'subtitled') => void;
  checkUrls: () => Promise<void>;
  startDownloading: () => Promise<void>;
  updateTasks: (tasks: DownloadTask[], completedFiles: { filename: string; title?: string }[]) => void;
  downloadFile: (filename: string) => void;
  reset: () => void;
  setUser: (token: string, userInfo: UserInfo) => void;
  logout: () => void;
}

const initialState: AppState = {
  page: 'home',
  inputValue: '',
  urls: [],
  videoUrl: null,
  videoInfos: [],
  selectedFormat: 'best',
  downloadMode: 'original',
  taskId: null,
  tasks: [],
  completedFiles: [],
  error: null,
  loading: false,
  checkingUrls: false,
  isLoggedIn: false,
  userInfo: null,
};

const routeMap: Record<PageType, string> = {
  home: '/',
  progress: '/progress',
  complete: '/complete',
  summarize: '/summarize',
  subtitle: '/subtitle',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const [state, setState] = useState<AppState>(initialState);

  // Check auth status on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userInfoStr = localStorage.getItem('user_info');
    if (token && userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr);
        setState(prev => ({ ...prev, isLoggedIn: true, userInfo }));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
      }
    }
  }, []);

  const setUser = useCallback((token: string, userInfo: UserInfo) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_info', JSON.stringify(userInfo));
    setState(prev => ({ ...prev, isLoggedIn: true, userInfo }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    setState(prev => ({ ...prev, isLoggedIn: false, userInfo: null }));
  }, []);
  // 用 ref 存最新值，避免闭包陷阱
  const stateRef = useRef(state);
  stateRef.current = state;

  const setPage = useCallback((page: PageType) => {
    navigateRef.current(routeMap[page]);
    setState(prev => ({ ...prev, page, error: null }));
  }, []);

  const goToSummarize = useCallback(() => {
    // 只更新状态，导航由调用方处理
    setState(prev => {
      const videoUrl = prev.urls[0] || null;
      return { ...prev, page: 'summarize', videoUrl, error: null };
    });
  }, []);

  const setUrls = useCallback((urls: string[]) => {
    setState(prev => ({ ...prev, urls, videoInfos: [] }));
  }, []);

  const setInputValue = useCallback((value: string) => {
    setState(prev => ({ ...prev, inputValue: value }));
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

  /**
   * checkUrls: 从 stateRef 读取 urls（用户已添加的链接）。
   */
  const checkUrls = useCallback(async () => {
    const current = stateRef.current;
    const urlsToCheck = current.urls;

    if (urlsToCheck.length === 0) {
      setState(prev => ({ ...prev, error: '请先添加视频链接' }));
      return;
    }

    // 开始检查
    setState(prev => ({ ...prev, checkingUrls: true, error: null, videoInfos: [] }));

    try {
      const infos = await getVideoInfo(urlsToCheck);
      setState(prev => ({ ...prev, videoInfos: infos, checkingUrls: false }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : '无法解析视频链接',
        checkingUrls: false,
      }));
    }
  }, []); // 无依赖，全从 ref 读取

  /**
   * startDownloading: 从 ref 读取最新 state，避免闭包过期。
   * 调用下载 API，不负责导航（导航由调用方处理）。
   */
  const startDownloading = useCallback(async () => {
    const current = stateRef.current;

    if (current.urls.length === 0) {
      setState(prev => ({ ...prev, error: '没有可下载的视频链接' }));
      return;
    }

    // 更新状态（导航由调用方处理）
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      page: 'progress',
      tasks: [],
      completedFiles: [],
    }));

    try {
      // format 映射: 'best' 传 null 让后端自动选择，其他直接传
      const formatParam = current.selectedFormat === 'best' ? null : current.selectedFormat;
      const isAudioOnly = current.selectedFormat === 'audio';

      const response = await startDownload(
        current.urls,
        formatParam || undefined,
        current.downloadMode === 'subtitled',
        isAudioOnly,
      );

      setState(prev => ({
        ...prev,
        taskId: response.taskId,
        loading: false,
      }));

      console.log('[AppContext] Download task created:', response.taskId);
    } catch (err) {
      console.error('[AppContext] Download error:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : '下载启动失败',
        loading: false,
        page: 'home',
      }));
      navigateRef.current('/');
    }
  }, []); // 无依赖！全从 ref 读取

  const updateTasks = useCallback((tasks: DownloadTask[], completedFiles: { filename: string; title?: string }[]) => {
    setState(prev => ({ ...prev, tasks, completedFiles }));
  }, []);

  const downloadFile = useCallback((filename: string) => {
    const taskId = stateRef.current.taskId;
    if (!taskId) return;
    const url = getDownloadUrl(taskId, filename);
    console.log('[AppContext] Downloading file:', url);
    window.open(url, '_blank');
  }, []);

  const reset = useCallback(() => {
    navigateRef.current('/');
    setState(initialState);
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      setPage,
      goToSummarize,
      setUrls,
      setInputValue,
      setVideoUrl,
      setSelectedFormat,
      setDownloadMode,
      checkUrls,
      startDownloading,
      updateTasks,
      downloadFile,
      reset,
      setUser,
      logout,
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
