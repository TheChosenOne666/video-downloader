import sqlite3

conn = sqlite3.connect('D:/AI-Generated-Files/video-downloader/backend/data/video_downloader.db')
cursor = conn.cursor()

# Update free plan to 3 downloads
cursor.execute("""
    UPDATE membership_plans 
    SET daily_download_limit = 3, 
        features = '["每日3次下载", "基础视频解析", "480P下载"]'
    WHERE id = 'free'
""")
conn.commit()

# Verify
cursor.execute("SELECT id, name, daily_download_limit FROM membership_plans")
for row in cursor.fetchall():
    print(row)

conn.close()
print("\nDatabase updated successfully!")
