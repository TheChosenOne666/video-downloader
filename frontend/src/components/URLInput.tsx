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
      <div className="relative">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="粘贴视频链接... (每行一个，支持批量)
例如：
https://www.youtube.com/watch?v=xxx
https://www.bilibili.com/video/xxx"
          className="input-glow min-h-[160px] resize-none font-mono text-sm"
          disabled={checkingUrls}
        />
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
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>已添加 {urls.length} 个链接</span>
            <button
              onClick={() => setUrls([])}
              className="text-xs transition-colors hover:opacity-70"
              style={{ color: 'var(--color-error)' }}
            >
              清除全部
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {urls.map((url, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg group"
                style={{ backgroundColor: 'var(--color-surface-light)' }}
              >
                <span className="text-xs w-6" style={{ color: 'var(--color-primary)' }}>{index + 1}.</span>
                <span className="flex-1 text-sm truncate font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  {url}
                </span>
                <button
                  onClick={() => handleRemoveUrl(url)}
                  className="opacity-0 group-hover:opacity-100 p-1 transition-all"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-error)' }}>
          {error}
        </div>
      )}
    </div>
  );
}
