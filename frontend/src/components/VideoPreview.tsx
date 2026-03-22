import { useApp } from '../context/AppContext';
import { getProxiedImageUrl } from '../services/api';

export default function VideoPreview() {
  const { videoInfos, urls } = useApp();

  if (videoInfos.length === 0) return null;

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        已解析 {videoInfos.length} 个视频
      </h3>
      
      <div className="grid gap-4">
        {videoInfos.map((video, index) => (
          <div key={index} className="glass-card p-4 flex gap-4">
            {/* Thumbnail */}
            <div className="w-32 h-20 bg-surface-lighter rounded-lg overflow-hidden flex-shrink-0">
              {video.thumbnail ? (
                <img
                  src={getProxiedImageUrl(video.thumbnail)}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium truncate" title={video.title}>
                {video.title || '未知标题'}
              </h4>
              <p className="text-sm text-gray-400 mt-1">
                {video.duration ? `时长: ${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : ''}
                {video.uploader ? ` · ${video.uploader}` : ''}
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate font-mono">
                {urls[index]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
