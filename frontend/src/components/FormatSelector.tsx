import { useApp } from '../context/AppContext';

const ALL_FORMATS = [
  { id: 'best', label: '最佳质量', desc: '自动选择最高画质', icon: '✨' },
  { id: '1080p', label: '1080P', desc: '全高清画质', icon: '📺' },
  { id: '720p', label: '720P', desc: '高清画质', icon: '🎬' },
  { id: '480p', label: '480P', desc: '标清画质', icon: '📱' },
  { id: 'audio', label: '仅音频', desc: 'MP3/AAC 格式', icon: '🎵' },
];

export default function FormatSelector() {
  const { selectedFormat, setSelectedFormat, downloadMode } = useApp();

  // 带字幕模式不支持音频下载
  const formats = downloadMode === 'subtitled'
    ? ALL_FORMATS.filter(f => f.id !== 'audio')
    : ALL_FORMATS;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>下载格式</label>
      <div className={`grid gap-3 ${formats.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'}`}>
        {formats.map((format) => (
          <button
            key={format.id}
            onClick={() => setSelectedFormat(format.id)}
            className={`
              relative p-4 rounded-xl border-2 transition-all duration-300 text-left
              ${selectedFormat === format.id 
                ? 'border-primary bg-primary/5 shadow-lg' 
                : 'border-transparent hover:border-primary/30'}
            `}
            style={{ 
              backgroundColor: selectedFormat === format.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--color-surface-light)',
              borderColor: selectedFormat === format.id ? 'var(--color-primary)' : 'var(--color-surface-dark)'
            }}
          >
            {selectedFormat === format.id && (
              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <span className="text-xl mb-2 block">{format.icon}</span>
            <span className="block font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{format.label}</span>
            <span className="block text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{format.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
