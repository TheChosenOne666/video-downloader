import sqlite3

conn = sqlite3.connect('D:/AI-Generated-Files/video-downloader/backend/data/video_downloader.db')
cursor = conn.cursor()

# 检查表结构
cursor.execute("PRAGMA table_info(user_daily_stats)")
print("=== user_daily_stats columns ===")
for col in cursor.fetchall():
    print(col)

# 检查所有用户
print("\n=== All users ===")
cursor.execute("SELECT id, username, role FROM users")
for row in cursor.fetchall():
    print(f"id={row[0]}, username={row[1]}, role={row[2]}")

# 检查每日统计
cursor.execute("SELECT * FROM user_daily_stats LIMIT 10")
print("\n=== user_daily_stats data ===")
for row in cursor.fetchall():
    print(row)

conn.close()
