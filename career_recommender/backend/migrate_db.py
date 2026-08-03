import sqlite3

def run_migration():
    conn = sqlite3.connect('career_recommender.db')
    cursor = conn.cursor()
    
    queries = [
        "ALTER TABLE profiles ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE profiles ADD COLUMN highest_streak INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE profiles ADD COLUMN last_active_date VARCHAR(50);",
        "ALTER TABLE profiles ADD COLUMN badges JSON NOT NULL DEFAULT '[]';",
        "ALTER TABLE profiles ADD COLUMN weekly_applications INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE profiles ADD COLUMN weekly_mock_interviews INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE profiles ADD COLUMN week_start_date VARCHAR(50);"
    ]
    
    for query in queries:
        try:
            cursor.execute(query)
            print(f"Executed: {query}")
        except sqlite3.OperationalError as e:
            print(f"Failed or already exists: {query} -> {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    run_migration()
