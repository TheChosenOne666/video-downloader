import yt_dlp
print('yt-dlp imported successfully')

# Test download with best format (no ffmpeg needed)
ydl_opts = {
    'format': 'best',
    'quiet': True,
    'no_warnings': True,
}

print('Testing format: best (no ffmpeg needed)')
print('This should work without ffmpeg installed')
