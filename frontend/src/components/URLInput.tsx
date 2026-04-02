import { useApp } from '../context/AppContext';

export default function URLInput() {
  const { inputValue, setInputValue, urls, setUrls, checkingUrls, error } = useApp();

  const handleAddUrls = () => {
    const newUrls = inputValue
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !urls.includes(line));

    if (newUrls.length > 0) {
      setUrls([...urls, ...newUrls]);
      setInputValue('');
    }
  };

  const handleRemoveUrl = (url: string) => {
    setUrls(urls.filter(u => u !== url));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddUrls();
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative group">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="粘贴视频链接... (每行一个，支持批量)
例如：
https://www.youtube.com/watch?v=xxx
https://www.bilibili.com/video/xxx"
          className="input-glow min-h-[160px] resize-none font-mono text-sm pr-24"
          disabled={checkingUrls}
        />
        
        {/* 聚焦光效 */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute inset-0 rounded-xl" style={{ boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)' }} />
        </div>
        
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            onClick={handleAddUrls}
            disabled={!inputValue.trim() || checkingUrls}
            className="btn-primary px-4 py-2 text-sm"
          >
            添加链接
          </button>
        </div>
      </div>

      {urls.length > 0 && (
        <div className="glass-card p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              已添加 {urls.length} 个链接
            </span>
            <button
              onClick={() => setUrls([])}
              className="text-xs transition-all hover:scale-105 px-2 py-1 rounded"
              style={{ color: 'var(--color-error)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            >
              清除全部
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {urls.map((url, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg group hover:bg-blue-50/50 transition-colors"
                style={{ backgroundColor: 'var(--color-surface-light)' }}
              >
                <span 
                  className="text-xs w-6 h-6 rounded-full flex items-center justify-center font-medium"
                  style={{ color: '#ffffff', backgroundColor: 'var(--color-primary)' }}
                >
                  {index + 1}
                </span>
                <span className="flex-1 text-sm truncate font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  {url}
                </span>
                <button
                  onClick={() => handleRemoveUrl(url)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-red-100"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <svg className="w-4 h-4 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div 
          className="p-4 rounded-xl text-sm flex items-center gap-3 animate-slide-up"
          style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--color-error)'
          }}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
