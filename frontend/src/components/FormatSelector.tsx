import { useApp } from '../context/AppContext';

const formats = [
  { id: 'best', label: '最佳质量', desc: '自动选择最高画质', icon: '✨' },
  { id: '1080p', label: '1080P', desc: '全高清画质', icon: '📺' },
  { id: '720p', label: '720P', desc: '高清画质', icon: '🎬' },
  { id: '480p', label: '480P', desc: '标清画质', icon: '📱' },
  { id: 'audio', label: '仅音频', desc: 'MP3/AAC 格式', icon: '🎵' },
];

export default function FormatSelector() {
  const { selectedFormat, setSelectedFormat } = useApp();

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">下载格式</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {formats.map((format) => (
          <button
            key={format.id}
            onClick={() => setSelectedFormat(format.id)}
            className={`
              relative p-4 rounded-xl border-2 transition-all duration-300 text-left
              ${selectedFormat === format.id 
                ? 'border-gold bg-gold/10 shadow-glow' 
                : 'border-surface-lighter bg-surface hover:border-gold/30'}
            `}
          >
            {selectedFormat === format.id && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-night" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <span className="text-xl mb-2 block">{format.icon}</span>
            <span className="block font-medium text-sm text-white">{format.label}</span>
            <span className="block text-xs text-gray-500 mt-1">{format.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
