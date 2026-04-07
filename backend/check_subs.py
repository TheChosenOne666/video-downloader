import sqlite3
conn = sqlite3.connect('D:/AI-Generated-Files/video-downloader/backend/data/video_downloader.db')
cursor = conn.cursor()

# 检查 user_subscriptions 表
cursor.execute('SELECT * FROM user_subscriptions LIMIT 10')
rows = cursor.fetchall()
print('user_subscriptions rows:', len(rows))
for row in rows:
    print(row)

# 检查 users 表中的 VIP 用户
cursor.execute("SELECT id, username, role FROM users WHERE role='vip'")
rows = cursor.fetchall()
print('\nVIP users:', rows)

conn.close()
