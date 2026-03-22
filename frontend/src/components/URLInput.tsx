import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function URLInput() {
  const { urls, setUrls, checkingUrls, error } = useApp();
  const [inputValue, setInputValue] = useState('');

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
            className="px-4 py-2 bg-surface-lighter text-sm text-gray-300 rounded-lg hover:bg-gold/20 hover:text-gold transition-all disabled:opacity-50"
          >
            添加链接
          </button>
        </div>
      </div>

      {urls.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">已添加 {urls.length} 个链接</span>
            <button
              onClick={() => setUrls([])}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              清除全部
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {urls.map((url, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-2 bg-surface rounded-lg group"
              >
                <span className="text-xs text-gold w-6">{index + 1}.</span>
                <span className="flex-1 text-sm text-gray-300 truncate font-mono">
                  {url}
                </span>
                <button
                  onClick={() => handleRemoveUrl(url)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
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
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
