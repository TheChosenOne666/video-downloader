export async function getVideoInfo(urls: string[]): Promise<VideoInfo[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
  
  try {
    const response = await fetch(`${API_BASE}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await handleResponse<{ infos: VideoInfo[] }>(response);
    console.log('[API] getVideoInfo response:', data.infos);
    return data.infos;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[API] getVideoInfo error:', err);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('请求超时（60秒），请检查网络或稍后重试');
    }
    throw err;
  }
}