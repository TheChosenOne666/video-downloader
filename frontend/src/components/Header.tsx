import { useApp } from '../context/AppContext';

export default function Header() {
  const { page, reset } = useApp();

  return (
    <header className="glass-card px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
          <svg className="w-6 h-6 text-night" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">VideoGrab</h1>
          <p className="text-xs text-gray-500">高速视频下载</p>
        </div>
      </div>

      <nav className="flex items-center gap-2">
        {page !== 'home' && (
          <button
            onClick={reset}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建任务
          </button>
        )}
      </nav>
    </header>
  );
}
