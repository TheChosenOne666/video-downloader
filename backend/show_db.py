"""查看 SQLite 数据库内容的脚本"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "video_downloader.db"


def show_tables():
    """显示所有表"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("=" * 50)
    print(f"数据库: {DB_PATH}")
    print("=" * 50)
    print(f"\n[表列表]")
    for table in tables:
        print(f"  - {table[0]}")
    
    conn.close()
    return tables


def show_table_info(table_name: str):
    """显示表结构和数据"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"\n{'=' * 50}")
    print(f"[表: {table_name}]")
    print("=" * 50)
    
    # 表结构
    cursor.execute(f"PRAGMA table_info({table_name});")
    columns = cursor.fetchall()
    print(f"\n[字段]")
    for col in columns:
        print(f"  {col[1]:20} {col[2]}")
    
    # 数据统计
    cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
    count = cursor.fetchone()[0]
    print(f"\n[数据量] {count} 条")
    
    # 预览数据
    if count > 0:
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 3;")
        rows = cursor.fetchall()
        print(f"\n[预览 (前3条)]")
        for i, row in enumerate(rows):
            # 截断长字段
            row_display = []
            for val in row:
                if isinstance(val, str) and len(val) > 50:
                    val = val[:50] + "..."
                row_display.append(val)
            print(f"  {i+1}. {row_display}")
    
    conn.close()


def show_all_data():
    """显示所有表的数据"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    for table in tables:
        show_table_info(table[0])
    
    conn.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--all":
            show_all_data()
        else:
            show_table_info(sys.argv[1])
    else:
        show_tables()
        print("\n用法:")
        print("  python show_db.py              - 查看所有表")
        print("  python show_db.py <表名>       - 查看指定表")
        print("  python show_db.py --all        - 查看所有表数据")
